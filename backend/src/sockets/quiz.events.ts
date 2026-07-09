import type { Server, Socket } from "socket.io";
import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { quizzes, questions, media } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  initQuiz,
  getQuizState,
  setCurrentQuestion,
  incrementAnswer,
  pushOpenTextAnswer,
  getQuestionAnswers,
  getOpenTextAnswers,
  deleteQuizState,
  isQuizActive,
  type QuizQuestionData,
} from "../services/redisQuizState.js";
import { getRoomOwner } from "../services/redisState.js";
import { flushQuizResults } from "../services/syncService.js";

export function registerQuizEvents(io: Server, socket: Socket, app: FastifyInstance) {
  socket.on("start_quiz", async ({ roomCode, quizId }: { roomCode: string; quizId: string }) => {
    const admin = socket.data.admin;
    if (!admin || !admin.admin_id) {
      return socket.emit("error", { message: "Admin access required" });
    }

    const owner = await getRoomOwner(roomCode);
    if (!owner || owner !== admin.admin_id) {
      return socket.emit("error", { message: "You do not own this room" });
    }

    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (quiz.length === 0) {
      return socket.emit("error", { message: "Quiz not found" });
    }

    const quizQuestions = await db
      .select({
        id: questions.id,
        type: questions.type,
        content: questions.content,
        options: questions.options,
        correct_answer: questions.correct_answer,
      })
      .from(questions)
      .where(eq(questions.quiz_id, quizId));

    const questionIds = quizQuestions.map((q) => q.id);
    const mediaRecords = questionIds.length > 0
      ? await db
          .select()
          .from(media)
          .where(eq(media.question_id, questionIds[0]))
      : [];

    const questionsWithData: QuizQuestionData[] = quizQuestions.map((q) => {
      const questionMedia = mediaRecords.find((m) => m.question_id === q.id);
      return {
        id: q.id,
        type: q.type as "multiple_choice" | "open_text",
        content: q.content,
        options: q.options as string[] | null,
        correct_answer: q.correct_answer,
        media: questionMedia
          ? { id: questionMedia.id, file_path: questionMedia.file_path, type: questionMedia.type }
          : null,
      };
    });

    await initQuiz(roomCode, quizId, quiz[0].title, questionsWithData);

    const firstQuestion = questionsWithData[0];
    const { correct_answer: _, ...questionForStudents } = firstQuestion;

    io.to(roomCode).emit("quiz_started", {
      quizId,
      title: quiz[0].title,
      question: questionForStudents,
      totalQuestions: questionsWithData.length,
      currentQuestionIndex: 0,
    });
  });

  socket.on("submit_answer", async ({ roomCode, questionId, answer }: { roomCode: string; questionId: string; answer: string }) => {
    if (!isQuizActive(roomCode)) {
      return socket.emit("error", { message: "No active quiz in this room" });
    }

    const state = await getQuizState(roomCode);
    if (!state) return;

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion || currentQuestion.id !== questionId) {
      return socket.emit("error", { message: "This question is not currently active" });
    }

    if (currentQuestion.type === "multiple_choice") {
      await incrementAnswer(roomCode, questionId, answer);
      const results = await getQuestionAnswers(roomCode, questionId);
      socket.to(roomCode).emit("quiz_answer_update", {
        questionId,
        type: "multiple_choice",
        results,
      });
    } else {
      await pushOpenTextAnswer(roomCode, questionId, answer);
      const answers = await getOpenTextAnswers(roomCode, questionId);
      socket.to(roomCode).emit("quiz_answer_update", {
        questionId,
        type: "open_text",
        answers,
      });
    }
  });

  socket.on("next_question", async ({ roomCode }: { roomCode: string }) => {
    const admin = socket.data.admin;
    if (!admin || !admin.admin_id) {
      return socket.emit("error", { message: "Admin access required" });
    }

    const owner = await getRoomOwner(roomCode);
    if (!owner || owner !== admin.admin_id) {
      return socket.emit("error", { message: "You do not own this room" });
    }

    const state = await getQuizState(roomCode);
    if (!state || state.status !== "active") {
      return socket.emit("error", { message: "No active quiz" });
    }

    const nextIndex = state.currentQuestionIndex + 1;

    if (nextIndex >= state.questions.length) {
      io.to(roomCode).emit("quiz_question_changed", {
        finished: true,
        totalQuestions: state.questions.length,
      });
      return;
    }

    await setCurrentQuestion(roomCode, nextIndex);
    const nextQuestion = state.questions[nextIndex];
    const { correct_answer: _, ...questionForStudents } = nextQuestion;

    io.to(roomCode).emit("quiz_question_changed", {
      question: questionForStudents,
      currentQuestionIndex: nextIndex,
      totalQuestions: state.questions.length,
    });
  });

  socket.on("reveal_solution", async ({ roomCode }: { roomCode: string }) => {
    const admin = socket.data.admin;
    if (!admin || !admin.admin_id) {
      return socket.emit("error", { message: "Admin access required" });
    }

    const owner = await getRoomOwner(roomCode);
    if (!owner || owner !== admin.admin_id) {
      return socket.emit("error", { message: "You do not own this room" });
    }

    const state = await getQuizState(roomCode);
    if (!state || state.status !== "active") {
      return socket.emit("error", { message: "No active quiz" });
    }

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) return;

    let results: Record<string, number> | string[] = {};
    if (currentQuestion.type === "multiple_choice") {
      const raw = await getQuestionAnswers(roomCode, currentQuestion.id);
      results = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)]));
    } else {
      results = await getOpenTextAnswers(roomCode, currentQuestion.id);
    }

    io.to(roomCode).emit("quiz_solution_revealed", {
      questionId: currentQuestion.id,
      correctAnswer: currentQuestion.correct_answer,
      type: currentQuestion.type,
      results,
    });
  });

  socket.on("end_quiz", async ({ roomCode }: { roomCode: string }) => {
    const admin = socket.data.admin;
    if (!admin || !admin.admin_id) {
      return socket.emit("error", { message: "Admin access required" });
    }

    const owner = await getRoomOwner(roomCode);
    if (!owner || owner !== admin.admin_id) {
      return socket.emit("error", { message: "You do not own this room" });
    }

    const state = await getQuizState(roomCode);
    if (!state) {
      return socket.emit("error", { message: "No quiz state found" });
    }

    try {
      await flushQuizResults(roomCode, state);
      await deleteQuizState(roomCode);
      io.to(roomCode).emit("quiz_ended", { quizId: state.quizId });
    } catch (err) {
      console.error("Failed to flush quiz results:", err);
      socket.emit("error", { message: "Failed to save quiz results" });
    }
  });
}

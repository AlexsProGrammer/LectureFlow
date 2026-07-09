import { db } from "../db/index.js";
import { quizResults } from "../db/schema.js";
import { getQuestionAnswers, getOpenTextAnswers, type QuizStateData } from "./redisQuizState.js";

export async function flushQuizResults(roomCode: string, state: QuizStateData): Promise<void> {
  const questionsToFlush = state.questions.slice(0, state.currentQuestionIndex + 1);

  for (const question of questionsToFlush) {
    let aggregated_results: Record<string, unknown>;

    if (question.type === "multiple_choice") {
      const raw = await getQuestionAnswers(roomCode, question.id);
      const votes: Record<string, number> = {};
      for (const [key, value] of Object.entries(raw)) {
        votes[key] = Number(value);
      }
      aggregated_results = { votes };
    } else {
      const answers = await getOpenTextAnswers(roomCode, question.id);
      aggregated_results = { openTextAnswers: answers };
    }

    await db.insert(quizResults).values({
      quiz_id: state.quizId,
      room_code: roomCode,
      question_id: question.id,
      aggregated_results,
    });
  }
}

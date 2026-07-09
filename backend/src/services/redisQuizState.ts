import { redis } from "../plugins/redis.js";

export interface QuizQuestionData {
  id: string;
  type: "multiple_choice" | "open_text";
  content: string;
  options: string[] | null;
  correct_answer: string | null;
  media?: { id: string; file_path: string; type: string } | null;
}

export interface QuizStateData {
  quizId: string;
  title: string;
  questions: QuizQuestionData[];
  currentQuestionIndex: number;
  status: "active" | "ended";
  startedAt: string;
}

export async function initQuiz(
  roomCode: string,
  quizId: string,
  title: string,
  questions: QuizQuestionData[]
): Promise<void> {
  const key = `quiz_state:${roomCode}`;
  await redis.hset(key, {
    quizId,
    title,
    questions: JSON.stringify(questions),
    currentQuestionIndex: "0",
    status: "active",
    startedAt: Date.now().toString(),
  });
  await redis.expire(key, 3600);
}

export async function getQuizState(roomCode: string): Promise<QuizStateData | null> {
  const key = `quiz_state:${roomCode}`;
  const raw = await redis.hgetall(key);
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    quizId: raw.quizId,
    title: raw.title,
    questions: JSON.parse(raw.questions),
    currentQuestionIndex: parseInt(raw.currentQuestionIndex, 10),
    status: raw.status as "active" | "ended",
    startedAt: raw.startedAt,
  };
}

export async function setCurrentQuestion(roomCode: string, index: number): Promise<void> {
  await redis.hset(`quiz_state:${roomCode}`, "currentQuestionIndex", String(index));
}

export async function incrementAnswer(
  roomCode: string,
  questionId: string,
  optionId: string
): Promise<number> {
  return redis.hincrby(`quiz_answers:${roomCode}:${questionId}`, optionId, 1);
}

export async function pushOpenTextAnswer(
  roomCode: string,
  questionId: string,
  text: string
): Promise<void> {
  await redis.rpush(`quiz_open_answers:${roomCode}:${questionId}`, text);
}

export async function getQuestionAnswers(
  roomCode: string,
  questionId: string
): Promise<Record<string, string>> {
  return redis.hgetall(`quiz_answers:${roomCode}:${questionId}`);
}

export async function getOpenTextAnswers(
  roomCode: string,
  questionId: string
): Promise<string[]> {
  return redis.lrange(`quiz_open_answers:${roomCode}:${questionId}`, 0, -1);
}

export async function setQuizStatus(
  roomCode: string,
  status: "active" | "ended"
): Promise<void> {
  await redis.hset(`quiz_state:${roomCode}`, "status", status);
}

export async function deleteQuizState(roomCode: string): Promise<void> {
  const stateKeys = await redis.keys(`quiz_state:${roomCode}`);
  const answerKeys = await redis.keys(`quiz_answers:${roomCode}:*`);
  const openTextKeys = await redis.keys(`quiz_open_answers:${roomCode}:*`);

  const allKeys = [...stateKeys, ...answerKeys, ...openTextKeys];
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}

export async function isQuizActive(roomCode: string): Promise<boolean> {
  const state = await getQuizState(roomCode);
  return state !== null && state.status === "active";
}

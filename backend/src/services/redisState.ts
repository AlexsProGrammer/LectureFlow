import { redis } from "../plugins/redis.js";
import { nanoid } from "nanoid";

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  isAnswered: boolean;
  timestamp: number;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  totalVotes: number;
}

export function generateRoomCode(): string {
  return nanoid(6).toLowerCase();
}

export async function createLiveRoom(adminId: string, code: string): Promise<string> {
  await redis.hset(`room:${code}`, {
    adminId,
    status: "active",
    createdAt: Date.now().toString(),
  });
  await redis.expire(`room:${code}`, 86400);
  return code;
}

export async function roomExists(code: string): Promise<boolean> {
  const result = await redis.exists(`room:${code}`);
  return result === 1;
}

export async function getRoomOwner(code: string): Promise<string | null> {
  return redis.hget(`room:${code}`, "adminId");
}

export async function addChatMessage(roomId: string, message: ChatMessage): Promise<void> {
  const key = `chat:${roomId}`;
  await redis.rpush(key, JSON.stringify(message));
  await redis.ltrim(key, -200, -1);
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const key = `chat:${roomId}`;
  const raw = await redis.lrange(key, 0, -1);
  return raw.map((entry) => JSON.parse(entry));
}

export async function removeChatMessage(roomId: string, messageId: string): Promise<boolean> {
  const key = `chat:${roomId}`;
  const messages = await getChatMessages(roomId);
  const filtered = messages.filter((m) => m.id !== messageId);
  if (filtered.length === messages.length) return false;
  await redis.del(key);
  if (filtered.length > 0) {
    await redis.rpush(key, ...filtered.map((m) => JSON.stringify(m)));
  }
  return true;
}

export async function markChatMessageAnswered(roomId: string, messageId: string): Promise<boolean> {
  const key = `chat:${roomId}`;
  const messages = await getChatMessages(roomId);
  const target = messages.find((m) => m.id === messageId);
  if (!target) return false;
  target.isAnswered = true;
  await redis.del(key);
  await redis.rpush(key, ...messages.map((m) => JSON.stringify(m)));
  return true;
}

export async function incrementPollOption(roomId: string, questionId: string, optionId: string): Promise<number> {
  return redis.hincrby(`poll:${roomId}:${questionId}`, optionId, 1);
}

export async function getPollResults(roomId: string, questionId: string): Promise<Record<string, string>> {
  return redis.hgetall(`poll:${roomId}:${questionId}`);
}

export async function createPoll(roomId: string, poll: Poll): Promise<void> {
  await redis.hset(`polls:${roomId}`, poll.id, JSON.stringify(poll));
}

export async function getPolls(roomId: string): Promise<Poll[]> {
  const raw = await redis.hgetall(`polls:${roomId}`);
  return Object.values(raw).map((entry) => JSON.parse(entry));
}

export async function deletePoll(roomId: string, pollId: string): Promise<boolean> {
  const result = await redis.hdel(`polls:${roomId}`, pollId);
  return result === 1;
}

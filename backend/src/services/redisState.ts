import { redis } from "../plugins/redis.js";
import { nanoid } from "nanoid";

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

export async function incrementPollOption(roomId: string, questionId: string, optionId: string): Promise<number> {
  return redis.hincrby(`poll:${roomId}:${questionId}`, optionId, 1);
}

export async function getPollResults(roomId: string, questionId: string): Promise<Record<string, string>> {
  return redis.hgetall(`poll:${roomId}:${questionId}`);
}

export async function addChatMessage(roomId: string, message: object): Promise<void> {
  const key = `chat:${roomId}`;
  await redis.rpush(key, JSON.stringify(message));
  await redis.ltrim(key, -200, -1);
}

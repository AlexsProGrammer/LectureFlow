import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../middlewares/auth.js";
import { generateRoomCode, createLiveRoom, roomExists } from "../services/redisState.js";
import { isQuizActive } from "../services/redisQuizState.js";
import { redis } from "../plugins/redis.js";

interface JwtPayload {
  admin_id: string;
  is_super_admin: boolean;
}

export async function roomsRoutes(fastify: FastifyInstance) {
  fastify.post("/rooms", { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const code = generateRoomCode();
    await createLiveRoom(user.admin_id, code);
    return reply.send({ code });
  });

  fastify.get("/rooms", { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const keys = await redis.keys("room:*");
    const rooms = [];

    for (const key of keys) {
      const code = key.replace("room:", "");
      const data = await redis.hgetall(key);
      if (data && data.adminId) {
        if (!user.is_super_admin && data.adminId !== user.admin_id) continue;
        const hasActiveQuiz = await isQuizActive(code);
        rooms.push({
          code,
          status: data.status,
          createdAt: data.createdAt,
          adminId: data.adminId,
          hasActiveQuiz,
        });
      }
    }

    return reply.send(rooms);
  });
}

import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../middlewares/auth.js";
import { generateRoomCode, createLiveRoom } from "../services/redisState.js";

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
}

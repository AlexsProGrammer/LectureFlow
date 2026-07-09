import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type Redis from "ioredis";
import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { registerRoomEvents } from "./room.events.js";
import { registerQuizEvents } from "./quiz.events.js";

export function initWebSockets(server: any, redisClient: Redis, app: FastifyInstance): Server {
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis pubClient error:", err.message));
  subClient.on("error", (err) => console.error("Redis subClient error:", err.message));

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    const existingSessionId = socket.handshake.auth.sessionId;
    if (existingSessionId) {
      socket.data.sessionId = existingSessionId;
    } else {
      socket.data.sessionId = nanoid();
    }

    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = await app.jwt.verify(token);
        socket.data.admin = decoded;
      } catch {
        socket.data.admin = null;
      }
    } else {
      socket.data.admin = null;
    }

    next();
  });

  io.on("connection", (socket) => {
    socket.emit("session", { sessionId: socket.data.sessionId });
    registerRoomEvents(io, socket, app);
    registerQuizEvents(io, socket, app);
  });

  return io;
}

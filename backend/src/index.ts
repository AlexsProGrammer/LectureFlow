import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { redis } from "./plugins/redis.js";
import { authRoutes } from "./api/auth.routes.js";
import { quizzesRoutes } from "./api/quizzes.routes.js";
import { uploadsRoutes } from "./api/uploads.routes.js";
import { exportRoutes } from "./api/export.routes.js";
import { roomsRoutes } from "./api/rooms.routes.js";
import { setupRoutes } from "./api/setup.routes.js";
import { initWebSockets } from "./sockets/index.js";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname,req.remoteAddress,req.remotePort",
      },
    },
  },
});

app.addHook("onRequest", async (request) => {
  if (request.log) {
    const originalInfo = request.log.info.bind(request.log);
    request.log.info = (obj: unknown, msg?: string, ...args: unknown[]) => {
      if (typeof obj === "object" && obj !== null) {
        const filtered = { ...obj };
        delete (filtered as Record<string, unknown>).req?.ip;
        delete (filtered as Record<string, unknown>).remoteAddress;
        delete (filtered as Record<string, unknown>).remotePort;
        return originalInfo(filtered, msg, ...args);
      }
      return originalInfo(obj, msg, ...args);
    };
  }
});

await app.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
});

await app.register(helmet, {
  contentSecurityPolicy: false,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  redis: redis,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev-secret-change-me",
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../uploads");

await app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: "/uploads/",
});

app.register(authRoutes, { prefix: "/api/auth" });
app.register(setupRoutes, { prefix: "/api/setup" });
app.register(quizzesRoutes, { prefix: "/api" });
app.register(uploadsRoutes, { prefix: "/api" });
app.register(exportRoutes, { prefix: "/api" });
app.register(roomsRoutes, { prefix: "/api" });

app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const port = parseInt(process.env.APP_PORT || "3000", 10);

try {
  await app.ready();
  const io = initWebSockets(app.server, redis, app);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Server running on http://0.0.0.0:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

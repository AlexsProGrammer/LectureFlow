import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { pipeline } from "stream/promises";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db/index.js";
import { media } from "../db/schema.js";
import { verifyJwt } from "../middlewares/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads");

mkdirSync(uploadsDir, { recursive: true });

export async function uploadsRoutes(fastify: FastifyInstance) {
  fastify.post("/upload", { preHandler: [verifyJwt] }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: "Bad Request", message: "No file uploaded" });
    }

    const questionId = (data.fields as Record<string, { value: string }>)?.question_id?.value;
    if (!questionId) {
      return reply.code(400).send({ error: "Bad Request", message: "question_id is required" });
    }

    const ext = path.extname(data.filename);
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    const writeStream = createWriteStream(filePath);
    await pipeline(data.file, writeStream);

    const [record] = await db
      .insert(media)
      .values({
        question_id: questionId,
        file_path: `/uploads/${filename}`,
        type: "image",
      })
      .returning();

    return reply.code(201).send(record);
  });
}

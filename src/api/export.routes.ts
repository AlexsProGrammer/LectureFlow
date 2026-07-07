import type { FastifyInstance } from "fastify";
import { stringify } from "csv-stringify/sync";
import { db } from "../db/index.js";
import { quizzes, questions } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { verifyJwt } from "../middlewares/auth.js";

export async function exportRoutes(fastify: FastifyInstance) {
  fastify.get("/export/quizzes/:id", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const format = (request.query as { format?: string }).format || "json";

    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, id))
      .limit(1);

    if (quiz.length === 0) {
      return reply.code(404).send({ error: "Not Found", message: "Quiz not found" });
    }

    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quiz_id, id));

    const result = {
      ...quiz[0],
      questions: quizQuestions,
    };

    if (format === "csv") {
      const csvData = quizQuestions.map((q) => ({
        id: q.id,
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : "",
        correct_answer: q.correct_answer || "",
      }));

      const csv = stringify(csvData, { header: true });

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename="quiz_${id}.csv"`)
        .send(csv);
    }

    return reply.send(result);
  });

  fastify.post("/import/quizzes", { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = request.user as { admin_id: string; is_super_admin: boolean };
    const body = request.body as { title: string; questions?: Array<{ type?: string; content: string; options?: unknown; correct_answer?: string }> };

    if (!body.title) {
      return reply.code(400).send({ error: "Bad Request", message: "Title is required" });
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({ admin_id: user.admin_id, title: body.title })
      .returning();

    if (body.questions && body.questions.length > 0) {
      const questionValues = body.questions.map((q) => ({
        quiz_id: quiz.id,
        type: q.type || "multiple_choice",
        content: q.content,
        options: q.options || null,
        correct_answer: q.correct_answer || null,
      }));

      await db.insert(questions).values(questionValues);
    }

    const createdQuiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quiz.id))
      .limit(1);

    const createdQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quiz_id, quiz.id));

    return reply.code(201).send({
      ...createdQuiz[0],
      questions: createdQuestions,
    });
  });
}

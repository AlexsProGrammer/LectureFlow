import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db/index.js";
import { quizzes, questions } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { verifyJwt } from "../middlewares/auth.js";

interface JwtPayload {
  admin_id: string;
  is_super_admin: boolean;
}

function getAdminFromRequest(request: FastifyRequest): JwtPayload {
  return request.user as JwtPayload;
}

async function assertQuizOwnership(quizId: string, adminId: string, isSuperAdmin: boolean) {
  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (quiz.length === 0) {
    return null;
  }

  if (!isSuperAdmin && quiz[0].admin_id !== adminId) {
    return { forbidden: true };
  }

  return { quiz: quiz[0] };
}

export async function quizzesRoutes(fastify: FastifyInstance) {
  fastify.get("/quizzes", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id, is_super_admin } = getAdminFromRequest(request);

    if (is_super_admin) {
      const allQuizzes = await db.select().from(quizzes).orderBy(quizzes.created_at);
      return reply.send(allQuizzes);
    }

    const adminQuizzes = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.admin_id, admin_id))
      .orderBy(quizzes.created_at);
    return reply.send(adminQuizzes);
  });

  fastify.post("/quizzes", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id } = getAdminFromRequest(request);
    const { title } = request.body as { title: string };

    if (!title) {
      return reply.code(400).send({ error: "Bad Request", message: "Title is required" });
    }

    const [created] = await db
      .insert(quizzes)
      .values({ admin_id, title })
      .returning();

    return reply.code(201).send(created);
  });

  fastify.put("/quizzes/:id", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id, is_super_admin } = getAdminFromRequest(request);
    const { id } = request.params as { id: string };
    const { title } = request.body as { title: string };

    const result = await assertQuizOwnership(id, admin_id, is_super_admin);
    if (!result || result.forbidden) {
      return reply.code(result ? 403 : 404).send({
        error: result ? "Forbidden" : "Not Found",
        message: result ? "You do not own this quiz" : "Quiz not found",
      });
    }

    const [updated] = await db
      .update(quizzes)
      .set({ title })
      .where(eq(quizzes.id, id))
      .returning();

    return reply.send(updated);
  });

  fastify.delete("/quizzes/:id", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id, is_super_admin } = getAdminFromRequest(request);
    const { id } = request.params as { id: string };

    const result = await assertQuizOwnership(id, admin_id, is_super_admin);
    if (!result || result.forbidden) {
      return reply.code(result ? 403 : 404).send({
        error: result ? "Forbidden" : "Not Found",
        message: result ? "You do not own this quiz" : "Quiz not found",
      });
    }

    await db.delete(quizzes).where(eq(quizzes.id, id));
    return reply.code(204).send();
  });

  fastify.get("/quizzes/:quizId/questions", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id, is_super_admin } = getAdminFromRequest(request);
    const { quizId } = request.params as { quizId: string };

    const result = await assertQuizOwnership(quizId, admin_id, is_super_admin);
    if (!result || result.forbidden) {
      return reply.code(result ? 403 : 404).send({
        error: result ? "Forbidden" : "Not Found",
        message: result ? "You do not own this quiz" : "Quiz not found",
      });
    }

    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quiz_id, quizId));
    return reply.send(quizQuestions);
  });

  fastify.post("/quizzes/:quizId/questions", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id, is_super_admin } = getAdminFromRequest(request);
    const { quizId } = request.params as { quizId: string };
    const body = request.body as { type: string; content: string; options?: unknown; correct_answer?: string };

    const result = await assertQuizOwnership(quizId, admin_id, is_super_admin);
    if (!result || result.forbidden) {
      return reply.code(result ? 403 : 404).send({
        error: result ? "Forbidden" : "Not Found",
        message: result ? "You do not own this quiz" : "Quiz not found",
      });
    }

    if (!body.content) {
      return reply.code(400).send({ error: "Bad Request", message: "Content is required" });
    }

    if (body.options && typeof body.options !== "object") {
      return reply.code(400).send({ error: "Bad Request", message: "Options must be valid JSON" });
    }

    const [created] = await db
      .insert(questions)
      .values({
        quiz_id: quizId,
        type: body.type || "multiple_choice",
        content: body.content,
        options: body.options || null,
        correct_answer: body.correct_answer || null,
      })
      .returning();

    return reply.code(201).send(created);
  });

  fastify.put("/questions/:id", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id, is_super_admin } = getAdminFromRequest(request);
    const { id } = request.params as { id: string };
    const body = request.body as { type?: string; content?: string; options?: unknown; correct_answer?: string };

    const existingQuestion = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    if (existingQuestion.length === 0) {
      return reply.code(404).send({ error: "Not Found", message: "Question not found" });
    }

    const quizResult = await assertQuizOwnership(existingQuestion[0].quiz_id, admin_id, is_super_admin);
    if (!quizResult || quizResult.forbidden) {
      return reply.code(quizResult ? 403 : 404).send({
        error: quizResult ? "Forbidden" : "Not Found",
        message: quizResult ? "You do not own this quiz" : "Quiz not found",
      });
    }

    if (body.options && typeof body.options !== "object") {
      return reply.code(400).send({ error: "Bad Request", message: "Options must be valid JSON" });
    }

    const [updated] = await db
      .update(questions)
      .set({
        type: body.type || existingQuestion[0].type,
        content: body.content || existingQuestion[0].content,
        options: body.options !== undefined ? body.options : existingQuestion[0].options,
        correct_answer: body.correct_answer !== undefined ? body.correct_answer : existingQuestion[0].correct_answer,
      })
      .where(eq(questions.id, id))
      .returning();

    return reply.send(updated);
  });

  fastify.delete("/questions/:id", { preHandler: [verifyJwt] }, async (request, reply) => {
    const { admin_id, is_super_admin } = getAdminFromRequest(request);
    const { id } = request.params as { id: string };

    const existingQuestion = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    if (existingQuestion.length === 0) {
      return reply.code(404).send({ error: "Not Found", message: "Question not found" });
    }

    const quizResult = await assertQuizOwnership(existingQuestion[0].quiz_id, admin_id, is_super_admin);
    if (!quizResult || quizResult.forbidden) {
      return reply.code(quizResult ? 403 : 404).send({
        error: quizResult ? "Forbidden" : "Not Found",
        message: quizResult ? "You do not own this quiz" : "Quiz not found",
      });
    }

    await db.delete(questions).where(eq(questions.id, id));
    return reply.code(204).send();
  });
}

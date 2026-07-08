import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { admins } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "../utils/hash.js";

export async function setupRoutes(fastify: FastifyInstance) {
  fastify.get("/status", async (_request, reply) => {
    const existing = await db
      .select()
      .from(admins)
      .where(eq(admins.is_super_admin, true))
      .limit(1);

    return reply.send({ hasSuperAdmin: existing.length > 0 });
  });

  fastify.post("/init", async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || !password) {
      return reply.code(400).send({ error: "Bad Request", message: "Username and password are required" });
    }

    if (password.length < 8) {
      return reply.code(400).send({ error: "Bad Request", message: "Password must be at least 8 characters" });
    }

    const existing = await db
      .select()
      .from(admins)
      .where(eq(admins.is_super_admin, true))
      .limit(1);

    if (existing.length > 0) {
      return reply.code(403).send({ error: "Forbidden", message: "Super Admin already exists" });
    }

    const passwordHash = await hashPassword(password);

    await db.insert(admins).values({
      username,
      password_hash: passwordHash,
      is_super_admin: true,
    });

    return reply.code(201).send({ message: "Super Admin created successfully" });
  });
}

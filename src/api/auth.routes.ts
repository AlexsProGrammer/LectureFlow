import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { admins } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyPassword } from "../utils/hash.js";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/login", async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || !password) {
      return reply.code(400).send({ error: "Bad Request", message: "Username and password are required" });
    }

    const admin = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);

    if (admin.length === 0) {
      return reply.code(401).send({ error: "Unauthorized", message: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, admin[0].password_hash);
    if (!isValid) {
      return reply.code(401).send({ error: "Unauthorized", message: "Invalid credentials" });
    }

    const token = fastify.jwt.sign({
      admin_id: admin[0].id,
      is_super_admin: admin[0].is_super_admin,
    });

    return reply.send({ token, is_super_admin: admin[0].is_super_admin });
  });
}

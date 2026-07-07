import type { FastifyRequest, FastifyReply } from "fastify";

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: "Unauthorized", message: "Invalid or missing JWT" });
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { admin_id: string; is_super_admin: boolean };
  if (!user.is_super_admin) {
    return reply.code(403).send({ error: "Forbidden", message: "Super-Admin access required" });
  }
}

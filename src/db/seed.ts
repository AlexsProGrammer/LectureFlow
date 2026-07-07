import "dotenv/config";
import { db } from "./index.js";
import { admins } from "./schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "../utils/hash.js";

async function seed() {
  console.log("Seeding database...");

  const existing = await db
    .select()
    .from(admins)
    .where(eq(admins.username, "superadmin"));

  if (existing.length > 0) {
    console.log("Super-Admin already exists, skipping seed.");
    process.exit(0);
  }

  const passwordHash = await hashPassword(process.env.SUPERADMIN_PASSWORD || "admin123");

  await db.insert(admins).values({
    username: "superadmin",
    password_hash: passwordHash,
    is_super_admin: true,
  });

  console.log("Super-Admin seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

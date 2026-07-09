import { pgTable, uuid, varchar, boolean, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "open_text"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "document"]);

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  is_super_admin: boolean("is_super_admin").notNull().default(false),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  admin_id: uuid("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  quiz_id: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  type: questionTypeEnum("type").notNull().default("multiple_choice"),
  content: text("content").notNull(),
  options: jsonb("options"),
  correct_answer: varchar("correct_answer", { length: 500 }),
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  question_id: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  file_path: varchar("file_path", { length: 500 }).notNull(),
  type: mediaTypeEnum("type").notNull().default("image"),
});

export const quizResults = pgTable("quiz_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  quiz_id: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  room_code: varchar("room_code", { length: 10 }).notNull(),
  question_id: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  aggregated_results: jsonb("aggregated_results").notNull(),
  completed_at: timestamp("completed_at").notNull().defaultNow(),
});
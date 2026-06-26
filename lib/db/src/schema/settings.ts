import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default("default"),
  phoneNumberId: text("phone_number_id"),
  accessToken: text("access_token"),
  businessAccountId: text("business_account_id"),
  githubToken: text("github_token"),
  gistId: text("gist_id"),
});

export type Settings = typeof settingsTable.$inferSelect;

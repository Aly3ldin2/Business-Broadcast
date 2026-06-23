import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  phoneNumberId: text("phone_number_id"),
  accessToken: text("access_token"),
  businessAccountId: text("business_account_id"),
  githubToken: text("github_token"),
  gistId: text("gist_id"),
});

export type Settings = typeof settingsTable.$inferSelect;

import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  phoneNumberId: text("phone_number_id"),
  accessToken: text("access_token"),
  businessAccountId: text("business_account_id"),
});

export type Settings = typeof settingsTable.$inferSelect;

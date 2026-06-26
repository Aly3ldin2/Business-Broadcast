import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const broadcastsTable = sqliteTable("broadcasts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default("default"),
  name: text("name").notNull(),
  templateId: integer("template_id"),
  listId: integer("list_id"),
  status: text("status").notNull().default("draft"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const broadcastMessagesTable = sqliteTable("broadcast_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  broadcastId: integer("broadcast_id").notNull().references(() => broadcastsTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: text("sent_at"),
  deliveredAt: text("delivered_at"),
  readAt: text("read_at"),
});

export const insertBroadcastSchema = createInsertSchema(broadcastsTable).omit({ id: true, createdAt: true, sentAt: true, userId: true });
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type Broadcast = typeof broadcastsTable.$inferSelect;
export type BroadcastMessage = typeof broadcastMessagesTable.$inferSelect;

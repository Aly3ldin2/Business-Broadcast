import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const broadcastsTable = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  templateId: integer("template_id"),
  listId: integer("list_id"),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const broadcastMessagesTable = pgTable("broadcast_messages", {
  id: serial("id").primaryKey(),
  broadcastId: integer("broadcast_id").notNull().references(() => broadcastsTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
});

export const insertBroadcastSchema = createInsertSchema(broadcastsTable).omit({ id: true, createdAt: true, sentAt: true });
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type Broadcast = typeof broadcastsTable.$inferSelect;
export type BroadcastMessage = typeof broadcastMessagesTable.$inferSelect;

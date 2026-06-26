import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactListsTable = sqliteTable("contact_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default("default"),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const contactListMembersTable = sqliteTable("contact_list_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id").notNull().references(() => contactListsTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertContactListSchema = createInsertSchema(contactListsTable).omit({ id: true, createdAt: true, userId: true });
export type InsertContactList = z.infer<typeof insertContactListSchema>;
export type ContactList = typeof contactListsTable.$inferSelect;
export type ContactListMember = typeof contactListMembersTable.$inferSelect;

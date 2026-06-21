import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactListsTable = pgTable("contact_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactListMembersTable = pgTable("contact_list_members", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => contactListsTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactListSchema = createInsertSchema(contactListsTable).omit({ id: true, createdAt: true });
export type InsertContactList = z.infer<typeof insertContactListSchema>;
export type ContactList = typeof contactListsTable.$inferSelect;
export type ContactListMember = typeof contactListMembersTable.$inferSelect;

import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable } from "@workspace/db";
import { eq, like, or } from "drizzle-orm";
import {
  ListContactsQueryParams,
  CreateContactBody,
  UpdateContactBody,
  ImportContactsBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = ListContactsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }
  const { search, listId } = parsed.data;

  let query = db.select().from(contactsTable);

  if (search) {
    const contacts = await db
      .select()
      .from(contactsTable)
      .where(
        or(
          like(contactsTable.name, `%${search}%`),
          like(contactsTable.phone, `%${search}%`)
        )
      )
      .orderBy(contactsTable.createdAt);
    return res.json(contacts.map(formatContact));
  }

  if (listId) {
    const { contactListMembersTable } = await import("@workspace/db");
    const members = await db
      .select({ contact: contactsTable })
      .from(contactsTable)
      .innerJoin(
        contactListMembersTable,
        eq(contactListMembersTable.contactId, contactsTable.id)
      )
      .where(eq(contactListMembersTable.listId, listId))
      .orderBy(contactsTable.name);
    return res.json(members.map((m) => formatContact(m.contact)));
  }

  const contacts = await db
    .select()
    .from(contactsTable)
    .orderBy(contactsTable.createdAt);
  return res.json(contacts.map(formatContact));
});

router.post("/import", async (req, res) => {
  const parsed = ImportContactsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const { contacts, listId } = parsed.data;
  let imported = 0;
  let skipped = 0;

  for (const c of contacts) {
    try {
      const [contact] = await db
        .insert(contactsTable)
        .values({ name: c.name, phone: c.phone, tags: c.tags, notes: c.notes })
        .onConflictDoNothing()
        .returning();
      if (contact) {
        imported++;
        if (listId) {
          const { contactListMembersTable } = await import("@workspace/db");
          await db
            .insert(contactListMembersTable)
            .values({ listId, contactId: contact.id })
            .onConflictDoNothing();
        }
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return res.json({ imported, skipped, total: contacts.length });
});

router.post("/", async (req, res) => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const [contact] = await db
    .insert(contactsTable)
    .values(parsed.data)
    .returning();
  return res.status(201).json(formatContact(contact));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, id));
  if (!contact) return res.status(404).json({ error: "Not found" });
  return res.json(formatContact(contact));
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const [contact] = await db
    .update(contactsTable)
    .set(parsed.data)
    .where(eq(contactsTable.id, id))
    .returning();
  if (!contact) return res.status(404).json({ error: "Not found" });
  return res.json(formatContact(contact));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(contactsTable).where(eq(contactsTable.id, id));
  return res.status(204).send();
});

function formatContact(c: typeof contactsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    tags: c.tags,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

export default router;

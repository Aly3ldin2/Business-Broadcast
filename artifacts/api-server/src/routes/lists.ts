import { Router } from "express";
import { db } from "@workspace/db";
import {
  contactListsTable,
  contactListMembersTable,
  contactsTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateContactListBody,
  AddContactsToListBody,
  RemoveContactFromListBody,
} from "@workspace/api-zod";

const router = Router();

async function getListWithCount(id: number) {
  const [list] = await db
    .select()
    .from(contactListsTable)
    .where(eq(contactListsTable.id, id));
  if (!list) return null;
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(contactListMembersTable)
    .where(eq(contactListMembersTable.listId, id));
  return formatList(list, Number(cnt));
}

router.get("/", async (_req, res) => {
  const lists = await db
    .select()
    .from(contactListsTable)
    .orderBy(contactListsTable.createdAt);

  const result = await Promise.all(
    lists.map(async (list) => {
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(contactListMembersTable)
        .where(eq(contactListMembersTable.listId, list.id));
      return formatList(list, Number(cnt));
    })
  );
  return res.json(result);
});

router.post("/", async (req, res) => {
  const parsed = CreateContactListBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const [list] = await db
    .insert(contactListsTable)
    .values(parsed.data)
    .returning();
  return res.status(201).json(formatList(list, 0));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const list = await getListWithCount(id);
  if (!list) return res.status(404).json({ error: "Not found" });
  return res.json(list);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(contactListsTable).where(eq(contactListsTable.id, id));
  return res.status(204).send();
});

router.post("/:id/members", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AddContactsToListBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  for (const contactId of parsed.data.contactIds) {
    await db
      .insert(contactListMembersTable)
      .values({ listId: id, contactId })
      .onConflictDoNothing();
  }

  const list = await getListWithCount(id);
  if (!list) return res.status(404).json({ error: "Not found" });
  return res.json(list);
});

router.delete("/:id/members", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = RemoveContactFromListBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  for (const contactId of parsed.data.contactIds) {
    await db
      .delete(contactListMembersTable)
      .where(
        eq(contactListMembersTable.listId, id) &&
          eq(contactListMembersTable.contactId, contactId)
      );
  }

  return res.status(204).send();
});

function formatList(
  list: typeof contactListsTable.$inferSelect,
  contactCount: number
) {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    contactCount,
    createdAt: list.createdAt.toISOString(),
  };
}

export default router;

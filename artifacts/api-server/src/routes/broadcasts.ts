import { Router } from "express";
import { db } from "@workspace/db";
import {
  broadcastsTable,
  broadcastMessagesTable,
  contactListMembersTable,
  contactsTable,
  templatesTable,
  contactListsTable,
  settingsTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { CreateBroadcastBody } from "@workspace/api-zod";

const router = Router();

async function enrichBroadcast(b: typeof broadcastsTable.$inferSelect) {
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(broadcastMessagesTable)
    .where(eq(broadcastMessagesTable.broadcastId, b.id));

  const statusCounts = await db
    .select({ status: broadcastMessagesTable.status, cnt: count() })
    .from(broadcastMessagesTable)
    .where(eq(broadcastMessagesTable.broadcastId, b.id))
    .groupBy(broadcastMessagesTable.status);

  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.cnt)]));

  let templateName: string | null = null;
  if (b.templateId) {
    const [t] = await db.select().from(templatesTable).where(eq(templatesTable.id, b.templateId));
    templateName = t?.name ?? null;
  }
  let listName: string | null = null;
  if (b.listId) {
    const [l] = await db.select().from(contactListsTable).where(eq(contactListsTable.id, b.listId));
    listName = l?.name ?? null;
  }

  return {
    id: b.id,
    name: b.name,
    templateId: b.templateId,
    templateName,
    listId: b.listId,
    listName,
    status: b.status,
    totalCount: Number(totalCount),
    sentCount: byStatus["sent"] ?? 0,
    deliveredCount: byStatus["delivered"] ?? 0,
    readCount: byStatus["read"] ?? 0,
    failedCount: byStatus["failed"] ?? 0,
    createdAt: b.createdAt.toISOString(),
    sentAt: b.sentAt?.toISOString() ?? null,
  };
}

router.get("/", async (_req, res) => {
  const broadcasts = await db
    .select()
    .from(broadcastsTable)
    .orderBy(broadcastsTable.createdAt);
  const result = await Promise.all(broadcasts.map(enrichBroadcast));
  return res.json(result);
});

router.post("/", async (req, res) => {
  const parsed = CreateBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const [broadcast] = await db
    .insert(broadcastsTable)
    .values(parsed.data)
    .returning();
  const result = await enrichBroadcast(broadcast);
  return res.status(201).json(result);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [broadcast] = await db
    .select()
    .from(broadcastsTable)
    .where(eq(broadcastsTable.id, id));
  if (!broadcast) return res.status(404).json({ error: "Not found" });

  const base = await enrichBroadcast(broadcast);

  const messages = await db
    .select({
      msg: broadcastMessagesTable,
      contact: contactsTable,
    })
    .from(broadcastMessagesTable)
    .leftJoin(contactsTable, eq(broadcastMessagesTable.contactId, contactsTable.id))
    .where(eq(broadcastMessagesTable.broadcastId, id));

  return res.json({
    ...base,
    messages: messages.map(({ msg, contact }) => ({
      id: msg.id,
      contactName: contact?.name ?? "Unknown",
      contactPhone: contact?.phone ?? "",
      status: msg.status,
      errorMessage: msg.errorMessage,
      sentAt: msg.sentAt?.toISOString() ?? null,
      deliveredAt: msg.deliveredAt?.toISOString() ?? null,
      readAt: msg.readAt?.toISOString() ?? null,
    })),
  });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(broadcastsTable).where(eq(broadcastsTable.id, id));
  return res.status(204).send();
});

router.post("/:id/send", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [broadcast] = await db
    .select()
    .from(broadcastsTable)
    .where(eq(broadcastsTable.id, id));
  if (!broadcast) return res.status(404).json({ error: "Not found" });
  if (broadcast.status !== "draft") {
    return res.status(400).json({ error: "Broadcast is not in draft status" });
  }

  const [settingsRow] = await db.select().from(settingsTable).limit(1);
  if (!settingsRow?.phoneNumberId || !settingsRow?.accessToken) {
    return res.status(400).json({
      error: "WhatsApp API not configured. Please add credentials in Settings.",
    });
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, broadcast.templateId!));
  if (!template) return res.status(400).json({ error: "Template not found" });

  // Get contacts from the list
  const members = await db
    .select({ contact: contactsTable })
    .from(contactListMembersTable)
    .innerJoin(contactsTable, eq(contactListMembersTable.contactId, contactsTable.id))
    .where(eq(contactListMembersTable.listId, broadcast.listId!));

  if (members.length === 0) {
    return res.status(400).json({ error: "No contacts in the selected list" });
  }

  // Update broadcast status
  await db
    .update(broadcastsTable)
    .set({ status: "sending" })
    .where(eq(broadcastsTable.id, id));

  let sent = 0;
  let failed = 0;

  for (const { contact } of members) {
    const phone = contact.phone.replace(/[^0-9]/g, "");
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${settingsRow.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settingsRow.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: template.name,
              language: { code: template.language },
            },
          }),
        }
      );

      const data = await response.json() as { messages?: Array<{id: string}> };
      if (response.ok && data.messages) {
        await db.insert(broadcastMessagesTable).values({
          broadcastId: id,
          contactId: contact.id,
          status: "sent",
          sentAt: new Date(),
        });
        sent++;
      } else {
        await db.insert(broadcastMessagesTable).values({
          broadcastId: id,
          contactId: contact.id,
          status: "failed",
          errorMessage: "API error",
        });
        failed++;
      }
    } catch {
      await db.insert(broadcastMessagesTable).values({
        broadcastId: id,
        contactId: contact.id,
        status: "failed",
        errorMessage: "Network error",
      });
      failed++;
    }
  }

  await db
    .update(broadcastsTable)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(broadcastsTable.id, id));

  return res.json({
    success: true,
    sent,
    failed,
    total: members.length,
    message: `Broadcast sent to ${sent} contacts. ${failed} failed.`,
  });
});

export default router;

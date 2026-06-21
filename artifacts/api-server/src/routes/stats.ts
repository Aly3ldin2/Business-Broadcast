import { Router } from "express";
import { db } from "@workspace/db";
import {
  contactsTable,
  contactListsTable,
  broadcastsTable,
  broadcastMessagesTable,
  templatesTable,
} from "@workspace/db";
import { count, eq, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard", async (_req, res) => {
  const [{ totalContacts }] = await db
    .select({ totalContacts: count() })
    .from(contactsTable);

  const [{ totalLists }] = await db
    .select({ totalLists: count() })
    .from(contactListsTable);

  const [{ totalBroadcasts }] = await db
    .select({ totalBroadcasts: count() })
    .from(broadcastsTable);

  const [{ totalMessagesSent }] = await db
    .select({ totalMessagesSent: count() })
    .from(broadcastMessagesTable)
    .where(eq(broadcastMessagesTable.status, "sent"));

  const [{ delivered }] = await db
    .select({ delivered: count() })
    .from(broadcastMessagesTable)
    .where(eq(broadcastMessagesTable.status, "delivered"));

  const [{ read }] = await db
    .select({ read: count() })
    .from(broadcastMessagesTable)
    .where(eq(broadcastMessagesTable.status, "read"));

  const [{ total }] = await db
    .select({ total: count() })
    .from(broadcastMessagesTable);

  const deliveryRate =
    Number(total) > 0 ? (Number(delivered) + Number(read)) / Number(total) : 0;
  const readRate = Number(total) > 0 ? Number(read) / Number(total) : 0;

  const recentBroadcastRows = await db
    .select()
    .from(broadcastsTable)
    .orderBy(desc(broadcastsTable.createdAt))
    .limit(5);

  const recentBroadcasts = await Promise.all(
    recentBroadcastRows.map(async (b) => {
      const [{ cnt: totalCount }] = await db
        .select({ cnt: count() })
        .from(broadcastMessagesTable)
        .where(eq(broadcastMessagesTable.broadcastId, b.id));
      const [{ cnt: sentCount }] = await db
        .select({ cnt: count() })
        .from(broadcastMessagesTable)
        .where(eq(broadcastMessagesTable.broadcastId, b.id) as any);

      let templateName: string | null = null;
      if (b.templateId) {
        const [t] = await db
          .select()
          .from(templatesTable)
          .where(eq(templatesTable.id, b.templateId));
        templateName = t?.name ?? null;
      }
      let listName: string | null = null;
      if (b.listId) {
        const [l] = await db
          .select()
          .from(contactListsTable)
          .where(eq(contactListsTable.id, b.listId));
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
        sentCount: Number(sentCount),
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        createdAt: b.createdAt.toISOString(),
        sentAt: b.sentAt?.toISOString() ?? null,
      };
    })
  );

  return res.json({
    totalContacts: Number(totalContacts),
    totalLists: Number(totalLists),
    totalBroadcasts: Number(totalBroadcasts),
    totalMessagesSent: Number(totalMessagesSent),
    deliveryRate,
    readRate,
    recentBroadcasts,
  });
});

export default router;

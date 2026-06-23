import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SaveSettingsBody } from "@workspace/api-zod";
import { baileysServiceManager } from "../services/baileysManager";

const router = Router();

function getUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return req.isAuthenticated() ? req.user.id : "default";
}

async function getOrCreateSettings(userId: string) {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId)).limit(1);
  if (rows.length > 0) return rows[0];
  const [row] = await db.insert(settingsTable).values({ userId }).returning();
  return row;
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const settings = await getOrCreateSettings(userId);
  return res.json(formatSettings(settings, userId));
});

router.put("/", async (req, res) => {
  const userId = getUserId(req);
  const parsed = SaveSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const existing = await getOrCreateSettings(userId);
  const updateData: Record<string, string> = {};
  if (parsed.data.githubToken) updateData.githubToken = parsed.data.githubToken;
  if (parsed.data.gistId !== undefined) updateData.gistId = parsed.data.gistId ?? "";

  await db.update(settingsTable)
    .set(updateData)
    .where(and(eq(settingsTable.id, existing.id), eq(settingsTable.userId, userId)));
  const updated = await getOrCreateSettings(userId);
  return res.json(formatSettings(updated, userId));
});

function formatSettings(s: typeof settingsTable.$inferSelect, userId: string) {
  const { connected } = baileysServiceManager.get(userId).getStatus();
  return {
    isConfigured: connected,
    hasGithubToken: !!s.githubToken,
    gistId: s.gistId,
  };
}

export default router;

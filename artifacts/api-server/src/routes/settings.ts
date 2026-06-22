import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SaveSettingsBody } from "@workspace/api-zod";
import { baileysService } from "../services/baileys";

const router = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [row] = await db.insert(settingsTable).values({}).returning();
  return row;
}

router.get("/", async (_req, res) => {
  const settings = await getOrCreateSettings();
  return res.json(formatSettings(settings));
});

router.put("/", async (req, res) => {
  const parsed = SaveSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const existing = await getOrCreateSettings();
  const updateData: Record<string, string> = {};
  if (parsed.data.githubToken) updateData.githubToken = parsed.data.githubToken;
  if (parsed.data.gistId !== undefined) updateData.gistId = parsed.data.gistId ?? "";

  await db.update(settingsTable).set(updateData).where(eq(settingsTable.id, existing.id));
  const updated = await getOrCreateSettings();
  return res.json(formatSettings(updated));
});

function formatSettings(s: typeof settingsTable.$inferSelect) {
  const { connected } = baileysService.getStatus();
  return {
    isConfigured: connected,
    hasGithubToken: !!s.githubToken,
    gistId: s.gistId,
  };
}

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SaveSettingsBody } from "@workspace/api-zod";

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
  if (parsed.data.phoneNumberId) updateData.phoneNumberId = parsed.data.phoneNumberId;
  if (parsed.data.accessToken) updateData.accessToken = parsed.data.accessToken;
  if (parsed.data.businessAccountId !== undefined) updateData.businessAccountId = parsed.data.businessAccountId ?? "";
  if (parsed.data.githubToken) updateData.githubToken = parsed.data.githubToken;
  if (parsed.data.gistId !== undefined) updateData.gistId = parsed.data.gistId ?? "";

  await db.update(settingsTable).set(updateData).where(eq(settingsTable.id, existing.id));
  const updated = await getOrCreateSettings();
  return res.json(formatSettings(updated));
});

router.post("/test", async (_req, res) => {
  const settings = await getOrCreateSettings();
  if (!settings.phoneNumberId || !settings.accessToken) {
    return res.json({
      success: false,
      message: "WhatsApp API credentials not configured yet.",
      phoneNumber: null,
    });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${settings.phoneNumberId}`,
      { headers: { Authorization: `Bearer ${settings.accessToken}` } }
    );
    const data = await response.json() as { display_phone_number?: string; error?: { message?: string } };
    if (response.ok && data.display_phone_number) {
      return res.json({
        success: true,
        message: "Connection successful! WhatsApp Business API is working.",
        phoneNumber: data.display_phone_number,
      });
    }
    return res.json({
      success: false,
      message: data.error?.message ?? "Connection failed. Check your credentials.",
      phoneNumber: null,
    });
  } catch {
    return res.json({ success: false, message: "Network error. Could not reach WhatsApp API.", phoneNumber: null });
  }
});

function formatSettings(s: typeof settingsTable.$inferSelect) {
  return {
    isConfigured: !!(s.phoneNumberId && s.accessToken),
    hasGithubToken: !!s.githubToken,
    phoneNumberId: s.phoneNumberId,
    accessToken: s.accessToken ? s.accessToken.slice(0, 8) + "..." : null,
    businessAccountId: s.businessAccountId,
    gistId: s.gistId,
  };
}

export default router;

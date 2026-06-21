import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { SendCampaignBody } from "@workspace/api-zod";

const router = Router();

async function sendWhatsApp(
  phoneNumberId: string,
  accessToken: string,
  phone: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await response.json() as {
    messages?: Array<{ id: string }>;
    error?: { message?: string };
  };
  if (response.ok && data.messages?.length) return { ok: true };
  return { ok: false, error: data.error?.message ?? `HTTP ${response.status}` };
}

router.post("/send", async (req, res) => {
  const parsed = SendCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings?.phoneNumberId || !settings?.accessToken) {
    return res.status(400).json({ error: "WhatsApp API not configured. Go to Settings first." });
  }

  const { phones, message, mediaItems } = parsed.data;
  const results: { phone: string; success: boolean; error?: string | null }[] = [];
  let sent = 0;
  let failed = 0;

  for (const rawPhone of phones) {
    const phone = rawPhone.replace(/[\s+\-()]/g, "");
    if (!phone || phone.length < 10) {
      results.push({ phone: rawPhone, success: false, error: "Invalid phone number" });
      failed++;
      continue;
    }

    const errors: string[] = [];

    // 1. Send text message
    const textResult = await sendWhatsApp(
      settings.phoneNumberId,
      settings.accessToken,
      phone,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message, preview_url: true },
      }
    );
    if (!textResult.ok) errors.push(textResult.error ?? "text failed");

    // 2. Send each media item (by ID or URL)
    if (mediaItems && mediaItems.length > 0) {
      for (const item of mediaItems) {
        await new Promise((r) => setTimeout(r, 150));
        const mediaPayload = item.id ? { id: item.id } : { link: item.url };
        const mediaResult = await sendWhatsApp(
          settings.phoneNumberId,
          settings.accessToken,
          phone,
          {
            messaging_product: "whatsapp",
            to: phone,
            type: item.type,
            [item.type]: mediaPayload,
          }
        );
        if (!mediaResult.ok) errors.push(mediaResult.error ?? `${item.type} failed`);
      }
    }

    if (errors.length === 0) {
      results.push({ phone, success: true, error: null });
      sent++;
    } else {
      results.push({ phone, success: false, error: errors.join("; ") });
      failed++;
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  return res.json({ total: phones.length, sent, failed, results });
});

export default router;

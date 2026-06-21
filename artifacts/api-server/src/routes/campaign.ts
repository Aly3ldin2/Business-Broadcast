import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { SendCampaignBody } from "@workspace/api-zod";

const router = Router();

router.post("/send", async (req, res) => {
  const parsed = SendCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings?.phoneNumberId || !settings?.accessToken) {
    return res.status(400).json({
      error: "WhatsApp API not configured. Go to Settings first.",
    });
  }

  const { phones, message, mediaUrl, mediaType } = parsed.data;
  const results: { phone: string; success: boolean; error?: string | null }[] = [];
  let sent = 0;
  let failed = 0;

  for (const rawPhone of phones) {
    const phone = rawPhone.replace(/[\s+\-()]/g, "");
    if (!phone || phone.length < 10) {
      results.push({ phone: rawPhone, success: false, error: "Invalid phone number format" });
      failed++;
      continue;
    }

    try {
      let body: Record<string, unknown>;

      if (mediaUrl && mediaType === "image") {
        body = {
          messaging_product: "whatsapp",
          to: phone,
          type: "image",
          image: { link: mediaUrl, caption: message },
        };
      } else if (mediaUrl && mediaType === "video") {
        body = {
          messaging_product: "whatsapp",
          to: phone,
          type: "video",
          video: { link: mediaUrl, caption: message },
        };
      } else {
        body = {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message, preview_url: true },
        };
      }

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${settings.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json() as {
        messages?: Array<{ id: string }>;
        error?: { message?: string; code?: number };
      };

      if (response.ok && data.messages?.length) {
        results.push({ phone, success: true, error: null });
        sent++;
      } else {
        const errMsg = data.error?.message ?? `HTTP ${response.status}`;
        results.push({ phone, success: false, error: errMsg });
        failed++;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      results.push({ phone, success: false, error: msg });
      failed++;
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  return res.json({ total: phones.length, sent, failed, results });
});

export default router;

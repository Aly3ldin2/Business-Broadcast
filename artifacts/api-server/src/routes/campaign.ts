import { Router } from "express";
import { baileysService } from "../services/baileys";
import { SendCampaignBody } from "@workspace/api-zod";
import { mediaStore } from "./media";
import { logger } from "../lib/logger";

const router = Router();

router.post("/send", async (req, res) => {
  const parsed = SendCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const status = baileysService.getStatus();
  if (!status.connected) {
    return res.status(400).json({
      error: "WhatsApp غير متصل. افتح الإعدادات وامسح QR Code أولاً.",
    });
  }

  const { phones, message, mediaItems } = parsed.data;
  const results: { phone: string; success: boolean; error?: string | null }[] = [];
  let sent = 0;
  let failed = 0;

  for (const rawPhone of phones) {
    const phone = rawPhone.replace(/[\s+\-()]/g, "");
    if (!phone || phone.length < 10) {
      results.push({ phone: rawPhone, success: false, error: "رقم هاتف غير صالح" });
      failed++;
      continue;
    }

    try {
      // 1. Send text message
      await baileysService.sendText(phone, message);

      // 2. Send each media item
      if (mediaItems && mediaItems.length > 0) {
        for (const item of mediaItems) {
          await new Promise((r) => setTimeout(r, 800));

          if (item.id) {
            const stored = mediaStore.get(item.id);
            if (stored) {
              if (item.type === "image") {
                await baileysService.sendImage(phone, stored.buffer, stored.mimetype);
              } else if (item.type === "video") {
                await baileysService.sendVideo(phone, stored.buffer, stored.mimetype);
              }
            }
          } else if (item.url) {
            const resp = await fetch(item.url);
            const buf = Buffer.from(await resp.arrayBuffer());
            const mime = resp.headers.get("content-type") ?? "image/jpeg";
            if (item.type === "image") {
              await baileysService.sendImage(phone, buf, mime);
            } else {
              await baileysService.sendVideo(phone, buf, mime);
            }
          }
        }
      }

      results.push({ phone, success: true, error: null });
      sent++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "فشل الإرسال";
      logger.error({ phone, err: e }, `campaign send failed: ${msg}`);
      results.push({ phone, success: false, error: msg });
      failed++;
    }

    // Small delay between contacts to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  return res.json({ total: phones.length, sent, failed, results });
});

export default router;

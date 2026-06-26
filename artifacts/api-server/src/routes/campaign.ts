import { Router } from "express";
import { baileysServiceManager } from "../services/baileysManager";
import { SendCampaignBody } from "@workspace/api-zod";
import { mediaStore } from "./media";
import { logger } from "../lib/logger";

const router = Router();

function getUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return req.isAuthenticated() ? req.user.id : "default";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

router.post("/send", async (req, res) => {
  const parsed = SendCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const userId = getUserId(req);
  const svc = baileysServiceManager.get(userId);
  const status = svc.getStatus();
  if (!status.connected) {
    return res.status(400).json({
      error: "WhatsApp غير متصل. افتح الإعدادات وامسح QR Code أولاً.",
    });
  }

  const { phones, message, mediaItems } = parsed.data;
  const textContent = message?.trim() || undefined;
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
      const hasMedia = mediaItems && mediaItems.length > 0;
      const hasText = !!textContent;

      if (hasMedia) {
        // Send all media items first (no caption) — they will appear above the text
        for (let i = 0; i < mediaItems.length; i++) {
          if (i > 0) await delay(800);

          const item = mediaItems[i];
          let buf: Buffer | null = null;
          let mime = "image/jpeg";

          if (item.id) {
            const stored = mediaStore.get(item.id);
            if (stored) { buf = stored.buffer; mime = stored.mimetype; }
          } else if (item.url) {
            const resp = await fetch(item.url);
            buf = Buffer.from(await resp.arrayBuffer());
            mime = resp.headers.get("content-type") ?? "image/jpeg";
          }

          if (buf) {
            if (item.type === "image") {
              await svc.sendImage(phone, buf, mime);
            } else if (item.type === "video") {
              await svc.sendVideo(phone, buf, mime);
            }
          }
        }

        // Send text as a separate message after all media (appears below media in chat)
        if (hasText) {
          await delay(600);
          await svc.sendText(phone, textContent!);
        }
      } else if (hasText) {
        await svc.sendText(phone, textContent!);
      }

      results.push({ phone, success: true, error: null });
      sent++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "فشل الإرسال";
      logger.error({ phone, err: e }, `campaign send failed: ${msg}`);
      results.push({ phone, success: false, error: msg });
      failed++;
    }

    // Delay between recipients to avoid spam detection
    await delay(600);
  }

  return res.json({ total: phones.length, sent, failed, results });
});

export default router;

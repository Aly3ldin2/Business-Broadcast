import { Router } from "express";
import { baileysServiceManager } from "../services/baileysManager";
import { SendCampaignBody } from "@workspace/api-zod";
import { mediaStore } from "./media";
import { logger } from "../lib/logger";

const router = Router();

function getUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return req.isAuthenticated() ? req.user.id : "default";
}

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
  const caption = message?.trim() || undefined;
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

      if (hasMedia) {
        // Send each media item — first item carries the text as caption (appears above text in WA)
        for (let i = 0; i < mediaItems.length; i++) {
          if (i > 0) await new Promise((r) => setTimeout(r, 800));

          const item = mediaItems[i];
          const itemCaption = i === 0 ? caption : undefined;
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
              await svc.sendImage(phone, buf, mime, itemCaption);
            } else if (item.type === "video") {
              await svc.sendVideo(phone, buf, mime, itemCaption);
            }
          }
        }
      } else if (caption) {
        await svc.sendText(phone, caption);
      }

      results.push({ phone, success: true, error: null });
      sent++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "فشل الإرسال";
      logger.error({ phone, err: e }, `campaign send failed: ${msg}`);
      results.push({ phone, success: false, error: msg });
      failed++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return res.json({ total: phones.length, sent, failed, results });
});

export default router;

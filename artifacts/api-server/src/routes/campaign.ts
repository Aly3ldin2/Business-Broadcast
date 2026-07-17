import { Router } from "express";
import { baileysServiceManager } from "../services/baileysManager";
import { SendCampaignBody } from "@workspace/api-zod";
import { mediaStore } from "./media";
import { logger } from "../lib/logger";
import { transcodeVideoBuffer } from "../lib/video";

const router = Router();

function getUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return req.isAuthenticated() ? req.user.id : "default";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

router.post("/send", async (req, res) => {
  const parsed = SendCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const userId = getUserId(req);
  const svc = baileysServiceManager.get(userId);
  const status = svc.getStatus();
  if (!status.connected) {
    res.status(400).json({
      error: "WhatsApp not connected. Open Settings and scan the QR Code first.",
    });
    return;
  }

  // ── Set up SSE stream ───────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  function sendEvent(data: Record<string, unknown>) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Track whether the client has disconnected mid-broadcast so we can skip
  // remaining sends and avoid writing to a closed response.
  let clientAborted = false;
  req.on("close", () => {
    clientAborted = true;
    clearInterval(heartbeat);
  });

  // Heartbeat: send a keep-alive comment every 15 s so the SSE connection
  // stays open during long video uploads (large files can take 30-90 s).
  // Wrapped in try/catch so a write-to-closed-socket error after the client
  // disconnects doesn't propagate as an unhandled exception.
  const heartbeat = setInterval(() => {
    try { res.write(": keepalive\n\n"); } catch { clearInterval(heartbeat); }
  }, 15_000);

  const { phones, message, mediaItems } = parsed.data;
  const textContent = message?.trim() || undefined;
  const results: { phone: string; success: boolean; error?: string | null }[] = [];
  const total = phones.length;
  let sent = 0;
  let failed = 0;

  for (let idx = 0; idx < phones.length; idx++) {
    // Stop processing if the client disconnected (e.g. navigated away).
    if (clientAborted) break;

    const rawPhone = phones[idx];
    const phone = rawPhone.replace(/[\s+\-()]/g, "");
    const remaining = total - idx - 1;

    if (!phone || phone.length < 10) {
      results.push({ phone: rawPhone, success: false, error: "Invalid phone number" });
      failed++;
      sendEvent({ type: "progress", phone: rawPhone, success: false, error: "Invalid phone number", sent, failed, remaining, total });
      continue;
    }

    // Notify frontend we're starting this phone
    sendEvent({ type: "sending", phone, sent, failed, remaining: remaining + 1, total });

    try {
      const hasMedia = mediaItems && mediaItems.length > 0;
      const hasText = !!textContent;

      if (hasMedia) {
        for (let i = 0; i < mediaItems.length; i++) {
          if (i > 0) await delay(800);

          const item = mediaItems[i];
          let buf: Buffer | null = null;
          let mime = "image/jpeg";
          let seconds: number | undefined;

          if (item.id) {
            const stored = mediaStore.get(item.id);
            if (stored) { buf = stored.buffer; mime = stored.mimetype; seconds = stored.seconds; }
          } else if (item.url) {
            const resp = await fetch(item.url);
            if (!resp.ok) {
              throw new Error(`Failed to download media from URL (status ${resp.status})`);
            }
            buf = Buffer.from(await resp.arrayBuffer());
            mime = resp.headers.get("content-type") ?? "image/jpeg";

            // URL-sourced videos bypass the upload transcode pipeline, so
            // re-encode them here too — otherwise a non-H.264/non-MP4 remote
            // video would still reach WhatsApp unconverted and risk arriving
            // damaged/unplayable, same as a direct upload would have.
            if (item.type === "video") {
              const result = await transcodeVideoBuffer(buf);
              buf = result.buffer;
              seconds = result.seconds;
              mime = "video/mp4";
            }
          }

          if (!buf) {
            throw new Error(
              item.id
                ? "Media file expired or not found — please re-upload and try again"
                : "Missing media source (no id or url)",
            );
          }

          if (item.type === "image") {
            await svc.sendImage(phone, buf, mime);
          } else if (item.type === "video") {
            await svc.sendVideo(phone, buf, mime, undefined, seconds);
          }
        }

        if (hasText) {
          await delay(600);
          await svc.sendText(phone, textContent!);
        }
      } else if (hasText) {
        await svc.sendText(phone, textContent!);
      }

      results.push({ phone, success: true, error: null });
      sent++;
      sendEvent({ type: "progress", phone, success: true, error: null, sent, failed, remaining, total });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Send failed";
      logger.error({ phone, err: e }, `campaign send failed: ${msg}`);
      results.push({ phone, success: false, error: msg });
      failed++;
      sendEvent({ type: "progress", phone, success: false, error: msg, sent, failed, remaining, total });
    }

    if (idx < phones.length - 1) {
      await delay(600);
    }
  }

  clearInterval(heartbeat);
  sendEvent({ type: "complete", sent, failed, total, results });
  res.end();
});

export default router;

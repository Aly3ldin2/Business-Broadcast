import { Router } from "express";
import { baileysServiceManager } from "../services/baileysManager";
import { logger } from "../lib/logger";

const router = Router();

function getUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return req.isAuthenticated() ? req.user.id : "default";
}

router.get("/status", (req, res) => {
  const userId = getUserId(req);
  const status = baileysServiceManager.get(userId).getStatus();
  return res.json({
    connected: status.connected,
    qr: status.qr,
    socketReady: status.socketReady,
  });
});

router.get("/contacts", (req, res) => {
  const userId = getUserId(req);
  const contacts = baileysServiceManager.get(userId).getContacts();
  return res.json({ contacts });
});

/**
 * SSE stream that pushes the contact list every time it changes.
 * The client receives a `data:` event immediately on connect (current state)
 * and again whenever Baileys fires contacts.upsert / contacts.update.
 */
router.get("/contacts/stream", (req, res) => {
  const userId = getUserId(req);
  const svc = baileysServiceManager.get(userId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = () => {
    const contacts = svc.getContacts();
    res.write(`data: ${JSON.stringify({ contacts })}\n\n`);
  };

  // Send current snapshot immediately so the dialog populates without waiting
  send();

  // Push every subsequent change
  const unsub = svc.subscribeContacts(send);

  // Heartbeat keeps the connection alive through proxies / load-balancers
  const hb = setInterval(() => res.write(": heartbeat\n\n"), 25_000);

  req.on("close", () => {
    unsub();
    clearInterval(hb);
  });
});

router.post("/pair", async (req, res) => {
  const userId = getUserId(req);
  const { phone } = req.body as { phone?: string };
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "phone مطلوب" });
  }
  try {
    const svc = baileysServiceManager.get(userId);
    const code = await svc.requestPairingCode(phone);
    return res.json({ code });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "فشل طلب كود الربط";
    logger.error({ err: e }, `pair failed: ${msg}`);
    return res.status(500).json({ error: msg });
  }
});

router.post("/logout", async (req, res) => {
  const userId = getUserId(req);
  try {
    await baileysServiceManager.get(userId).logout();
    return res.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Logout failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

export default router;

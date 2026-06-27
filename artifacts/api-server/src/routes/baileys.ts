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

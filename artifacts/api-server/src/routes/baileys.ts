import { Router } from "express";
import { baileysServiceManager } from "../services/baileysManager";

const router = Router();

function getUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return req.isAuthenticated() ? req.user.id : "default";
}

router.get("/status", (req, res) => {
  const userId = getUserId(req);
  const status = baileysServiceManager.get(userId).getStatus();
  return res.json({ connected: status.connected, qr: status.qr });
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

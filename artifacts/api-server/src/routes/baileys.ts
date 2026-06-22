import { Router } from "express";
import { baileysService } from "../services/baileys";

const router = Router();

router.get("/status", (_req, res) => {
  const status = baileysService.getStatus();
  return res.json({ connected: status.connected, qr: status.qr });
});

router.post("/logout", async (_req, res) => {
  try {
    await baileysService.logout();
    return res.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Logout failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

export default router;

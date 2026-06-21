import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/3gpp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings?.phoneNumberId || !settings?.accessToken) {
    return res.status(400).json({ error: "WhatsApp API not configured. Go to Settings first." });
  }

  try {
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", req.file.mimetype);
    formData.append(
      "file",
      new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype }),
      req.file.originalname
    );

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${settings.phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.accessToken}` },
        body: formData,
      }
    );

    const data = await response.json() as { id?: string; error?: { message?: string } };

    if (!response.ok || !data.id) {
      return res.status(400).json({ error: data.error?.message ?? "WhatsApp upload failed" });
    }

    return res.json({ id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return res.status(500).json({ error: msg });
  }
});

export default router;

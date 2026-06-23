import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";

const router = Router();

// In-memory store of uploaded media, keyed by UUID
export const mediaStore = new Map<string, { buffer: Buffer; mimetype: string }>();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB — supports up to ~5 min video
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/3gpp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم"));
  },
});

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "لم يتم إرسال ملف" });
  }

  const id = randomUUID();
  mediaStore.set(id, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });

  // Auto-cleanup after 2 hours
  setTimeout(() => mediaStore.delete(id), 2 * 60 * 60 * 1000);

  return res.json({ id });
});

export default router;

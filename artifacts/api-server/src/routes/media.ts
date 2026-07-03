import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";

const router = Router();

export const mediaStore = new Map<string, { buffer: Buffer; mimetype: string }>();

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type — allowed: JPG/PNG/WebP images and MP4 video"));
  },
});

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const id = randomUUID();
  mediaStore.set(id, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });

  setTimeout(() => mediaStore.delete(id), 2 * 60 * 60 * 1000);

  return res.json({ id });
});

export default router;

import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { logger } from "../lib/logger";
import { transcodeVideoFile } from "../lib/video";

const router = Router();

export const mediaStore = new Map<
  string,
  { buffer: Buffer; mimetype: string; seconds?: number }
>();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Accept all common video container types — EVERY video is re-encoded to a
// known-good H.264/AAC/MP4 by transcodeVideoFile() before being stored, so
// WhatsApp always receives a file it can play, regardless of source device,
// original codec (H.265/HEVC, VP9…) or container (MOV, AVI, WebM, MKV…).
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov — default format on iPhones
  "video/x-m4v", // .m4v — iTunes/Apple devices
  "video/x-msvideo", // .avi
  "video/webm", // .webm — Chrome/Android recordings
  "video/x-matroska", // .mkv
  "video/3gpp", // .3gp — older Android phones
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Use disk storage for uploads instead of memory storage. A 5-minute video
// can be 100-300 MB; holding the original AND the transcoded copy in RAM at
// the same time risked truncated/partial buffers under memory pressure,
// which is one of the ways a "damaged" video could reach WhatsApp.
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpdir()),
    filename: (_req, _file, cb) => cb(null, `wa_upload_${randomUUID()}`),
  }),
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type "${file.mimetype}" — ` +
            `allowed: JPG/PNG/WebP/GIF images and MP4/MOV/WebM/AVI/MKV/3GP videos`,
        ),
      );
    }
  },
});

router.post("/upload", (req, res) => {
  // Wrap multer in a callback so we can return proper JSON errors instead of
  // letting Express propagate them as an unhandled 500.
  upload.single("file")(req, res, async (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large — maximum allowed size is 300 MB"
          : err.message;
      return res.status(400).json({ error: msg });
    }
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadedPath = req.file.path;
    let mimetype = req.file.mimetype;
    let seconds: number | undefined;
    let buffer: Buffer;

    try {
      if (mimetype.startsWith("video/")) {
        const result = await transcodeVideoFile(uploadedPath);
        buffer = result.buffer;
        seconds = result.seconds;
        mimetype = "video/mp4";
      } else {
        buffer = await readFile(uploadedPath);
      }

      const id = randomUUID();
      mediaStore.set(id, { buffer, mimetype, seconds });

      // Auto-expire after 2 hours to free memory
      setTimeout(() => mediaStore.delete(id), 2 * 60 * 60 * 1000);

      return res.json({ id });
    } catch (procErr) {
      logger.error({ err: procErr }, "media upload processing failed");
      return res.status(400).json({
        error: "Could not process video — please try a different file",
      });
    } finally {
      await unlink(uploadedPath).catch(() => {});
    }
  });
});

export default router;

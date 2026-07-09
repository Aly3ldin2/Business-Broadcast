import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const router = Router();

export const mediaStore = new Map<string, { buffer: Buffer; mimetype: string }>();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Accept all common video container types — non-MP4 formats are transcoded
// to H.264/MP4 by ensureMp4() before being stored, so WhatsApp always
// receives a compatible file regardless of what the user uploaded.
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",   // .mov — default format on iPhones
  "video/x-m4v",      // .m4v — iTunes/Apple devices
  "video/x-msvideo",  // .avi
  "video/webm",        // .webm — Chrome/Android recordings
  "video/x-matroska", // .mkv
  "video/3gpp",        // .3gp — older Android phones
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(
        `Unsupported file type "${file.mimetype}" — ` +
        `allowed: JPG/PNG/WebP/GIF images and MP4/MOV/WebM/AVI/MKV/3GP videos`,
      ));
    }
  },
});

/**
 * Re-encode any video buffer to H.264/AAC inside an MP4 container using ffmpeg.
 * This ensures WhatsApp can always play the resulting file regardless of the
 * original codec (H.265, VP9, MPEG-4, etc.) or container (MOV, AVI, WebM…).
 *
 * -preset fast  — good balance of speed vs. file size
 * -crf 23       — visually lossless quality (0=best, 51=worst; 23 is default)
 * -movflags +faststart — moves the moov atom to the front so WA can stream
 */
async function ensureMp4(buffer: Buffer): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `wa_in_${id}`);
  const outputPath = join(tmpdir(), `wa_out_${id}.mp4`);

  try {
    await writeFile(inputPath, buffer);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-max_muxing_queue_size", "1024",
      outputPath,
    ]);
    return await readFile(outputPath);
  } finally {
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ]);
  }
}

router.post("/upload", (req, res) => {
  // Wrap multer in a callback so we can return proper JSON errors instead of
  // letting Express propagate them as an unhandled 500.
  upload.single("file")(req, res, async (err: unknown) => {
    // ── Multer / filter errors ──────────────────────────────────────
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

    let { buffer, mimetype } = req.file;

    // ── Transcode non-MP4 video to H.264/MP4 ───────────────────────
    if (mimetype.startsWith("video/") && mimetype !== "video/mp4") {
      try {
        buffer = await ensureMp4(buffer);
        mimetype = "video/mp4";
      } catch {
        return res.status(400).json({
          error:
            "Could not convert video to MP4 — please convert it manually and try again",
        });
      }
    }

    const id = randomUUID();
    mediaStore.set(id, { buffer, mimetype });

    // Auto-expire after 2 hours to free memory
    setTimeout(() => mediaStore.delete(id), 2 * 60 * 60 * 1000);

    return res.json({ id });
  });
});

export default router;

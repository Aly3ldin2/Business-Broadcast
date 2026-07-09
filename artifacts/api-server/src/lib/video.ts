import { randomUUID } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface TranscodeResult {
  buffer: Buffer;
  seconds: number | undefined;
}

/**
 * Re-encode a video (given as a file already on disk) to a
 * WhatsApp-guaranteed-compatible format: H.264 video + AAC audio inside an
 * MP4 container with the moov atom moved to the front (faststart) so
 * WhatsApp can stream it immediately.
 *
 * This runs unconditionally on every video — even ones already reporting
 * `video/mp4` — because many phones (iPhone "High Efficiency", recent
 * Android) record H.265/HEVC inside an .mp4 container, which WhatsApp does
 * not reliably play. Re-encoding removes that ambiguity regardless of
 * source device, container, or clip length.
 *
 * Cleans up its own output temp file if ffmpeg/ffprobe fails, so a failed
 * conversion never leaks a partial file into /tmp.
 */
export async function transcodeVideoFile(inputPath: string): Promise<TranscodeResult> {
  const outputPath = join(tmpdir(), `wa_out_${randomUUID()}.mp4`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p", // ensures broad playback compatibility
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-max_muxing_queue_size", "1024",
      outputPath,
    ]);

    let seconds: number | undefined;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        outputPath,
      ]);
      const parsed = parseFloat(stdout.trim());
      if (!Number.isNaN(parsed)) seconds = Math.round(parsed);
    } catch {
      // Non-fatal — video still sends, just without an explicit duration hint
    }

    const buffer = await readFile(outputPath);
    return { buffer, seconds };
  } finally {
    // Guarantees no orphan output file survives a failed ffmpeg/ffprobe run
    // or a later error while reading the result back into memory.
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Same as transcodeVideoFile but takes an in-memory buffer (used for
 * URL-sourced media in campaign sends, where there's no upload temp file
 * already on disk). Writes it to a scratch file, transcodes, and cleans up.
 */
export async function transcodeVideoBuffer(input: Buffer): Promise<TranscodeResult> {
  const inputPath = join(tmpdir(), `wa_in_${randomUUID()}`);
  try {
    await writeFile(inputPath, input);
    return await transcodeVideoFile(inputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
  }
}

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

interface ProbeInfo {
  videoCodec: string | undefined;
  hasAudio: boolean;
  audioCodec: string | undefined;
  pixFmt: string | undefined;
  formatName: string | undefined;
  seconds: number | undefined;
}

async function probe(inputPath: string): Promise<ProbeInfo> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,pix_fmt:format=duration,format_name",
    "-of", "json",
    inputPath,
  ]);
  const data = JSON.parse(stdout) as {
    streams?: { codec_type?: string; codec_name?: string; pix_fmt?: string }[];
    format?: { duration?: string; format_name?: string };
  };
  const videoStream = data.streams?.find((s) => s.codec_type === "video");
  const audioStream = data.streams?.find((s) => s.codec_type === "audio");
  const parsedSeconds = data.format?.duration ? parseFloat(data.format.duration) : NaN;
  return {
    videoCodec: videoStream?.codec_name,
    hasAudio: !!audioStream,
    audioCodec: audioStream?.codec_name,
    pixFmt: videoStream?.pix_fmt,
    formatName: data.format?.format_name,
    seconds: Number.isNaN(parsedSeconds) ? undefined : Math.round(parsedSeconds),
  };
}

/**
 * Re-encode a video (given as a file already on disk) to a
 * WhatsApp-guaranteed-compatible format: H.264 video + AAC audio inside an
 * MP4 container with the moov atom moved to the front (faststart) so
 * WhatsApp can stream it immediately.
 *
 * Many phones (iPhone "High Efficiency", recent Android) record H.265/HEVC
 * inside an .mp4 container, which WhatsApp does not reliably play — so we
 * never trust the reported mimetype/extension alone.
 *
 * Performance: a full re-encode of a multi-minute clip can take tens of
 * seconds, which made uploads look "stuck" even for videos that were
 * already perfectly compatible. So we probe first with ffprobe (~instant)
 * and only pay the full re-encode cost when the source isn't already
 * H.264/yuv420p + AAC. Already-compatible MP4s get a near-instant
 * stream-copy remux (just relocates the moov atom for faststart) instead.
 *
 * Cleans up its own output temp file if ffmpeg/ffprobe fails, so a failed
 * conversion never leaks a partial file into /tmp.
 */
export async function transcodeVideoFile(inputPath: string): Promise<TranscodeResult> {
  const outputPath = join(tmpdir(), `wa_out_${randomUUID()}.mp4`);

  try {
    let info: ProbeInfo | undefined;
    try {
      info = await probe(inputPath);
    } catch {
      // If probing fails, fall through to a full re-encode to be safe.
    }

    // Require explicit, unambiguous matches — an undefined/missing field
    // from ffprobe means "unknown", not "compatible", so it always forces
    // the safe full re-encode path rather than risking a false positive.
    const isAlreadyCompatible =
      info?.videoCodec === "h264" &&
      info.pixFmt === "yuv420p" &&
      (info.hasAudio ? info.audioCodec === "aac" : true) &&
      !!info.formatName?.includes("mp4");

    if (isAlreadyCompatible) {
      // Fast path: stream-copy remux only (no re-encode) — just ensures
      // faststart. Typically completes in well under a second regardless
      // of clip length since no frames are decoded/re-encoded.
      // Explicit stream mapping keeps only the primary video/audio tracks,
      // so unusual extra streams (subtitles, data tracks) never leak into
      // the file WhatsApp receives.
      try {
        await execFileAsync("ffmpeg", [
          "-y",
          "-i", inputPath,
          "-map", "0:v:0",
          ...(info?.hasAudio ? ["-map", "0:a:0"] : []),
          "-c", "copy",
          "-movflags", "+faststart",
          outputPath,
        ]);
        const buffer = await readFile(outputPath);
        return { buffer, seconds: info?.seconds ?? 0 };
      } catch {
        // Fall through to full re-encode below if the fast remux fails
        // for any reason (e.g. unusual stream layout).
      }
    }

    // Full re-encode path — guarantees H.264/AAC/MP4 output regardless of
    // the original codec (H.265, VP9, MPEG-4…) or container.
    //
    // "ultrafast" (vs. the previous "superfast") is libx264's fastest
    // preset — for a 5-minute clip this can cut re-encode time roughly in
    // half again on top of the superfast->veryfast jump, at the cost of a
    // somewhat larger output file for the same CRF. That trade only affects
    // bitrate/size, never correctness: CRF still targets the same
    // perceptual quality and the output is still standard H.264/yuv420p, so
    // it plays back identically — never "damaged" — on WhatsApp. "-threads
    // 0" lets ffmpeg use all available CPU cores instead of the default
    // guess, which matters most for long (multi-minute) clips.
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-threads", "0",
      "-crf", "23",
      "-pix_fmt", "yuv420p", // ensures broad playback compatibility
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-max_muxing_queue_size", "1024",
      outputPath,
    ]);

    let seconds = info?.seconds;
    if (seconds === undefined) {
      try {
        const reprobed = await probe(outputPath);
        seconds = reprobed.seconds;
      } catch {
        // Non-fatal — video still sends, just without an explicit duration hint
      }
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

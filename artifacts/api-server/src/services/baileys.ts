import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { mkdir, rm, writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import os from "os";
import path from "path";
import pino from "pino";
import QRCode from "qrcode";

const AUTH_DIR = path.join(process.cwd(), ".baileys_auth");
const silentLogger = pino({ level: "silent" });

class BaileysService {
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private _qr: string | null = null;
  private _connected = false;
  private _initializing = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async initialize() {
    if (this._initializing) return;
    this._initializing = true;

    // Clear any pending reconnect
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    try {
      await mkdir(AUTH_DIR, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        logger: silentLogger,
        printQRInTerminal: false,
        browser: ["WhatsApp Broadcast", "Chrome", "1.0.0"],
        connectTimeoutMs: 60_000,
      });

      this.sock = sock;

      sock.ev.on("connection.update", async (update) => {
        // If this socket was replaced (logout), ignore stale events
        if (this.sock !== sock) return;

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this._qr = await QRCode.toDataURL(qr);
          } catch {
            this._qr = qr;
          }
          this._connected = false;
        }

        if (connection === "close") {
          this._connected = false;
          this._qr = null;
          this._initializing = false;
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          if (!isLoggedOut) {
            // Auto-reconnect with backoff
            this._reconnectTimer = setTimeout(() => void this.initialize(), 5_000);
          }
        } else if (connection === "open") {
          this._connected = true;
          this._qr = null;
          this._initializing = false;
        }
      });

      sock.ev.on("creds.update", saveCreds);
    } catch {
      this._initializing = false;
      this._reconnectTimer = setTimeout(() => void this.initialize(), 10_000);
    }
  }

  getStatus() {
    return { connected: this._connected, qr: this._qr };
  }

  async sendText(phone: string, text: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp غير متصل — افتح الإعدادات وامسح QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
  }

  async sendImage(phone: string, buffer: Buffer, mimetype: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp غير متصل — افتح الإعدادات وامسح QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    // Pass buffer directly — Baileys handles image buffers natively
    await this.sock.sendMessage(jid, { image: buffer, mimetype });
  }

  async sendVideo(phone: string, buffer: Buffer, mimetype: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp غير متصل — افتح الإعدادات وامسح QR Code");
    }
    const ext = mimetype === "video/3gpp" ? "3gp" : "mp4";
    const tmpPath = path.join(os.tmpdir(), `wa-vid-${randomUUID()}.${ext}`);
    try {
      await writeFile(tmpPath, buffer);
      const jid = `${phone}@s.whatsapp.net`;
      // Use absolute local path (no file:// prefix) — Baileys reads local paths via fs
      await this.sock.sendMessage(jid, {
        video: { url: tmpPath },
        mimetype,
        gifPlayback: false,
      });
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  async logout() {
    // Capture and replace socket reference first so stale events are ignored
    const sock = this.sock;
    this.sock = null;
    this._connected = false;
    this._qr = null;
    this._initializing = false;

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (sock) {
      sock.ev.removeAllListeners();
      try { await sock.logout(); } catch { /* ignore */ }
    }

    await rm(AUTH_DIR, { recursive: true, force: true });

    // Re-initialize immediately so a fresh QR appears
    void this.initialize();
  }
}

export const baileysService = new BaileysService();

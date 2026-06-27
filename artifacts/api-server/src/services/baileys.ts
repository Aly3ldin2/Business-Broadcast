import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { mkdir, rm } from "fs/promises";
import path from "path";
import pino from "pino";
import QRCode from "qrcode";

const AUTH_BASE = process.env.BAILEYS_AUTH_PATH ?? path.join(process.cwd(), ".baileys_auth");
const silentLogger = pino({ level: "silent" });

export class BaileysService {
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private _qr: string | null = null;
  private _connected = false;
  private _initializing = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private authDir: string;

  constructor(private userId: string) {
    this.authDir = path.join(AUTH_BASE, userId);
  }

  async initialize() {
    if (this._initializing) return;
    this._initializing = true;

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    try {
      await mkdir(this.authDir, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
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

  /**
   * Request a pairing code (8-char) for phone-number-based linking.
   * Must be called while the socket is in QR-waiting state (not yet registered).
   */
  async requestPairingCode(phone: string): Promise<string> {
    if (!this.sock) {
      throw new Error("Socket not initialized — wait for QR to appear first");
    }
    if (this._connected) {
      throw new Error("Already connected — logout first to re-link");
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7) {
      throw new Error("رقم الهاتف غير صالح");
    }
    const code = await this.sock.requestPairingCode(cleanPhone);
    return code ?? "";
  }

  async sendText(phone: string, text: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp غير متصل — افتح الإعدادات وامسح QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
  }

  async sendImage(phone: string, buffer: Buffer, mimetype: string, caption?: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp غير متصل — افتح الإعدادات وامسح QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, {
      image: buffer,
      mimetype,
      fileLength: buffer.length,
      ...(caption ? { caption } : {}),
    });
  }

  async sendVideo(phone: string, buffer: Buffer, mimetype: string, caption?: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp غير متصل — افتح الإعدادات وامسح QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    // Pass the buffer directly — avoids temp-file race conditions that corrupt
    // large video encryption for files > ~60 seconds.
    await this.sock.sendMessage(jid, {
      video: buffer,
      mimetype,
      fileLength: buffer.length,
      gifPlayback: false,
      ...(caption ? { caption } : {}),
    });
  }

  async logout() {
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

    await rm(this.authDir, { recursive: true, force: true });

    // Re-initialize immediately so a fresh QR appears
    void this.initialize();
  }
}

// Keep backward-compatible singleton for legacy imports
export const baileysService = new BaileysService("default");

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

const AUTH_DIR = path.join(process.cwd(), ".baileys_auth");
const silentLogger = pino({ level: "silent" });

class BaileysService {
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private _qr: string | null = null;
  private _connected = false;
  private _initializing = false;

  async initialize() {
    if (this._initializing) return;
    this._initializing = true;
    try {
      await mkdir(AUTH_DIR, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: state,
        logger: silentLogger,
        printQRInTerminal: false,
        browser: ["WhatsApp Broadcast", "Chrome", "1.0.0"],
        connectTimeoutMs: 60_000,
      });

      this.sock.ev.on("connection.update", async (update) => {
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
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            setTimeout(() => void this.initialize(), 5000);
          }
        } else if (connection === "open") {
          this._connected = true;
          this._qr = null;
          this._initializing = false;
        }
      });

      this.sock.ev.on("creds.update", saveCreds);
    } catch {
      this._initializing = false;
      setTimeout(() => void this.initialize(), 10_000);
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
    await this.sock.sendMessage(jid, { image: buffer, mimetype });
  }

  async sendVideo(phone: string, buffer: Buffer, mimetype: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp غير متصل — افتح الإعدادات وامسح QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { video: buffer, mimetype });
  }

  async logout() {
    if (this.sock) {
      try { await this.sock.logout(); } catch { /* ignore */ }
      this.sock = null;
    }
    this._connected = false;
    this._qr = null;
    this._initializing = false;
    await rm(AUTH_DIR, { recursive: true, force: true });
  }
}

export const baileysService = new BaileysService();

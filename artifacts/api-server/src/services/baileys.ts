import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import path from "path";
import pino from "pino";
import QRCode from "qrcode";

const AUTH_BASE = process.env.BAILEYS_AUTH_PATH ?? path.join(process.cwd(), ".baileys_auth");
const silentLogger = pino({ level: "silent" });

interface PendingPairing {
  phone: string;
  resolve: (code: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface SyncedContact {
  /** Phone number without the "+" or "@s.whatsapp.net" suffix */
  number: string;
  name: string | null;
  /** Unix timestamp (seconds) of last conversation — undefined if no chat history */
  lastChatAt?: number;
}

export class BaileysService {
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private _qr: string | null = null;
  private _connected = false;
  private _initializing = false;
  /** In-memory contact book, populated from Baileys' contacts sync events */
  private _contacts = new Map<string, SyncedContact>();
  /** Last chat activity timestamp (seconds) per phone number — for "recently chatted" sort */
  private _chatActivity = new Map<string, number>();
  /** true once the WS to WA servers is confirmed open (QR fired or connection opened) */
  private _socketReady = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** Pending pairing-code request waiting for the next WS connection */
  private _pendingPairing: PendingPairing | null = null;
  /**
   * Cached WA version — fetched once on first connect, reused on every reconnect.
   * Avoids a slow GitHub network round-trip after QR scan that would delay the
   * post-pairing reconnect and cause the pairing window to expire on WA's side.
   */
  private _waVersion: [number, number, number] | undefined;

  /** Callbacks subscribed to contact-book changes (for SSE push) */
  private _contactListeners = new Set<() => void>();

  /**
   * Subscribe to contact-book changes. Returns an unsubscribe function.
   * Called whenever contacts.upsert / contacts.update fires or on logout.
   */
  subscribeContacts(cb: () => void): () => void {
    this._contactListeners.add(cb);
    return () => this._contactListeners.delete(cb);
  }

  private _notifyContactListeners() {
    for (const cb of this._contactListeners) {
      try { cb(); } catch { /* never let a listener crash the service */ }
    }
  }

  constructor(private userId: string) {}

  get authDir() {
    return path.join(AUTH_BASE, this.userId);
  }

  get contactsFile() {
    return path.join(this.authDir, "contacts.json");
  }

  /**
   * contacts.json format — versioned so stale files from old code are ignored.
   *
   * v1 (plain array)  — stored both `name` and `notify` as the name field;
   *                     unsaved numbers appeared in the contact list. Ignored.
   * v2 (this version) — only contacts where `name` came from the phone's own
   *                     address book are stored; `notify` is never persisted.
   */
  private static readonly CONTACTS_FILE_VERSION = 2;

  private async loadPersistedContacts() {
    try {
      const raw = await readFile(this.contactsFile, "utf-8");
      const parsed = JSON.parse(raw) as unknown;

      // Reject old plain-array format (v1) — it may contain notify-sourced names.
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        await rm(this.contactsFile, { force: true });
        return;
      }

      const file = parsed as { v?: number; contacts?: SyncedContact[] };
      if ((file.v ?? 0) < BaileysService.CONTACTS_FILE_VERSION) {
        // Outdated version — discard and let WhatsApp re-sync clean data.
        await rm(this.contactsFile, { force: true });
        return;
      }

      for (const c of file.contacts ?? []) {
        // Extra guard: only load entries with a real saved name —
        // reject entries where name looks like a formatted phone number
        // (e.g. "+20∙∙∙∙∙∙∙∙31") which WhatsApp uses for unsaved contacts.
        const name = c.name?.trim();
        const looksLikePhone = !!name && /^\+[\d\s\u00b7\u22c5\u2219.()\-]+$/.test(name);
        if (name && !looksLikePhone) this._contacts.set(c.number, c);
      }
    } catch {
      // No persisted contacts yet — fine, they'll populate from sync events.
    }
  }

  private _savePersistedContactsQueued = false;
  private queueSavePersistedContacts() {
    if (this._savePersistedContactsQueued) return;
    this._savePersistedContactsQueued = true;
    setTimeout(() => {
      this._savePersistedContactsQueued = false;
      // Only persist contacts that have a real saved name — never bare numbers.
      const contacts = [...this._contacts.values()].filter((c) => c.name?.trim());
      const payload = { v: BaileysService.CONTACTS_FILE_VERSION, contacts };
      void writeFile(this.contactsFile, JSON.stringify(payload), "utf-8").catch(() => {
        /* best-effort persistence — in-memory copy still works for this run */
      });
    }, 1_000);
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
      if (this._contacts.size === 0) await this.loadPersistedContacts();
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      // Fetch WA version only once; reuse on all subsequent reconnects so we
      // don't incur a slow GitHub round-trip right after a QR scan (which would
      // delay the reconnect and cause the pairing window to expire on WA's side).
      if (!this._waVersion) {
        const { version } = await fetchLatestBaileysVersion();
        this._waVersion = version as [number, number, number];
      }
      const version = this._waVersion;

      const sock = makeWASocket({
        version,
        auth: state,
        logger: silentLogger,
        printQRInTerminal: false,
        browser: ["WhatsApp Broadcast", "Chrome", "1.0.0"],
        connectTimeoutMs: 60_000,
        // Keep the WebSocket alive with periodic pings to prevent idle disconnects
        keepAliveIntervalMs: 25_000,
        // Baileys defaults to a 60s lifetime for the FIRST QR but only 20s for subsequent
        // auto-refreshed ones. Force every QR (first and subsequent) to live 60s so it
        // always matches the 60s countdown shown in the UI.
        qrTimeout: 60_000,
      });

      this.sock = sock;

      sock.ev.on("connection.update", async (update) => {
        if (this.sock !== sock) return;

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // WS to WA is open — mark ready and generate QR image
          this._initializing = false;
          this._socketReady = true;
          try {
            this._qr = await QRCode.toDataURL(qr);
          } catch {
            this._qr = qr;
          }
          this._connected = false;

          // If there's a pending pairing request, fulfill it now that WS is open
          void this._fulfillPendingPairing();
        }

        if (connection === "close") {
          this._connected = false;
          this._qr = null;
          this._socketReady = false;
          this._initializing = false;

          // Clear the socket reference immediately so the next initialize() call
          // starts clean and any stale event guards (this.sock !== sock) work correctly.
          if (this.sock === sock) this.sock = null;

          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          if (!isLoggedOut) {
            // restartRequired fires as a routine part of WA's handshake right after
            // pairing/login. Give credentials 1 s to flush to disk before re-reading
            // them in the next initialize() call (previously 250 ms which could race
            // the async saveCreds write on slow-I/O environments like Replit).
            const isRestartRequired = statusCode === DisconnectReason.restartRequired;
            this._reconnectTimer = setTimeout(
              () => void this.initialize(),
              isRestartRequired ? 1_000 : 5_000,
            );
          } else {
            // Logged out — reject any pending pairing
            this._rejectPendingPairing(new Error("تم تسجيل الخروج — أعد تشغيل الاتصال"));
          }
        } else if (connection === "open") {
          this._connected = true;
          this._qr = null;
          this._socketReady = true;
          this._initializing = false;
          // Resolve any pending pairing (shouldn't be any, but just in case)
          this._rejectPendingPairing(new Error("متصل بالفعل — لا حاجة لكود ربط"));
        }
      });

      sock.ev.on("creds.update", saveCreds);

      // Populate the in-memory contact book from WhatsApp's own sync events.
      // "messaging-history.set" fires once after login with the bulk contact
      // list; "contacts.upsert"/"contacts.update" keep it current afterwards.
      const upsertContacts = (
        list: {
          id?: string;
          lid?: string;
          phoneNumber?: string;
          name?: string | null;
          notify?: string | null;
        }[],
        source: string,
      ) => {
        let added = 0, cleared = 0, skipped = 0;
        for (const c of list) {
          // Baileys v7 contacts may report `id` as either a PN JID
          // (@s.whatsapp.net) or an LID (@lid) — LID-based contacts carry
          // the actual phone number separately in `phoneNumber`. Without
          // this fallback, LID-only contacts were silently dropped.
          const pnSource =
            (c.id?.endsWith("@s.whatsapp.net") ? c.id : undefined) ?? c.phoneNumber;
          if (!pnSource) { skipped++; continue; }
          const number = pnSource.replace("@s.whatsapp.net", "").replace(/\D/g, "");
          if (!number) { skipped++; continue; }
          // Only `name` reflects a name actually saved in the user's phone
          // contacts. `notify` is the pushName the *other* person chose for
          // themselves (e.g. shown in chats/groups) and is present even for
          // numbers the user never saved — using it as a fallback was why
          // unsaved numbers kept showing up with a "name".
          //
          // Distinguish undefined (field absent → keep existing) from null/""
          // (explicit clear from WhatsApp → contact was unsaved, wipe the name).
          //
          // WhatsApp also sets `name` to a formatted phone number (e.g.
          // "+20∙∙∙∙∙∙∙∙31") for contacts the user hasn't actually saved in
          // their address book. Treat those as "no name" so they don't leak
          // into the import list.
          const existing = this._contacts.get(number);
          const rawName =
            c.name !== undefined
              ? (c.name?.trim() || null) // explicit value: use it (null if empty)
              : (existing?.name ?? null); // field absent: keep what we have
          // Reject names that look like formatted phone numbers — they indicate
          // an unsaved contact. Pattern: starts with "+" then only digits,
          // spaces, middle-dots (U+00B7 / U+22C5 / U+2219), dashes, parens.
          const looksLikePhone = rawName !== null &&
            /^\+[\d\s\u00b7\u22c5\u2219.()\-]+$/.test(rawName);
          const name = looksLikePhone ? null : rawName;
          this._contacts.set(number, { number, name });
          if (name) added++; else cleared++;
        }
        // Diagnostic log — remove once contacts behavior is confirmed correct
        console.log(
          `[contacts] ${source}: total=${list.length} withName=${added} noName=${cleared} skipped=${skipped} | mapSize=${this._contacts.size} | namedInMap=${[...this._contacts.values()].filter(x=>x.name).length}`,
        );
        if (list.length) {
          this.queueSavePersistedContacts();
          this._notifyContactListeners();
        }
      };

      sock.ev.on("messaging-history.set", ({ contacts, chats }) => {
        upsertContacts(contacts ?? [], "history.set");
        // Seed chat-activity map from historical chats
        for (const chat of chats ?? []) {
          const ts = chat.lastMessageRecvTimestamp ?? chat.conversationTimestamp;
          if (!ts) continue;
          const num = chat.id.replace(/@.+$/, "").replace(/\D/g, "");
          if (num && !chat.id.includes("@g.us")) { // skip groups
            const prev = this._chatActivity.get(num) ?? 0;
            if (Number(ts) > prev) this._chatActivity.set(num, Number(ts));
          }
        }
      });
      sock.ev.on("contacts.upsert", (contacts) => upsertContacts(contacts, "contacts.upsert"));
      sock.ev.on("contacts.update", (updates) => upsertContacts(updates, "contacts.update"));

      // Track chat activity so recently-chatted contacts sort to the top
      sock.ev.on("chats.set", ({ chats }) => {
        for (const chat of chats) {
          const ts = chat.lastMessageRecvTimestamp ?? chat.conversationTimestamp;
          if (!ts) continue;
          const num = chat.id.replace(/@.+$/, "").replace(/\D/g, "");
          if (num && !chat.id.includes("@g.us")) {
            const prev = this._chatActivity.get(num) ?? 0;
            if (Number(ts) > prev) this._chatActivity.set(num, Number(ts));
          }
        }
        this._notifyContactListeners();
      });
      sock.ev.on("chats.update", (updates) => {
        for (const chat of updates) {
          const ts = chat.lastMessageRecvTimestamp ?? chat.conversationTimestamp;
          if (!ts) continue;
          const num = chat.id?.replace(/@.+$/, "").replace(/\D/g, "");
          if (num && !chat.id?.includes("@g.us")) {
            const prev = this._chatActivity.get(num) ?? 0;
            if (Number(ts) > prev) this._chatActivity.set(num, Number(ts));
          }
        }
      });
      sock.ev.on("messages.upsert", ({ messages }) => {
        for (const msg of messages) {
          const jid = msg.key.remoteJid;
          if (!jid || jid.includes("@g.us") || jid.includes("@broadcast")) continue;
          const num = jid.replace(/@.+$/, "").replace(/\D/g, "");
          if (!num) continue;
          const ts = msg.messageTimestamp ? Number(msg.messageTimestamp) : Math.floor(Date.now() / 1000);
          const prev = this._chatActivity.get(num) ?? 0;
          if (ts > prev) {
            this._chatActivity.set(num, ts);
            this._notifyContactListeners();
          }
        }
      });
    } catch {
      this._initializing = false;
      this._socketReady = false;
      this._reconnectTimer = setTimeout(() => void this.initialize(), 10_000);
    }
  }

  /** Try to fulfill a pending pairing code request using the current socket */
  private async _fulfillPendingPairing() {
    const pending = this._pendingPairing;
    if (!pending || !this.sock) return;

    // Small delay — give Baileys a moment after QR fires to stabilize the WS
    await new Promise((r) => setTimeout(r, 300));

    // Check if it was cancelled while we waited
    if (this._pendingPairing !== pending) return;
    this._pendingPairing = null;
    clearTimeout(pending.timer);

    try {
      const code = await this.sock.requestPairingCode(pending.phone);
      pending.resolve(code ?? "");
    } catch (err) {
      pending.reject(this._translatePairingError(err));
    }
  }

  private _rejectPendingPairing(err: Error) {
    if (!this._pendingPairing) return;
    const pending = this._pendingPairing;
    this._pendingPairing = null;
    clearTimeout(pending.timer);
    pending.reject(err);
  }

  private _translatePairingError(err: unknown): Error {
    const raw = err instanceof Error ? err.message : String(err);
    if (/multi.?device/i.test(raw))
      return new Error("فعّل خاصية الأجهزة المتعددة في WhatsApp أولاً");
    if (/bad.?session|not.?registered|not.?authent/i.test(raw))
      return new Error("الجلسة غير صالحة — اضغط «قطع الاتصال» وحاول مجدداً");
    if (/timeout/i.test(raw))
      return new Error("انتهت مهلة الطلب — حاول مرة أخرى");
    if (/connection.closed|closed/i.test(raw))
      return new Error("الاتصال مؤقتاً مقطوع — جاري إعادة المحاولة...");
    return new Error(`فشل طلب الكود: ${raw}`);
  }

  getStatus() {
    return {
      connected: this._connected,
      qr: this._qr,
      /** true once WA WebSocket is open and pairing code can be requested */
      socketReady: this._socketReady,
    };
  }

  /**
   * Returns the synced WhatsApp contact book.
   *
   * Only entries with a saved name are included — WhatsApp also reports
   * plain phone numbers the user has merely chatted with (or that share a
   * group), which were never actually saved to their phone contacts. Those
   * have no `name`/`notify` and would otherwise show up as bare, unrecognized
   * numbers in the import list, which is exactly what users don't want to
   * see here.
   *
   * Sorting: recently-chatted contacts appear first (descending by last
   * message timestamp), then the rest alphabetically by name.
   */
  getContacts(): SyncedContact[] {
    return [...this._contacts.values()]
      .filter((c) => !!c.name?.trim())
      .map((c) => ({ ...c, lastChatAt: this._chatActivity.get(c.number) }))
      .sort((a, b) => {
        // Both have recent activity → newer first
        if (a.lastChatAt && b.lastChatAt) return b.lastChatAt - a.lastChatAt;
        // Only a has activity → a comes first
        if (a.lastChatAt) return -1;
        // Only b has activity → b comes first
        if (b.lastChatAt) return 1;
        // Neither has activity → alphabetical by name
        return a.name!.localeCompare(b.name!);
      });
  }

  /**
   * Request an 8-char pairing code for phone-number-based linking.
   * If the WS is momentarily closed (QR expired), auto-retries on next reconnect.
   * Resolves with the code or rejects after 45 seconds.
   */
  async requestPairingCode(phone: string): Promise<string> {
    if (this._connected) {
      throw new Error("Already connected — disconnect the session first");
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7) {
      throw new Error("Invalid phone number — enter with country code, no +");
    }

    // Cancel any previously pending pairing
    this._rejectPendingPairing(new Error("New request — cancelling previous"));

    // If socket is ready right now, try immediately
    if (this.sock && this._socketReady) {
      try {
        const code = await this.sock.requestPairingCode(cleanPhone);
        return code ?? "";
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        // For connection-closed errors, fall through to the pending/retry path
        if (!/connection.?closed|closed/i.test(raw)) {
          throw this._translatePairingError(err);
        }
        // WS just closed — mark not ready and fall through
        this._socketReady = false;
      }
    }

    // Socket not ready or WS just closed — wait for next reconnect (max 45s)
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this._pendingPairing?.phone === cleanPhone) {
          this._pendingPairing = null;
        }
        reject(new Error("Timeout (45s) — please try again"));
      }, 45_000);

      this._pendingPairing = { phone: cleanPhone, resolve, reject, timer };

      // If socket is already initializing, _fulfillPendingPairing will be called when QR fires.
      // If not, kick off initialization.
      if (!this._initializing && !this.sock) {
        void this.initialize();
      }
    });
  }

  async sendText(phone: string, text: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp not connected — open Settings and scan QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
  }

  async sendImage(phone: string, buffer: Buffer, mimetype: string, caption?: string) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp not connected — open Settings and scan QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, {
      image: buffer,
      mimetype,
      ...(caption ? { caption } : {}),
    });
  }

  async sendVideo(
    phone: string,
    buffer: Buffer,
    _mimetype: string,
    caption?: string,
    seconds?: number,
  ) {
    if (!this.sock || !this._connected) {
      throw new Error("WhatsApp not connected — open Settings and scan QR Code");
    }
    const jid = `${phone}@s.whatsapp.net`;
    // Always send as video/mp4 — the upload pipeline re-encodes every video to
    // H.264/AAC/MP4 before it reaches here, so WhatsApp can always play it.
    await this.sock.sendMessage(jid, {
      video: buffer,
      mimetype: "video/mp4",
      gifPlayback: false,
      ptv: false,
      fileLength: BigInt(buffer.byteLength),
      ...(seconds ? { seconds } : {}),
      ...(caption ? { caption } : {}),
    });
  }

  async logout() {
    this._rejectPendingPairing(new Error("تم تسجيل الخروج"));
    this._contacts.clear();
    this._chatActivity.clear();

    const sock = this.sock;
    this.sock = null;
    this._connected = false;
    this._qr = null;
    this._socketReady = false;
    this._initializing = false;

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (sock) {
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("creds.update");
      try { await sock.logout(""); } catch { /* ignore */ }
    }

    await rm(this.authDir, { recursive: true, force: true });

    void this.initialize();
  }
}

export const baileysService = new BaileysService("default");

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
  /**
   * Name saved in the user's phone address book (contacts app).
   * null when the number is not in the address book.
   */
  name: string | null;
  /**
   * The contact's own WhatsApp push-name (`notify` field from Baileys).
   * Only present for numbers registered on WhatsApp. Used as display-name
   * fallback when the number is not saved in the phone address book.
   */
  waName?: string | null;
  /**
   * true when WhatsApp confirmed this number has a WA account.
   * Set whenever Baileys sends a non-empty `notify` (the contact's own WA
   * push-name) — `notify` is only present for numbers registered on WhatsApp.
   * Once set to true it is never cleared, so it survives reconnects.
   */
  hasWhatsApp?: boolean;
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
   * Resolves when the most recent `saveCreds` write has fully landed on disk.
   * We wait for this before reinitializing after `restartRequired` to avoid
   * reading a partially-written credentials file on Replit's slow filesystem.
   */
  private _pendingCredsWrite: Promise<void> = Promise.resolve();

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
   * v2               — only address-book contacts stored; notify never persisted.
   *                     Discarded so contacts re-sync with hasWhatsApp flag.
   * v3 (this version) — adds `hasWhatsApp` flag set when Baileys delivers a
   *                     non-empty `notify`, proving the number is on WhatsApp.
   */
  private static readonly CONTACTS_FILE_VERSION = 3;

  private async loadPersistedContacts() {
    try {
      const raw = await readFile(this.contactsFile, "utf-8");
      const parsed = JSON.parse(raw) as unknown;

      // Reject old plain-array format (v1) — it may contain notify-sourced names.
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        await rm(this.contactsFile, { force: true });
        return;
      }

      const file = parsed as {
        v?: number;
        contacts?: SyncedContact[];
        /** Saved chat-activity timestamps (unix seconds) keyed by phone number */
        chatActivity?: Record<string, number>;
      };
      if ((file.v ?? 0) < BaileysService.CONTACTS_FILE_VERSION) {
        // Outdated version — discard and let WhatsApp re-sync clean data.
        await rm(this.contactsFile, { force: true });
        return;
      }

      for (const c of file.contacts ?? []) {
        // Load contacts that have either a real saved address-book name OR a
        // WhatsApp push-name (waName). This preserves "chat history" contacts
        // (unsaved numbers we had a direct conversation with) across server
        // restarts so they don't vanish while waiting for WhatsApp to re-sync.
        const name = c.name?.trim();
        const looksLikePhone = !!name && /^\+[\d\s\u00b7\u22c5\u2219.()\-]+$/.test(name);
        if ((name && !looksLikePhone) || c.waName?.trim()) {
          this._contacts.set(c.number, c);
        }
      }

      // Restore chat-activity timestamps so recently-chatted contacts survive
      // server restarts without waiting for WhatsApp to re-deliver history.
      for (const [num, ts] of Object.entries(file.chatActivity ?? {})) {
        this._chatActivity.set(num, Number(ts));
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
      // Persist contacts that have a real saved address-book name OR a WA
      // push-name. This ensures unsaved-but-chatted contacts (waName +
      // lastChatAt) survive server restarts without waiting for WhatsApp to
      // re-deliver them via messaging-history.set.
      const contacts = [...this._contacts.values()].filter(
        (c) => c.name?.trim() || c.waName?.trim(),
      );
      // Also persist chat-activity timestamps so recently-chatted contacts
      // can be restored immediately after a server restart.
      const chatActivity = Object.fromEntries([...this._chatActivity.entries()]);
      const payload = { v: BaileysService.CONTACTS_FILE_VERSION, contacts, chatActivity };
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

      // Reset the creds-write tracker so we only wait for THIS socket's
      // saveCreds() call when restartRequired fires, not a stale promise
      // left over from a previous session.
      this._pendingCredsWrite = Promise.resolve();

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
            const isRestartRequired = statusCode === DisconnectReason.restartRequired;
            if (isRestartRequired) {
              // restartRequired fires right after QR pairing — Baileys has called
              // saveCreds but the disk write may still be in progress on Replit's
              // slow FUSE filesystem. Wait for the write to fully land before
              // reinitializing; reading a partial credentials file was the root
              // cause of "couldn't connect" errors after scanning QR.
              void this._pendingCredsWrite.then(() => {
                // Small extra buffer after write completes — ensures OS flushes
                this._reconnectTimer = setTimeout(() => void this.initialize(), 300);
              });
            } else {
              this._reconnectTimer = setTimeout(() => void this.initialize(), 5_000);
            }
          } else {
            // Logged out remotely (user disconnected from their phone).
            // The session credentials on disk are now invalid — if we try to
            // reconnect with them Baileys will keep getting rejected and the
            // QR will never appear. Fix: wipe the auth files exactly like the
            // manual logout() does, then reinitialize so a fresh QR is shown.
            this._rejectPendingPairing(new Error("تم تسجيل الخروج — أعد تشغيل الاتصال"));
            // Remove stale Baileys session files. contacts.json lives in the
            // same dir but will be recreated from memory on queueSavePersistedContacts.
            void rm(this.authDir, { recursive: true, force: true }).catch(() => {});
            this._reconnectTimer = setTimeout(() => void this.initialize(), 2_000);
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

      // Wrap saveCreds so we can track exactly when the disk write finishes.
      // Baileys does NOT await event-listener return values, so without this
      // wrapper we have no way to know if saveCreds has completed before the
      // next initialize() call reads the auth files.
      sock.ev.on("creds.update", () => {
        this._pendingCredsWrite = Promise.resolve(saveCreds()).catch(() => {});
      });

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
        for (const c of list) {
          // Baileys v7 contacts may report `id` as either a PN JID
          // (@s.whatsapp.net) or an LID (@lid) — LID-based contacts carry
          // the actual phone number separately in `phoneNumber`. Without
          // this fallback, LID-only contacts were silently dropped.
          const pnSource =
            (c.id?.endsWith("@s.whatsapp.net") ? c.id : undefined) ?? c.phoneNumber;
          if (!pnSource) continue;
          const number = pnSource.replace("@s.whatsapp.net", "").replace(/\D/g, "");
          if (!number) continue;
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
          // IMPORTANT: when WhatsApp sends a phone-number-like "name" on reconnect,
          // it does NOT mean the real saved name was removed — it just means WhatsApp
          // has no address-book entry for this number. Keep the existing persisted name
          // rather than wiping it, so contacts survive refreshes and server restarts.
          const looksLikePhone = rawName !== null &&
            /^\+[\d\s\u00b7\u22c5\u2219.()\-]+$/.test(rawName);
          const name = looksLikePhone ? (existing?.name ?? null) : rawName;
          // `notify` is the contact's own WhatsApp push-name — it is ONLY
          // delivered for numbers that have an active WhatsApp account.
          // We use its presence as a reliable "has WhatsApp" signal and store
          // it as `waName` so unsaved-but-on-WA contacts can display a name.
          // Once hasWhatsApp is true it is never cleared.
          const notifyStr = typeof c.notify === "string" ? c.notify.trim() : "";
          const hasWhatsApp =
            existing?.hasWhatsApp || notifyStr.length > 0;
          // Prefer the existing waName over a new empty notify to avoid
          // accidentally clearing a previously captured push-name.
          const waName = notifyStr.length > 0 ? notifyStr : (existing?.waName ?? null);
          this._contacts.set(number, { number, name, waName, hasWhatsApp });
        }
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
          if (!ts || !chat.id) continue;
          const num = chat.id.replace(/@.+$/, "").replace(/\D/g, "");
          if (num && !chat.id.includes("@g.us")) { // skip groups
            const prev = this._chatActivity.get(num) ?? 0;
            if (Number(ts) > prev) this._chatActivity.set(num, Number(ts));
          }
        }
      });
      sock.ev.on("contacts.upsert", (contacts) => upsertContacts(contacts, "contacts.upsert"));
      sock.ev.on("contacts.update", (updates) => upsertContacts(updates, "contacts.update"));
      sock.ev.on("chats.update", (updates) => {
        let changed = false;
        for (const chat of updates) {
          const ts = chat.lastMessageRecvTimestamp ?? chat.conversationTimestamp;
          if (!ts) continue;
          const num = chat.id?.replace(/@.+$/, "").replace(/\D/g, "");
          if (num && !chat.id?.includes("@g.us")) {
            const prev = this._chatActivity.get(num) ?? 0;
            if (Number(ts) > prev) {
              this._chatActivity.set(num, Number(ts));
              changed = true;
            }
          }
        }
        // Persist updated chat-activity so it survives server restarts
        if (changed) this.queueSavePersistedContacts();
      });
      sock.ev.on("messages.upsert", ({ messages }) => {
        let changed = false;
        for (const msg of messages) {
          const jid = msg.key.remoteJid;
          if (!jid || jid.includes("@g.us") || jid.includes("@broadcast")) continue;
          const num = jid.replace(/@.+$/, "").replace(/\D/g, "");
          if (!num) continue;
          const ts = msg.messageTimestamp ? Number(msg.messageTimestamp) : Math.floor(Date.now() / 1000);
          const prev = this._chatActivity.get(num) ?? 0;
          if (ts > prev) {
            this._chatActivity.set(num, ts);
            changed = true;
          }
        }
        if (changed) {
          this.queueSavePersistedContacts();
          this._notifyContactListeners();
        }
      });
    } catch (err) {
      this._initializing = false;
      this._socketReady = false;
      // Log so connection failures are diagnosable instead of silently swallowed.
      // Using console.error here because the pino logger may not be available
      // in all environments where this is invoked (e.g. during early startup).
      console.error("[BaileysService] initialize() failed:", err);
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
   * A contact is included only when BOTH conditions hold:
   *   1. It is confirmed on WhatsApp — either Baileys sent a `notify` for it
   *      (hasWhatsApp flag) or it has recent chat activity with the user.
   *      This excludes phone/call-only contacts that never joined WhatsApp.
   *   2. It has a saved name — so bare unrecognised numbers don't appear.
   *
   * Sorting: recently-chatted contacts appear first (descending by last
   * message timestamp), then the rest alphabetically by name.
   */
  getContacts(): SyncedContact[] {
    return [...this._contacts.values()]
      .filter((c) => {
        const lastChatAt = this._chatActivity.get(c.number);
        // ① Saved in the phone's address book → always include.
        //    These are the user's own contacts regardless of group membership.
        if (c.name) return true;
        // ② Not saved but had a real 1-on-1 conversation → include.
        //    lastChatAt is only set for direct chats (group messages are skipped),
        //    so this naturally excludes people who only share a group with the user.
        //    Require waName too so we have something to display.
        if (lastChatAt && c.waName) return true;
        // ③ Everything else (group-only participants, phone-only contacts, etc.) → exclude.
        return false;
      })
      .map((c) => ({
        ...c,
        // Prefer phone address-book name; fall back to WhatsApp push-name.
        name: c.name?.trim() || c.waName?.trim() || null,
        lastChatAt: this._chatActivity.get(c.number),
      }))
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.sock.sendMessage(jid, {
      video: buffer,
      mimetype: "video/mp4",
      gifPlayback: false,
      ptv: false,
      ...(seconds ? { seconds } : {}),
      ...(caption ? { caption } : {}),
    } as any);
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

    // Wait before re-initializing so WhatsApp's servers have time to fully
    // process the logout. Scanning a new QR immediately after disconnecting
    // can cause WA to reject the pairing with "Couldn't connect, try again"
    // because the server-side session hasn't been invalidated yet.
    this._reconnectTimer = setTimeout(() => void this.initialize(), 5_000);
  }
}

export const baileysService = new BaileysService("default");

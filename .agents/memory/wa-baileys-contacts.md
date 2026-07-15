---
name: Baileys contact name vs notify + persistence
description: Correct filtering of saved-only contacts; contacts.json versioning to avoid stale data.
---

In Baileys' contact model:
- `c.name` = name saved in the connected phone's address book (the only trustworthy field for "is this contact saved?")
- `c.notify` = pushName the *remote* user chose for themselves; present even for numbers the local user never saved

**Why notify caused the bug:** Using `c.name ?? c.notify` as a fallback caused unsaved numbers to appear as named contacts.

**How to apply:** Only trust `c.name`. Never fall back to `notify` for filtering. Code in `artifacts/api-server/src/services/baileys.ts`.

---

## contacts.json versioning (critical)

Old v1 format: plain `SyncedContact[]` array — stored notify-sourced names, so reloading it re-introduced unsaved contacts even after the filtering fix.

**Fix applied:** contacts.json now uses `{ v: 2, contacts: [...] }`. On load, if the file is a plain array (v1) or has `v < 2`, it is deleted and ignored so WhatsApp re-syncs clean data.

**Why:** The stale file bypassed all in-memory filtering fixes. Simply fixing `upsertContacts` was not enough — the persisted file had to be versioned and old files discarded.

**How to apply:** Any future change to what constitutes a "valid" contact name must bump `BaileysService.CONTACTS_FILE_VERSION` so cached files are invalidated. Also: the `upsertContacts` merge logic must distinguish `c.name === undefined` (field absent → keep existing) from `c.name === null` (explicit clear → wipe), which is done with `c.name !== undefined ? (c.name?.trim() || null) : (existing?.name ?? null)`.

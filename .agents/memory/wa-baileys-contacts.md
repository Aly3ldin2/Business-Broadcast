---
name: Baileys contact name vs notify field
description: Why `notify` must not be used as a fallback when filtering WhatsApp contacts down to "actually saved in phone" contacts.
---

In Baileys' contact model:
- `c.name` reflects a name actually saved in the connected phone's address book.
- `c.notify` is the pushName the *remote* user chose for themselves (shown in chats/groups), and is present even for numbers the local user never saved.

**Why:** Using `c.name ?? c.notify` as a fallback caused unsaved numbers (people merely chatted with) to appear as "named" contacts in the import list, which the user considered incorrect/unwanted.

**How to apply:** When filtering a contact list down to "contacts the user actually saved", only trust `c.name`. Do not fall back to `notify` for that purpose. Also watch for stale cached names: if `upsertContacts`-style merge logic keeps an `existing.name` when a later update has `name: null`, a since-unsaved contact can keep appearing until the value is explicitly cleared or the process restarts — normalize/trim names and let explicit null updates clear the cache if this matters for correctness.

---
name: Baileys phone-number-as-name filter
description: WhatsApp sends formatted phone numbers as contact names for unsaved contacts; must detect and handle them specially to preserve persistence.
---

# Baileys phone-number-as-name filter

## The rule
When Baileys fires `contacts.upsert` / `contacts.update` / `messaging-history.set`, unsaved contacts arrive with `c.name` set to a **formatted phone number** like `"+20∙∙∙∙∙∙∙∙31"` (middle-dots U+00B7/U+22C5/U+2219 mask the middle digits).

These are NOT real address-book names. `c.name` being set does NOT mean the contact is saved.

## Detect pattern
```typescript
const looksLikePhone = (name: string) =>
  /^\+[\d\s\u00b7\u22c5\u2219.()\-]+$/.test(name);
```

## Correct handling in upsertContacts
When `looksLikePhone` is true:
- **Keep existing name** (`existing?.name ?? null`) — do NOT set to null.
- This preserves real saved names loaded from contacts.json across server restarts and WhatsApp reconnects.
- Setting to null would wipe the persisted name on every reconnect (core persistence bug).

## In loadPersistedContacts
Apply same filter when loading from disk — reject entries where name matches the phone pattern.

## Why
On reconnect (not fresh pairing), WhatsApp re-sends all contacts via `contacts.upsert`, including saved ones. For the saved ones it sends the real name; for unsaved ones it sends the masked number. If we treated the masked number as an explicit "wipe" signal, we'd clear real names loaded from contacts.json on every reconnect.

## How to apply
In `upsertContacts()`, after computing `rawName`, run `looksLikePhone` check. Use `existing?.name ?? null` when true, not null.
In `loadPersistedContacts()`, skip entries where name matches the pattern.

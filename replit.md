# WhatsApp Broadcast Manager

A free, self-hosted broadcast system for WhatsApp Business API — lets businesses send bulk messages to contact lists, manage templates, and track delivery stats.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/wa-broadcast run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/wa-broadcast)
- API: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — DB schema (contacts, lists, templates, broadcasts, settings)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/wa-broadcast/src/pages/` — React pages

## Architecture decisions

- WhatsApp messages are sent server-side via Meta Graph API v19.0 at send time (no queue)
- Access tokens are stored in the DB (settings table) — single-tenant app
- Templates are locally tracked; approval status must be managed in Meta Business Manager
- CSV import is parsed client-side before sending to server
- The `accessToken` field is masked (first 8 chars + "...") in GET /settings responses

## Product

- Dashboard: live stats (contacts, lists, broadcasts, delivery/read rates)
- Contacts: add, edit, delete, search, import from CSV
- Lists: group contacts into named lists for targeted broadcasts
- Templates: create and manage WhatsApp message templates
- Broadcasts: create campaigns (template + list), send via API, track per-message delivery
- Settings: enter WhatsApp API credentials with built-in setup guide + test connection

## Gotchas

- WhatsApp templates must be approved by Meta before they can be sent in broadcasts
- The free tier of WhatsApp Business Cloud API allows 1,000 business-initiated conversations/month
- Phone numbers must be in international format without "+" (e.g. 201012345678)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

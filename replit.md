# WhatsApp Broadcast Manager

A full-stack web application for sending bulk WhatsApp messages via the Meta Business API. Manages contacts, lists, message templates, and broadcast campaigns.

## Stack

- **Backend:** Node.js 22, Express 5, Drizzle ORM + SQLite (`node:sqlite`)
- **Frontend:** React 19, Vite 7, Tailwind CSS 4, TanStack Query, Wouter
- **Monorepo:** pnpm workspaces (`artifacts/`, `lib/`)
- **WhatsApp:** `@whiskeysockets/baileys` + Meta Business API v19.0

## How to Run

Two workflows run in parallel:

| Workflow | Command | Port |
|---|---|---|
| `API Server` | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/wa-broadcast: web` | `pnpm --filter @workspace/wa-broadcast run dev` | 26033 |

The Vite dev server proxies `/api` requests to the API server via `API_PORT=8080` (set as a shared env var).

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_PORT` | Yes (dev) | — | Port of the API server; used by Vite proxy. Set to `8080`. |
| `DATABASE_PATH` | No | `app.db` | Path to the SQLite database file |
| `BAILEYS_AUTH_PATH` | No | `.baileys_auth/` | Directory for WhatsApp session storage |
| `PORT` | Yes (API) | — | Port the API server listens on |
| `SMTP_HOST` | No | — | SMTP server for password-reset emails |
| `SMTP_PORT` | No | — | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password (secret) |
| `SMTP_FROM` | No | — | From address for system emails |
| `SESSION_SECRET` | Yes | — | Secret for signing session cookies (stored as Replit Secret) |

## Project Structure

```
artifacts/
  api-server/   — Express backend (builds to dist/index.mjs via esbuild)
  wa-broadcast/ — React + Vite frontend
  mockup-sandbox/ — Canvas component preview server
lib/
  db/           — Drizzle ORM schema + SQLite access
  api-zod/      — Zod schemas generated from OpenAPI spec
  api-client-react/ — TanStack Query hooks generated via Orval
  api-spec/     — openapi.yaml source of truth
scripts/
  post-merge.sh — Runs `pnpm install --frozen-lockfile` after task merges
```

## Notes

- Requires **Node.js 22+** — uses `node:sqlite` (built-in, experimental in Node 22)
- First run shows an account-creation screen to set up the admin user
- WhatsApp tokens and Meta API credentials are stored in the SQLite database after setup
- Production deployment uses a persistent disk at `/data/app.db` (see `render.yaml`)

## User Preferences

_None recorded yet._

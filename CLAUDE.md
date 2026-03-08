# Floo — Local Finance Dashboard

## Architecture
- **Next.js app** that runs locally on the user's machine
- Uses SQLite (better-sqlite3) to store all financial data including Plaid access tokens
- Communicates with a remote server API (`NEXT_PUBLIC_SERVER_URL`) for Plaid + Stripe operations
- The server never stores access tokens — they live only in the local SQLite DB

## Key Commands
- `pnpm dev` — Start on port 3000
- `pnpm build` — Production build
- `pnpm db:push` — Push Drizzle schema to SQLite

## Project Structure
- `src/app/` — Next.js App Router pages and server actions
- `src/components/` — React components (Plaid Link, sync button, etc.)
- `src/db/` — Drizzle schema, connection, and query helpers (SQLite)
- `src/lib/api.ts` — Server API client with typed requests/responses
- `src/lib/sync.ts` — Transaction/balance/investment sync logic

## Data Flow
1. User pays $3 via Stripe → gets API key + 1 credit
2. Credit spent to create Plaid Link token (via server)
3. Plaid Link connects bank → public token exchanged for access token (via server)
4. Access token stored locally in SQLite
5. Sync: local app sends access token to server → server calls Plaid → raw data returned → stored locally

## Important Conventions
- SQLite DB at `data/finance.db` (gitignored)
- Plaid amounts: positive = money out, negative = money in
- All dates stored as ISO 8601 strings
- Transaction sync uses cursor-based pagination
- Holdings: delete + re-insert per connection on each sync
- Uses Next.js Server Actions for all SQLite operations
- `better-sqlite3` requires `serverExternalPackages` in next.config.ts
- Path alias: `@/*` maps to `./src/*`

## Environment Variables
- `NEXT_PUBLIC_SERVER_URL` — URL of the server API (default: `http://localhost:3001`)

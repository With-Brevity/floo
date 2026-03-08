# Finance Platform

## Architecture
- **Monorepo** with pnpm workspaces: `apps/server`, `apps/web`, `packages/shared`
- **Server** (`apps/server`): Deployed to Vercel. API-only Next.js app proxying Plaid + Stripe. Uses Vercel Postgres via Drizzle. Never stores access tokens.
- **Web** (`apps/web`): Runs locally on user's machine. Full Next.js app with SQLite (better-sqlite3) storing all financial data including access tokens.
- **Shared** (`packages/shared`): TypeScript types used by both apps.

## Key Commands
- `pnpm dev:server` — Start server on port 3001
- `pnpm dev:web` — Start local web app on port 3000
- `pnpm db:push:server` — Push Drizzle schema to Vercel Postgres
- `pnpm db:push:web` — Push Drizzle schema to SQLite

## Data Flow
1. User pays $3 via Stripe → gets API key + 1 credit
2. Credit spent to create Plaid Link token
3. Plaid Link connects bank → public token exchanged for access token via server
4. Access token stored locally in SQLite (server never stores it)
5. Sync: local app sends access token to server → server calls Plaid → raw data returned → stored locally

## Important Conventions
- Server CORS allows `http://localhost:3000` (configurable via `ALLOWED_ORIGIN`)
- SQLite DB at `apps/web/data/finance.db` (gitignored)
- Plaid amounts: positive = money out, negative = money in
- All dates stored as ISO 8601 strings
- Transaction sync uses cursor-based pagination (`/transactions/sync`)
- Holdings: delete + re-insert per connection on each sync
- Local app uses Next.js Server Actions for all SQLite operations
- `better-sqlite3` requires `serverExternalPackages` in next.config.ts

## Environment Variables
- Server: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `POSTGRES_URL`, `ALLOWED_ORIGIN`
- Web: `NEXT_PUBLIC_SERVER_URL`

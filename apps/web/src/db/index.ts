import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";
import * as schema from "./schema";

const dataDir = join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "finance.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrency
sqlite.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    transactions_cursor TEXT,
    last_synced_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL REFERENCES connections(id),
    name TEXT NOT NULL,
    official_name TEXT,
    type TEXT NOT NULL,
    subtype TEXT,
    mask TEXT,
    current_balance REAL,
    available_balance REAL,
    iso_currency_code TEXT,
    last_updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    merchant_name TEXT,
    category TEXT,
    pending INTEGER NOT NULL DEFAULT 0,
    iso_currency_code TEXT
  );

  CREATE TABLE IF NOT EXISTS securities (
    id TEXT PRIMARY KEY,
    name TEXT,
    ticker_symbol TEXT,
    type TEXT,
    close_price REAL,
    close_price_as_of TEXT,
    iso_currency_code TEXT
  );

  CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    security_id TEXT NOT NULL REFERENCES securities(id),
    quantity REAL NOT NULL,
    cost_basis REAL,
    institution_value REAL,
    iso_currency_code TEXT,
    last_updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export { schema };

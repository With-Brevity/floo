import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const connections = sqliteTable("connections", {
  id: text("id").primaryKey(), // Plaid item_id
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  transactionsCursor: text("transactions_cursor"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), // Plaid account_id
  connectionId: text("connection_id")
    .notNull()
    .references(() => connections.id),
  name: text("name").notNull(),
  officialName: text("official_name"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  mask: text("mask"),
  currentBalance: real("current_balance"),
  availableBalance: real("available_balance"),
  isoCurrencyCode: text("iso_currency_code"),
  lastUpdatedAt: text("last_updated_at"),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), // Plaid transaction_id
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  category: text("category"), // JSON string of category array
  pending: integer("pending", { mode: "boolean" }).notNull().default(false),
  isoCurrencyCode: text("iso_currency_code"),
});

export const securities = sqliteTable("securities", {
  id: text("id").primaryKey(), // Plaid security_id
  name: text("name"),
  tickerSymbol: text("ticker_symbol"),
  type: text("type"),
  closePrice: real("close_price"),
  closePriceAsOf: text("close_price_as_of"),
  isoCurrencyCode: text("iso_currency_code"),
});

export const holdings = sqliteTable("holdings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  securityId: text("security_id")
    .notNull()
    .references(() => securities.id),
  quantity: real("quantity").notNull(),
  costBasis: real("cost_basis"),
  institutionValue: real("institution_value"),
  isoCurrencyCode: text("iso_currency_code"),
  lastUpdatedAt: text("last_updated_at"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

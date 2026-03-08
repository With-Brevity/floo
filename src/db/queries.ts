import { eq, desc, sql, and, gte, lte, like } from "drizzle-orm";
import { db, schema } from ".";

// ---- Settings ----
export function getSetting(key: string): string | null {
  const [row] = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .limit(1)
    .all();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
    .run();
}

export function getApiKey(): string | null {
  return getSetting("api_key");
}

export function setApiKey(key: string) {
  setSetting("api_key", key);
}

// ---- Connections ----
export function getConnections() {
  return db.select().from(schema.connections).all();
}

export function getConnection(id: string) {
  const [row] = db
    .select()
    .from(schema.connections)
    .where(eq(schema.connections.id, id))
    .limit(1)
    .all();
  return row ?? null;
}

export function upsertConnection(data: {
  id: string;
  accessToken: string;
  institutionId: string;
  institutionName: string;
}) {
  db.insert(schema.connections)
    .values({
      ...data,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: schema.connections.id,
      set: {
        accessToken: data.accessToken,
        institutionId: data.institutionId,
        institutionName: data.institutionName,
      },
    })
    .run();
}

export function updateConnectionCursor(id: string, cursor: string) {
  db.update(schema.connections)
    .set({
      transactionsCursor: cursor,
      lastSyncedAt: new Date().toISOString(),
    })
    .where(eq(schema.connections.id, id))
    .run();
}

export function deleteConnection(id: string) {
  // Delete in order: holdings, transactions, accounts, then connection
  const accts = db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.connectionId, id))
    .all();

  for (const acct of accts) {
    db.delete(schema.holdings)
      .where(eq(schema.holdings.accountId, acct.id))
      .run();
    db.delete(schema.transactions)
      .where(eq(schema.transactions.accountId, acct.id))
      .run();
  }
  db.delete(schema.accounts)
    .where(eq(schema.accounts.connectionId, id))
    .run();
  db.delete(schema.connections)
    .where(eq(schema.connections.id, id))
    .run();
}

// ---- Accounts ----
export function getAccounts() {
  return db.select().from(schema.accounts).all();
}

export function getAccountsByConnection(connectionId: string) {
  return db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.connectionId, connectionId))
    .all();
}

export function upsertAccount(data: {
  id: string;
  connectionId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string | null;
}) {
  db.insert(schema.accounts)
    .values({ ...data, lastUpdatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: schema.accounts.id,
      set: {
        name: data.name,
        officialName: data.officialName,
        type: data.type,
        subtype: data.subtype,
        mask: data.mask,
        currentBalance: data.currentBalance,
        availableBalance: data.availableBalance,
        isoCurrencyCode: data.isoCurrencyCode,
        lastUpdatedAt: new Date().toISOString(),
      },
    })
    .run();
}

// ---- Transactions ----
export function getTransactions(opts?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  accountId?: string;
}) {
  const conditions = [];
  if (opts?.startDate)
    conditions.push(gte(schema.transactions.date, opts.startDate));
  if (opts?.endDate)
    conditions.push(lte(schema.transactions.date, opts.endDate));
  if (opts?.search)
    conditions.push(like(schema.transactions.name, `%${opts.search}%`));
  if (opts?.accountId)
    conditions.push(eq(schema.transactions.accountId, opts.accountId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(schema.transactions)
    .where(where)
    .orderBy(desc(schema.transactions.date))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0)
    .all();
}

export function getTransactionCount(opts?: {
  startDate?: string;
  endDate?: string;
  search?: string;
  accountId?: string;
}) {
  const conditions = [];
  if (opts?.startDate)
    conditions.push(gte(schema.transactions.date, opts.startDate));
  if (opts?.endDate)
    conditions.push(lte(schema.transactions.date, opts.endDate));
  if (opts?.search)
    conditions.push(like(schema.transactions.name, `%${opts.search}%`));
  if (opts?.accountId)
    conditions.push(eq(schema.transactions.accountId, opts.accountId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [row] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.transactions)
    .where(where)
    .all();
  return row?.count ?? 0;
}

export function upsertTransaction(data: {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  pending: boolean;
  isoCurrencyCode: string | null;
}) {
  db.insert(schema.transactions)
    .values(data)
    .onConflictDoUpdate({
      target: schema.transactions.id,
      set: {
        accountId: data.accountId,
        amount: data.amount,
        date: data.date,
        name: data.name,
        merchantName: data.merchantName,
        category: data.category,
        pending: data.pending,
        isoCurrencyCode: data.isoCurrencyCode,
      },
    })
    .run();
}

export function deleteTransaction(id: string) {
  db.delete(schema.transactions)
    .where(eq(schema.transactions.id, id))
    .run();
}

// ---- Securities ----
export function upsertSecurity(data: {
  id: string;
  name: string | null;
  tickerSymbol: string | null;
  type: string | null;
  closePrice: number | null;
  closePriceAsOf: string | null;
  isoCurrencyCode: string | null;
}) {
  db.insert(schema.securities)
    .values(data)
    .onConflictDoUpdate({
      target: schema.securities.id,
      set: {
        name: data.name,
        tickerSymbol: data.tickerSymbol,
        type: data.type,
        closePrice: data.closePrice,
        closePriceAsOf: data.closePriceAsOf,
        isoCurrencyCode: data.isoCurrencyCode,
      },
    })
    .run();
}

export function getSecurities() {
  return db.select().from(schema.securities).all();
}

// ---- Holdings ----
export function getHoldings() {
  return db.select().from(schema.holdings).all();
}

export function replaceHoldingsForConnection(
  connectionId: string,
  holdingsData: Array<{
    accountId: string;
    securityId: string;
    quantity: number;
    costBasis: number | null;
    institutionValue: number | null;
    isoCurrencyCode: string | null;
  }>
) {
  // Delete existing holdings for accounts in this connection
  const accts = db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.connectionId, connectionId))
    .all();

  for (const acct of accts) {
    db.delete(schema.holdings)
      .where(eq(schema.holdings.accountId, acct.id))
      .run();
  }

  // Insert new holdings
  for (const h of holdingsData) {
    db.insert(schema.holdings)
      .values({
        ...h,
        lastUpdatedAt: new Date().toISOString(),
      })
      .run();
  }
}

// ---- Dashboard Aggregations ----
export function getNetWorth() {
  const [row] = db
    .select({
      total: sql<number>`COALESCE(SUM(current_balance), 0)`,
    })
    .from(schema.accounts)
    .all();
  return row?.total ?? 0;
}

export function getSpendingByCategory(startDate?: string, endDate?: string) {
  const conditions = [sql`${schema.transactions.amount} > 0`]; // positive = spending
  if (startDate) conditions.push(gte(schema.transactions.date, startDate));
  if (endDate) conditions.push(lte(schema.transactions.date, endDate));

  return db
    .select({
      category: schema.transactions.category,
      total: sql<number>`SUM(${schema.transactions.amount})`,
    })
    .from(schema.transactions)
    .where(and(...conditions))
    .groupBy(schema.transactions.category)
    .orderBy(desc(sql`SUM(${schema.transactions.amount})`))
    .all();
}

export function getRecentTransactions(limit = 10) {
  return db
    .select()
    .from(schema.transactions)
    .orderBy(desc(schema.transactions.date))
    .limit(limit)
    .all();
}

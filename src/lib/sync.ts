import { ApiClient } from "./api";
import * as queries from "@/db/queries";

export async function syncConnection(apiClient: ApiClient, connectionId: string) {
  const connection = queries.getConnection(connectionId);
  if (!connection) throw new Error(`Connection ${connectionId} not found`);

  // Sync balances first to ensure accounts exist (needed for FK constraints)
  await syncBalances(apiClient, connection);

  await Promise.all([
    syncTransactions(apiClient, connection),
    syncInvestments(apiClient, connection),
  ]);
}

async function syncTransactions(
  apiClient: ApiClient,
  connection: { id: string; accessToken: string; transactionsCursor: string | null }
) {
  let cursor = connection.transactionsCursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await apiClient.syncTransactions(
      connection.accessToken,
      cursor
    );

    // Process added transactions
    for (const t of result.added) {
      queries.upsertTransaction({
        id: t.transaction_id,
        accountId: t.account_id,
        amount: t.amount,
        date: t.date,
        name: t.name,
        merchantName: t.merchant_name,
        category: t.category ? JSON.stringify(t.category) : null,
        pending: t.pending,
        isoCurrencyCode: t.iso_currency_code,
      });
    }

    // Process modified transactions
    for (const t of result.modified) {
      queries.upsertTransaction({
        id: t.transaction_id,
        accountId: t.account_id,
        amount: t.amount,
        date: t.date,
        name: t.name,
        merchantName: t.merchant_name,
        category: t.category ? JSON.stringify(t.category) : null,
        pending: t.pending,
        isoCurrencyCode: t.iso_currency_code,
      });
    }

    // Process removed transactions
    for (const t of result.removed) {
      queries.deleteTransaction(t.transaction_id);
    }

    cursor = result.nextCursor;
    hasMore = result.hasMore;

    // Save cursor after each page
    queries.updateConnectionCursor(connection.id, result.nextCursor);
  }
}

async function syncBalances(
  apiClient: ApiClient,
  connection: { id: string; accessToken: string }
) {
  const result = await apiClient.getBalances(connection.accessToken);

  for (const a of result.accounts) {
    queries.upsertAccount({
      id: a.account_id,
      connectionId: connection.id,
      name: a.name,
      officialName: a.official_name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
      currentBalance: a.balances.current,
      availableBalance: a.balances.available,
      isoCurrencyCode: a.balances.iso_currency_code,
    });
  }
}

async function syncInvestments(
  apiClient: ApiClient,
  connection: { id: string; accessToken: string }
) {
  try {
    const result = await apiClient.getInvestments(connection.accessToken);

    // Upsert accounts from investments response
    for (const a of result.accounts) {
      queries.upsertAccount({
        id: a.account_id,
        connectionId: connection.id,
        name: a.name,
        officialName: a.official_name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        currentBalance: a.balances.current,
        availableBalance: a.balances.available,
        isoCurrencyCode: a.balances.iso_currency_code,
      });
    }

    // Upsert securities
    for (const s of result.securities) {
      queries.upsertSecurity({
        id: s.security_id,
        name: s.name,
        tickerSymbol: s.ticker_symbol,
        type: s.type,
        closePrice: s.close_price,
        closePriceAsOf: s.close_price_as_of,
        isoCurrencyCode: s.iso_currency_code,
      });
    }

    // Replace holdings for this connection
    queries.replaceHoldingsForConnection(
      connection.id,
      result.holdings.map((h) => ({
        accountId: h.account_id,
        securityId: h.security_id,
        quantity: h.quantity,
        costBasis: h.cost_basis,
        institutionValue: h.institution_value,
        isoCurrencyCode: h.iso_currency_code,
      }))
    );
  } catch {
    // Investments may not be available for all connections — that's fine
    console.log(
      `No investment data for connection ${connection.id} (this is normal for non-investment accounts)`
    );
  }
}

export async function syncAllConnections(apiClient: ApiClient) {
  const connections = queries.getConnections();
  const results = [];

  for (const conn of connections) {
    try {
      await syncConnection(apiClient, conn.id);
      results.push({ id: conn.id, success: true });
    } catch (error) {
      results.push({
        id: conn.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

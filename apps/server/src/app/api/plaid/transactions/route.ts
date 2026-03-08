import { getPlaidClient } from "@/lib/plaid";
import { validateApiKey, corsResponse, optionsResponse } from "@/lib/auth";
import type {
  TransactionsSyncRequest,
  TransactionsSyncResponse,
  ApiError,
} from "@finance/shared/src/types";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const plaidClient = getPlaidClient();
  const user = await validateApiKey(request);
  if (!user) {
    return corsResponse({ error: "Invalid API key" } satisfies ApiError, 401);
  }

  const { accessToken, cursor } =
    (await request.json()) as TransactionsSyncRequest;
  if (!accessToken) {
    return corsResponse(
      { error: "Missing accessToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    ...(cursor ? { cursor } : {}),
  });

  const data = response.data;
  return corsResponse({
    added: data.added.map((t) => ({
      transaction_id: t.transaction_id,
      account_id: t.account_id,
      amount: t.amount,
      date: t.date,
      name: t.name,
      merchant_name: t.merchant_name ?? null,
      category: t.category,
      pending: t.pending,
      iso_currency_code: t.iso_currency_code,
    })),
    modified: data.modified.map((t) => ({
      transaction_id: t.transaction_id,
      account_id: t.account_id,
      amount: t.amount,
      date: t.date,
      name: t.name,
      merchant_name: t.merchant_name ?? null,
      category: t.category,
      pending: t.pending,
      iso_currency_code: t.iso_currency_code,
    })),
    removed: data.removed.map((t) => ({
      transaction_id: t.transaction_id!,
    })),
    nextCursor: data.next_cursor,
    hasMore: data.has_more,
  } satisfies TransactionsSyncResponse);
}

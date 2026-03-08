import { getPlaidClient } from "@/lib/plaid";
import { validateApiKey, corsResponse, optionsResponse } from "@/lib/auth";
import type {
  BalancesRequest,
  BalancesResponse,
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

  const { accessToken } = (await request.json()) as BalancesRequest;
  if (!accessToken) {
    return corsResponse(
      { error: "Missing accessToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
  });

  return corsResponse({
    accounts: response.data.accounts.map((a) => ({
      account_id: a.account_id,
      name: a.name,
      official_name: a.official_name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
      balances: {
        current: a.balances.current,
        available: a.balances.available,
        iso_currency_code: a.balances.iso_currency_code,
      },
    })),
  } satisfies BalancesResponse);
}

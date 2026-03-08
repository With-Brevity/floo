import { getPlaidClient } from "@/lib/plaid";
import { validateApiKey, corsResponse, optionsResponse } from "@/lib/auth";
import type {
  InvestmentsRequest,
  InvestmentsResponse,
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

  const { accessToken } = (await request.json()) as InvestmentsRequest;
  if (!accessToken) {
    return corsResponse(
      { error: "Missing accessToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.investmentsHoldingsGet({
    access_token: accessToken,
  });

  const data = response.data;
  return corsResponse({
    holdings: data.holdings.map((h) => ({
      account_id: h.account_id,
      security_id: h.security_id,
      quantity: h.quantity,
      cost_basis: h.cost_basis,
      institution_value: h.institution_value,
      iso_currency_code: h.iso_currency_code,
    })),
    securities: data.securities.map((s) => ({
      security_id: s.security_id,
      name: s.name,
      ticker_symbol: s.ticker_symbol,
      type: s.type,
      close_price: s.close_price,
      close_price_as_of: s.close_price_as_of,
      iso_currency_code: s.iso_currency_code,
    })),
    accounts: data.accounts.map((a) => ({
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
  } satisfies InvestmentsResponse);
}

import { getPlaidClient } from "@/lib/plaid";
import { validateApiKey, corsResponse, optionsResponse } from "@/lib/auth";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
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

  const { publicToken } = (await request.json()) as ExchangeTokenRequest;
  if (!publicToken) {
    return corsResponse(
      { error: "Missing publicToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return corsResponse({
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  } satisfies ExchangeTokenResponse);
}

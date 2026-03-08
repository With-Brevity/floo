import { CountryCode, Products } from "plaid";
import { eq } from "drizzle-orm";
import { getPlaidClient } from "@/lib/plaid";
import { validateApiKey, corsResponse, optionsResponse } from "@/lib/auth";
import { getDb, schema } from "@/db";
import type { LinkTokenResponse, ApiError } from "@finance/shared/src/types";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const plaidClient = getPlaidClient();
  const db = getDb();
  const user = await validateApiKey(request);
  if (!user) {
    return corsResponse({ error: "Invalid API key" } satisfies ApiError, 401);
  }

  if (user.credits < 1) {
    return corsResponse({ error: "No credits remaining. Purchase another connection." } satisfies ApiError, 403);
  }

  // Deduct 1 credit
  await db
    .update(schema.users)
    .set({ credits: user.credits - 1 })
    .where(eq(schema.users.id, user.id));

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "Finance Dashboard",
    products: [Products.Transactions],
    optional_products: [Products.Investments],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return corsResponse({
    linkToken: response.data.link_token,
  } satisfies LinkTokenResponse);
}

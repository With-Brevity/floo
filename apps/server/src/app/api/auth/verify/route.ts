import { validateApiKey, corsResponse, optionsResponse } from "@/lib/auth";
import type { VerifyResponse, ApiError } from "@finance/shared/src/types";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const user = await validateApiKey(request);
  if (!user) {
    return corsResponse({ error: "Invalid API key" } satisfies ApiError, 401);
  }

  return corsResponse({
    valid: true,
    credits: user.credits,
    email: user.email,
  } satisfies VerifyResponse);
}

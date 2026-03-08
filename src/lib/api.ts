const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export class ApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `API error: ${res.status}`);
    }

    return res.json();
  }

  verify() {
    return this.request<{
      valid: boolean;
      subscriptionStatus: string;
      currentPeriodEnd: string | null;
      email: string;
    }>("/api/auth/verify");
  }

  createPortalSession(returnUrl: string) {
    return this.request<{ url: string }>("/api/stripe/portal", {
      method: "POST",
      body: JSON.stringify({ returnUrl }),
    });
  }

  createLinkToken() {
    return this.request<{ linkToken: string }>("/api/plaid/link-token", {
      method: "POST",
    });
  }

  exchangeToken(publicToken: string, institutionId: string, institutionName: string) {
    return this.request<{ accessToken: string; itemId: string }>(
      "/api/plaid/exchange-token",
      {
        method: "POST",
        body: JSON.stringify({ publicToken, institutionId, institutionName }),
      }
    );
  }

  syncTransactions(accessToken: string, cursor?: string) {
    return this.request<{
      added: Array<{
        transaction_id: string;
        account_id: string;
        amount: number;
        date: string;
        name: string;
        merchant_name: string | null;
        category: string[] | null;
        pending: boolean;
        iso_currency_code: string | null;
      }>;
      modified: Array<{
        transaction_id: string;
        account_id: string;
        amount: number;
        date: string;
        name: string;
        merchant_name: string | null;
        category: string[] | null;
        pending: boolean;
        iso_currency_code: string | null;
      }>;
      removed: Array<{ transaction_id: string }>;
      nextCursor: string;
      hasMore: boolean;
    }>("/api/plaid/transactions", {
      method: "POST",
      body: JSON.stringify({ accessToken, cursor }),
    });
  }

  getBalances(accessToken: string) {
    return this.request<{
      accounts: Array<{
        account_id: string;
        name: string;
        official_name: string | null;
        type: string;
        subtype: string | null;
        mask: string | null;
        balances: {
          current: number | null;
          available: number | null;
          iso_currency_code: string | null;
        };
      }>;
    }>("/api/plaid/balances", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    });
  }

  getInvestments(accessToken: string) {
    return this.request<{
      holdings: Array<{
        account_id: string;
        security_id: string;
        quantity: number;
        cost_basis: number | null;
        institution_value: number | null;
        iso_currency_code: string | null;
      }>;
      securities: Array<{
        security_id: string;
        name: string | null;
        ticker_symbol: string | null;
        type: string | null;
        close_price: number | null;
        close_price_as_of: string | null;
        iso_currency_code: string | null;
      }>;
      accounts: Array<{
        account_id: string;
        name: string;
        official_name: string | null;
        type: string;
        subtype: string | null;
        mask: string | null;
        balances: {
          current: number | null;
          available: number | null;
          iso_currency_code: string | null;
        };
      }>;
    }>("/api/plaid/investments", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    });
  }
}

// Non-authenticated endpoints
export async function createCheckoutSession(
  returnUrl: string,
  email?: string
) {
  const res = await fetch(`${SERVER_URL}/api/stripe/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnUrl, email }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json() as Promise<{ url: string }>;
}

export async function claimApiKey(sessionId: string) {
  const res = await fetch(`${SERVER_URL}/api/auth/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json() as Promise<{
    apiKey: string;
    email: string;
    subscriptionStatus: string;
  }>;
}

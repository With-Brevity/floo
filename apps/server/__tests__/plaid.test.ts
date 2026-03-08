import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TEST_USER,
  PLAID_TRANSACTION,
  PLAID_ACCOUNT,
  PLAID_HOLDING,
  PLAID_SECURITY,
} from "./helpers/fixtures";

const mockDb = vi.hoisted(() => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    set: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.returning.mockReturnValue(chain);

  return {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
});

const mockPlaid = vi.hoisted(() => ({
  linkTokenCreate: vi.fn(),
  itemPublicTokenExchange: vi.fn(),
  transactionsSync: vi.fn(),
  accountsBalanceGet: vi.fn(),
  investmentsHoldingsGet: vi.fn(),
}));

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof import("@/db")>("@/db");
  return {
    ...actual,
    getDb: () => mockDb,
  };
});

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
  }),
}));

vi.mock("@/lib/plaid", () => ({
  getPlaidClient: () => mockPlaid,
}));

let app: typeof import("../api/index").app;

function authHeaders() {
  return {
    Authorization: `Bearer ${TEST_USER.apiKey}`,
    "Content-Type": "application/json",
  };
}

beforeEach(async () => {
  const mod = await import("../api/index");
  app = mod.app;

  mockDb.select.mockReturnValue(mockDb._chain as any);
  mockDb.insert.mockReturnValue(mockDb._chain as any);
  mockDb.update.mockReturnValue(mockDb._chain as any);
  Object.values(mockDb._chain).forEach((fn) => {
    (fn as ReturnType<typeof vi.fn>).mockReturnValue(mockDb._chain);
  });
});

function mockAuthUser(user = TEST_USER) {
  mockDb._chain.limit.mockResolvedValueOnce([user]);
}

describe("POST /api/plaid/link-token", () => {
  it("returns 401 when no auth is provided", async () => {
    const res = await app.request("/api/plaid/link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has 0 credits", async () => {
    mockAuthUser({ ...TEST_USER, credits: 0 });
    const res = await app.request("/api/plaid/link-token", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("No credits remaining");
  });

  it("returns 200 with linkToken and deducts credit", async () => {
    mockAuthUser();
    mockPlaid.linkTokenCreate.mockResolvedValueOnce({
      data: { link_token: "link-sandbox-test-token" },
    });

    const res = await app.request("/api/plaid/link-token", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.linkToken).toBe("link-sandbox-test-token");
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe("POST /api/plaid/exchange-token", () => {
  it("returns 400 when publicToken is missing", async () => {
    mockAuthUser();
    const res = await app.request("/api/plaid/exchange-token", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing publicToken");
  });

  it("returns 200 with accessToken and itemId", async () => {
    mockAuthUser();
    mockPlaid.itemPublicTokenExchange.mockResolvedValueOnce({
      data: {
        access_token: "access-sandbox-test",
        item_id: "item_test_123",
      },
    });

    const res = await app.request("/api/plaid/exchange-token", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ publicToken: "public-sandbox-test" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBe("access-sandbox-test");
    expect(body.itemId).toBe("item_test_123");
  });
});

describe("POST /api/plaid/transactions", () => {
  it("returns 400 when accessToken is missing", async () => {
    mockAuthUser();
    const res = await app.request("/api/plaid/transactions", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing accessToken");
  });

  it("returns 200 and transforms transactions without cursor", async () => {
    mockAuthUser();
    mockPlaid.transactionsSync.mockResolvedValueOnce({
      data: {
        added: [PLAID_TRANSACTION],
        modified: [],
        removed: [{ transaction_id: "txn_removed" }],
        next_cursor: "cursor_abc",
        has_more: false,
      },
    });

    const res = await app.request("/api/plaid/transactions", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ accessToken: "access-sandbox-test" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.added).toHaveLength(1);
    expect(body.added[0].transaction_id).toBe("txn_1");
    expect(body.added[0].merchant_name).toBe("Starbucks");
    expect(body.removed).toEqual([{ transaction_id: "txn_removed" }]);
    expect(body.nextCursor).toBe("cursor_abc");
    expect(body.hasMore).toBe(false);
    expect(mockPlaid.transactionsSync).toHaveBeenCalledWith({
      access_token: "access-sandbox-test",
    });
  });

  it("passes cursor to Plaid when provided", async () => {
    mockAuthUser();
    mockPlaid.transactionsSync.mockResolvedValueOnce({
      data: {
        added: [],
        modified: [],
        removed: [],
        next_cursor: "cursor_next",
        has_more: false,
      },
    });

    await app.request("/api/plaid/transactions", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        accessToken: "access-sandbox-test",
        cursor: "cursor_prev",
      }),
    });
    expect(mockPlaid.transactionsSync).toHaveBeenCalledWith({
      access_token: "access-sandbox-test",
      cursor: "cursor_prev",
    });
  });

  it("coalesces null/undefined merchant_name to null", async () => {
    mockAuthUser();
    const txnNoMerchant = { ...PLAID_TRANSACTION, merchant_name: undefined };
    mockPlaid.transactionsSync.mockResolvedValueOnce({
      data: {
        added: [txnNoMerchant],
        modified: [],
        removed: [],
        next_cursor: "cursor_x",
        has_more: false,
      },
    });

    const res = await app.request("/api/plaid/transactions", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ accessToken: "access-sandbox-test" }),
    });
    const body = await res.json();
    expect(body.added[0].merchant_name).toBeNull();
  });
});

describe("POST /api/plaid/balances", () => {
  it("returns 400 when accessToken is missing", async () => {
    mockAuthUser();
    const res = await app.request("/api/plaid/balances", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing accessToken");
  });

  it("returns 200 with transformed accounts and balances", async () => {
    mockAuthUser();
    mockPlaid.accountsBalanceGet.mockResolvedValueOnce({
      data: { accounts: [PLAID_ACCOUNT] },
    });

    const res = await app.request("/api/plaid/balances", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ accessToken: "access-sandbox-test" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].account_id).toBe("acc_1");
    expect(body.accounts[0].balances.current).toBe(1000);
    expect(body.accounts[0].balances.available).toBe(950);
  });
});

describe("POST /api/plaid/investments", () => {
  it("returns 400 when accessToken is missing", async () => {
    mockAuthUser();
    const res = await app.request("/api/plaid/investments", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing accessToken");
  });

  it("returns 200 with transformed holdings, securities, and accounts", async () => {
    mockAuthUser();
    mockPlaid.investmentsHoldingsGet.mockResolvedValueOnce({
      data: {
        holdings: [PLAID_HOLDING],
        securities: [PLAID_SECURITY],
        accounts: [PLAID_ACCOUNT],
      },
    });

    const res = await app.request("/api/plaid/investments", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ accessToken: "access-sandbox-test" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.holdings).toHaveLength(1);
    expect(body.holdings[0].security_id).toBe("sec_1");
    expect(body.securities).toHaveLength(1);
    expect(body.securities[0].ticker_symbol).toBe("AAPL");
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].account_id).toBe("acc_1");
  });
});

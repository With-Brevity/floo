import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_USER, TEST_PAYMENT } from "./helpers/fixtures";

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

const mockStripe = vi.hoisted(() => ({
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
}));

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof import("@/db")>("@/db");
  return {
    ...actual,
    getDb: () => mockDb,
  };
});

vi.mock("@/lib/stripe", () => ({
  getStripe: () => mockStripe,
}));

vi.mock("@/lib/plaid", () => ({
  getPlaidClient: () => ({}),
}));

let app: typeof import("../api/index").app;

beforeEach(async () => {
  const mod = await import("../api/index");
  app = mod.app;

  // Re-setup chain after mockReset
  mockDb.select.mockReturnValue(mockDb._chain as any);
  mockDb.insert.mockReturnValue(mockDb._chain as any);
  mockDb.update.mockReturnValue(mockDb._chain as any);
  Object.values(mockDb._chain).forEach((fn) => {
    (fn as ReturnType<typeof vi.fn>).mockReturnValue(mockDb._chain);
  });
});

describe("GET /api/auth/verify", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request("/api/auth/verify");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid API key");
  });

  it("returns 401 for wrong format (Basic auth)", async () => {
    const res = await app.request("/api/auth/verify", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when API key is not found in DB", async () => {
    mockDb._chain.limit.mockResolvedValueOnce([]);
    const res = await app.request("/api/auth/verify", {
      headers: { Authorization: "Bearer fin_nonexistent" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with user data for a valid key", async () => {
    mockDb._chain.limit.mockResolvedValueOnce([TEST_USER]);
    const res = await app.request("/api/auth/verify", {
      headers: { Authorization: `Bearer ${TEST_USER.apiKey}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      valid: true,
      credits: TEST_USER.credits,
      email: TEST_USER.email,
    });
  });
});

describe("POST /api/auth/claim", () => {
  it("returns 400 when sessionId is missing", async () => {
    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing sessionId");
  });

  it("returns 400 when payment_status is not paid", async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      payment_status: "unpaid",
    });
    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "cs_test_123" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Payment not completed");
  });

  it("returns 200 with apiKey when user found by stripeCustomerId", async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      payment_status: "paid",
      customer: TEST_USER.stripeCustomerId,
    });
    mockDb._chain.limit.mockResolvedValueOnce([TEST_USER]);
    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "cs_test_123" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.apiKey).toBe(TEST_USER.apiKey);
    expect(body.email).toBe(TEST_USER.email);
    expect(body.credits).toBe(TEST_USER.credits);
  });

  it("returns 200 with apiKey when user found via payment lookup", async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      payment_status: "paid",
      customer: "cus_unknown",
    });
    // First query: user by stripeCustomerId → not found
    mockDb._chain.limit.mockResolvedValueOnce([]);
    // Second query: payment by sessionId → found
    mockDb._chain.limit.mockResolvedValueOnce([TEST_PAYMENT]);
    // Third query: user by payment.userId → found
    mockDb._chain.limit.mockResolvedValueOnce([TEST_USER]);

    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: TEST_PAYMENT.stripeSessionId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.apiKey).toBe(TEST_USER.apiKey);
  });

  it("returns 404 when neither user nor payment found", async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      payment_status: "paid",
      customer: "cus_unknown",
    });
    mockDb._chain.limit.mockResolvedValueOnce([]);
    mockDb._chain.limit.mockResolvedValueOnce([]);

    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "cs_nonexistent" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Payment not yet processed");
  });

  it("returns 404 when payment exists but user not found", async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      payment_status: "paid",
      customer: "cus_unknown",
    });
    mockDb._chain.limit.mockResolvedValueOnce([]);
    mockDb._chain.limit.mockResolvedValueOnce([TEST_PAYMENT]);
    mockDb._chain.limit.mockResolvedValueOnce([]);

    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: TEST_PAYMENT.stripeSessionId }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found");
  });
});

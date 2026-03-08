import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { TEST_USER } from "./helpers/fixtures";

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

  mockDb.select.mockReturnValue(mockDb._chain as any);
  mockDb.insert.mockReturnValue(mockDb._chain as any);
  mockDb.update.mockReturnValue(mockDb._chain as any);
  Object.values(mockDb._chain).forEach((fn) => {
    (fn as ReturnType<typeof vi.fn>).mockReturnValue(mockDb._chain);
  });
});

describe("POST /api/stripe/checkout", () => {
  it("returns 400 when returnUrl is missing", async () => {
    const res = await app.request("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing returnUrl");
  });

  it("returns 200 with session url when email is provided", async () => {
    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session123",
    });
    const res = await app.request("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        returnUrl: "http://localhost:3000",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/session123");
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "test@example.com",
      })
    );
  });

  it("returns 200 without customer_email when email is omitted", async () => {
    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session456",
    });
    const res = await app.request("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnUrl: "http://localhost:3000" }),
    });
    expect(res.status).toBe(200);
    const createArg = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(createArg).not.toHaveProperty("customer_email");
  });
});

describe("POST /api/stripe/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await app.request("/api/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing signature");
  });

  it("returns 400 when signature is invalid", async () => {
    mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("Invalid signature");
    });
    const res = await app.request("/api/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "bad_sig",
      },
      body: "{}",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid signature");
  });

  it("returns 200 with received:true when payment_status is not paid", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          payment_status: "unpaid",
          customer: "cus_test",
        },
      },
    });
    const res = await app.request("/api/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "valid_sig",
      },
      body: "{}",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("creates new user and payment for new customer", async () => {
    vi.spyOn(crypto, "randomBytes").mockReturnValueOnce(
      Buffer.from("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", "hex") as any
    );

    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_new_session",
          payment_status: "paid",
          customer: "cus_new",
          customer_details: { email: "new@example.com" },
          amount_total: 300,
        },
      },
    });

    // User lookup by stripeCustomerId → not found
    mockDb._chain.limit.mockResolvedValueOnce([]);
    // Insert new user → returning
    const newUser = {
      ...TEST_USER,
      id: "new-user-id",
      stripeCustomerId: "cus_new",
      email: "new@example.com",
      apiKey: "fin_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      credits: 1,
    };
    mockDb._chain.returning.mockResolvedValueOnce([newUser]);

    const res = await app.request("/api/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "valid_sig",
      },
      body: "{}",
    });
    expect(res.status).toBe(200);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("increments credits for existing customer", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_existing_session",
          payment_status: "paid",
          customer: TEST_USER.stripeCustomerId,
          customer_details: { email: TEST_USER.email },
          amount_total: 300,
        },
      },
    });

    // User lookup → found
    mockDb._chain.limit.mockResolvedValueOnce([TEST_USER]);

    const res = await app.request("/api/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "valid_sig",
      },
      body: "{}",
    });
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb._chain.set).toHaveBeenCalledWith({
      credits: TEST_USER.credits + 1,
    });
  });
});

import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { CountryCode, Products } from "plaid";
import { getDb, schema } from "../src/db";
import { getPlaidClient } from "../src/lib/plaid";
import { getStripe } from "../src/lib/stripe";
import { authMiddleware, type UserRow } from "../src/lib/auth";
import type {
  VerifyResponse,
  ClaimResponse,
  CheckoutResponse,
  LinkTokenResponse,
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  TransactionsSyncRequest,
  TransactionsSyncResponse,
  BalancesRequest,
  BalancesResponse,
  InvestmentsRequest,
  InvestmentsResponse,
  ApiError,
} from "@finance/shared/src/types";

type Env = {
  Variables: {
    user: UserRow;
  };
};

const app = new Hono<Env>().basePath("/api");

app.use(
  "/*",
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// GET /api/auth/verify
app.get("/auth/verify", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json({
    valid: true,
    credits: user.credits,
    email: user.email,
  } satisfies VerifyResponse);
});

// POST /api/auth/claim
app.post("/auth/claim", async (c) => {
  const stripe = getStripe();
  const db = getDb();
  const { sessionId } = await c.req.json();
  if (!sessionId) {
    return c.json({ error: "Missing sessionId" } satisfies ApiError, 400);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return c.json(
      { error: "Payment not completed" } satisfies ApiError,
      400
    );
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.stripeCustomerId, session.customer as string))
    .limit(1);

  if (!user) {
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.stripeSessionId, sessionId))
      .limit(1);

    if (!payment) {
      return c.json(
        {
          error:
            "Payment not yet processed. Please try again in a moment.",
        } satisfies ApiError,
        404
      );
    }

    const [userByPayment] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payment.userId))
      .limit(1);

    if (!userByPayment) {
      return c.json({ error: "User not found" } satisfies ApiError, 404);
    }

    return c.json({
      apiKey: userByPayment.apiKey,
      email: userByPayment.email,
      credits: userByPayment.credits,
    } satisfies ClaimResponse);
  }

  return c.json({
    apiKey: user.apiKey,
    email: user.email,
    credits: user.credits,
  } satisfies ClaimResponse);
});

// POST /api/stripe/checkout
app.post("/stripe/checkout", async (c) => {
  const stripe = getStripe();
  const { email, returnUrl } = await c.req.json();

  if (!returnUrl) {
    return c.json({ error: "Missing returnUrl" } satisfies ApiError, 400);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Plaid Bank Connection",
            description:
              "Connect one bank account to your finance dashboard",
          },
          unit_amount: parseInt(
            process.env.STRIPE_PRICE_AMOUNT || "300"
          ),
        },
        quantity: 1,
      },
    ],
    ...(email ? { customer_email: email } : {}),
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
  });

  return c.json({ url: session.url! } satisfies CheckoutResponse);
});

// POST /api/stripe/webhook
app.post("/stripe/webhook", async (c) => {
  const stripe = getStripe();
  const db = getDb();
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");

  if (!sig) {
    return c.json({ error: "Missing signature" }, 400);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status !== "paid") {
      return c.json({ received: true });
    }

    const customerId = session.customer as string;
    const email =
      session.customer_details?.email ||
      session.customer_email ||
      "unknown";

    let [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.stripeCustomerId, customerId))
      .limit(1);

    if (existingUser) {
      await db
        .update(schema.users)
        .set({ credits: existingUser.credits + 1 })
        .where(eq(schema.users.id, existingUser.id));
    } else {
      const apiKey = `fin_${randomBytes(16).toString("hex")}`;
      [existingUser] = await db
        .insert(schema.users)
        .values({
          email,
          stripeCustomerId: customerId,
          apiKey,
          credits: 1,
        })
        .returning();
    }

    await db.insert(schema.payments).values({
      userId: existingUser.id,
      stripeSessionId: session.id,
      amount: session.amount_total || 300,
      status: "completed",
    });
  }

  return c.json({ received: true });
});

// POST /api/plaid/link-token
app.post("/plaid/link-token", authMiddleware, async (c) => {
  const plaidClient = getPlaidClient();
  const db = getDb();
  const user = c.get("user");

  if (user.credits < 1) {
    return c.json(
      {
        error: "No credits remaining. Purchase another connection.",
      } satisfies ApiError,
      403
    );
  }

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

  return c.json({
    linkToken: response.data.link_token,
  } satisfies LinkTokenResponse);
});

// POST /api/plaid/exchange-token
app.post("/plaid/exchange-token", authMiddleware, async (c) => {
  const plaidClient = getPlaidClient();
  const { publicToken } = (await c.req.json()) as ExchangeTokenRequest;
  if (!publicToken) {
    return c.json(
      { error: "Missing publicToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return c.json({
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  } satisfies ExchangeTokenResponse);
});

// POST /api/plaid/transactions
app.post("/plaid/transactions", authMiddleware, async (c) => {
  const plaidClient = getPlaidClient();
  const { accessToken, cursor } =
    (await c.req.json()) as TransactionsSyncRequest;
  if (!accessToken) {
    return c.json(
      { error: "Missing accessToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    ...(cursor ? { cursor } : {}),
  });

  const data = response.data;
  return c.json({
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
});

// POST /api/plaid/balances
app.post("/plaid/balances", authMiddleware, async (c) => {
  const plaidClient = getPlaidClient();
  const { accessToken } = (await c.req.json()) as BalancesRequest;
  if (!accessToken) {
    return c.json(
      { error: "Missing accessToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
  });

  return c.json({
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
});

// POST /api/plaid/investments
app.post("/plaid/investments", authMiddleware, async (c) => {
  const plaidClient = getPlaidClient();
  const { accessToken } = (await c.req.json()) as InvestmentsRequest;
  if (!accessToken) {
    return c.json(
      { error: "Missing accessToken" } satisfies ApiError,
      400
    );
  }

  const response = await plaidClient.investmentsHoldingsGet({
    access_token: accessToken,
  });

  const data = response.data;
  return c.json({
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
});

export default handle(app);

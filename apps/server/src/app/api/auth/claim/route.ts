import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getStripe } from "@/lib/stripe";
import { corsResponse, optionsResponse } from "@/lib/auth";
import type { ClaimResponse, ApiError } from "@finance/shared/src/types";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const db = getDb();
  const { sessionId } = await request.json();
  if (!sessionId) {
    return corsResponse(
      { error: "Missing sessionId" } satisfies ApiError,
      400
    );
  }

  // Verify the Stripe session
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return corsResponse({ error: "Payment not completed" } satisfies ApiError, 400);
  }

  // Find the user created by the webhook
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.stripeCustomerId, session.customer as string))
    .limit(1);

  if (!user) {
    // Webhook may not have fired yet — check by session
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.stripeSessionId, sessionId))
      .limit(1);

    if (!payment) {
      return corsResponse(
        { error: "Payment not yet processed. Please try again in a moment." } satisfies ApiError,
        404
      );
    }

    const [userByPayment] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payment.userId))
      .limit(1);

    if (!userByPayment) {
      return corsResponse({ error: "User not found" } satisfies ApiError, 404);
    }

    return corsResponse({
      apiKey: userByPayment.apiKey,
      email: userByPayment.email,
      credits: userByPayment.credits,
    } satisfies ClaimResponse);
  }

  return corsResponse({
    apiKey: user.apiKey,
    email: user.email,
    credits: user.credits,
  } satisfies ClaimResponse);
}

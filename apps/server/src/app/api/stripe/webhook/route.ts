import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getDb, schema } from "@/db";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const db = getDb();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status !== "paid") {
      return Response.json({ received: true });
    }

    const customerId = session.customer as string;
    const email = session.customer_details?.email || session.customer_email || "unknown";

    // Check if user already exists with this Stripe customer
    let [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.stripeCustomerId, customerId))
      .limit(1);

    if (existingUser) {
      // Add credit to existing user
      await db
        .update(schema.users)
        .set({ credits: existingUser.credits + 1 })
        .where(eq(schema.users.id, existingUser.id));
    } else {
      // Create new user with API key
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

    // Record the payment
    await db.insert(schema.payments).values({
      userId: existingUser.id,
      stripeSessionId: session.id,
      amount: session.amount_total || 300,
      status: "completed",
    });
  }

  return Response.json({ received: true });
}

import { getStripe } from "@/lib/stripe";
import { corsResponse, optionsResponse } from "@/lib/auth";
import type { CheckoutResponse, ApiError } from "@finance/shared/src/types";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const { email, returnUrl } = await request.json();

  if (!returnUrl) {
    return corsResponse({ error: "Missing returnUrl" } satisfies ApiError, 400);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Plaid Bank Connection",
            description: "Connect one bank account to your finance dashboard",
          },
          unit_amount: parseInt(process.env.STRIPE_PRICE_AMOUNT || "300"),
        },
        quantity: 1,
      },
    ],
    ...(email ? { customer_email: email } : {}),
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
  });

  return corsResponse({ url: session.url! } satisfies CheckoutResponse);
}

"use client";

import { useState } from "react";
import { ApiClient, getSignInUrl } from "@/lib/api";
import { PlaidLinkButton } from "./plaid-link";
import { saveConnectionAction } from "@/app/actions";

interface ConnectBankButtonProps {
  sessionToken: string | null;
  subscriptionStatus: string;
}

export function ConnectBankButton({
  sessionToken,
  subscriptionStatus,
}: ConnectBankButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "checkout" | "linking" | "done" | "error"
  >("idle");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!sessionToken) {
      // Not signed in — redirect to sign in
      window.location.href = getSignInUrl();
      return;
    }

    const client = new ApiClient(sessionToken);

    if (subscriptionStatus !== "active") {
      // Signed in but not subscribed — redirect to Stripe checkout
      setStatus("checkout");
      try {
        const { url } = await client.createCheckoutSession(
          window.location.origin
        );
        window.location.href = url;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to start checkout"
        );
        setStatus("error");
      }
      return;
    }

    // Subscribed — request link token
    setStatus("linking");
    try {
      const { linkToken: token } = await client.createLinkToken();
      setLinkToken(token);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to create link token"
      );
      setStatus("error");
    }
  }

  async function handlePlaidSuccess(
    publicToken: string,
    metadata: {
      institution?: { institution_id: string; name: string } | null;
    }
  ) {
    try {
      const client = new ApiClient(sessionToken!);
      const result = await client.exchangeToken(
        publicToken,
        metadata.institution?.institution_id || "unknown",
        metadata.institution?.name || "Unknown Institution"
      );

      await saveConnectionAction({
        id: result.itemId,
        accessToken: result.accessToken,
        institutionId: metadata.institution?.institution_id || "unknown",
        institutionName:
          metadata.institution?.name || "Unknown Institution",
      });

      setStatus("done");
      setLinkToken(null);
      window.location.reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to connect bank"
      );
      setStatus("error");
    }
  }

  if (linkToken) {
    return (
      <PlaidLinkButton
        linkToken={linkToken}
        onSuccess={handlePlaidSuccess}
        onExit={() => {
          setLinkToken(null);
          setStatus("idle");
        }}
      />
    );
  }

  const label = !sessionToken
    ? "Sign in"
    : subscriptionStatus !== "active"
    ? "Subscribe ($5/mo)"
    : "Connect Bank";

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={status === "checkout" || status === "linking"}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {status === "checkout"
          ? "Redirecting to payment..."
          : status === "linking"
          ? "Preparing..."
          : label}
      </button>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      {status === "done" && (
        <p className="text-success text-sm mt-2">Bank connected!</p>
      )}
    </div>
  );
}

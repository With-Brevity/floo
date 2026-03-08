"use client";

import { useState } from "react";
import { createCheckoutSession, ApiClient } from "@/lib/api";
import { PlaidLinkButton } from "./plaid-link";
import { saveConnectionAction } from "@/app/actions";

export function ConnectBankButton({ apiKey }: { apiKey: string | null }) {
  const [status, setStatus] = useState<
    "idle" | "checkout" | "linking" | "done" | "error"
  >("idle");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!apiKey) {
      // No API key — redirect to Stripe checkout
      setStatus("checkout");
      try {
        const { url } = await createCheckoutSession(
          `${window.location.origin}/settings`
        );
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start checkout");
        setStatus("error");
      }
      return;
    }

    // Have API key — request link token
    setStatus("linking");
    try {
      const client = new ApiClient(apiKey);
      const { linkToken: token } = await client.createLinkToken();
      setLinkToken(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create link token");
      setStatus("error");
    }
  }

  async function handlePlaidSuccess(publicToken: string, metadata: { institution?: { institution_id: string; name: string } | null }) {
    try {
      const client = new ApiClient(apiKey!);
      const result = await client.exchangeToken(
        publicToken,
        metadata.institution?.institution_id || "unknown",
        metadata.institution?.name || "Unknown Institution"
      );

      await saveConnectionAction({
        id: result.itemId,
        accessToken: result.accessToken,
        institutionId: metadata.institution?.institution_id || "unknown",
        institutionName: metadata.institution?.name || "Unknown Institution",
      });

      setStatus("done");
      setLinkToken(null);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect bank");
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
          : !apiKey
          ? "Connect Bank ($3)"
          : "Connect Bank"}
      </button>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      {status === "done" && (
        <p className="text-success text-sm mt-2">Bank connected!</p>
      )}
    </div>
  );
}

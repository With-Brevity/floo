"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  claimApiKeyAction,
  saveApiKeyAction,
  openBillingPortalAction,
} from "@/app/actions";

interface Connection {
  id: string;
  institutionName: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export function SettingsClient({
  initialApiKey,
  connections,
}: {
  initialApiKey: string | null;
  connections: Connection[];
}) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [apiKey, setApiKey] = useState(initialApiKey || "");
  const [status, setStatus] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Auto-claim API key if redirected from Stripe
  useEffect(() => {
    if (sessionId && !initialApiKey) {
      setClaiming(true);
      setStatus("Claiming API key...");
      claimApiKeyAction(sessionId)
        .then((result) => {
          setApiKey(result.apiKey);
          setStatus("API key claimed! Subscription active.");
          // Remove session_id from URL
          window.history.replaceState({}, "", "/settings");
        })
        .catch((e) => {
          setStatus(`Error: ${e.message}`);
        })
        .finally(() => setClaiming(false));
    }
  }, [sessionId, initialApiKey]);

  async function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault();
    await saveApiKeyAction(apiKey);
    setStatus("API key saved!");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* API Key */}
      <div className="border border-border rounded-xl p-6 bg-card space-y-4">
        <h2 className="font-semibold">API Key</h2>
        <p className="text-sm text-muted-foreground">
          Your API key authenticates requests to the finance server. Get one by
          subscribing ($5/mo for unlimited bank connections).
        </p>
        <form onSubmit={handleSaveApiKey} className="flex gap-2">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="fin_..."
            className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={claiming}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </form>
        {status && (
          <p
            className={`text-sm ${
              status.startsWith("Error") ? "text-destructive" : "text-success"
            }`}
          >
            {status}
          </p>
        )}
      </div>

      {/* Billing */}
      {initialApiKey && (
        <div className="border border-border rounded-xl p-6 bg-card space-y-4">
          <h2 className="font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Manage your subscription, update payment method, or cancel.
          </p>
          <button
            onClick={async () => {
              try {
                const { url } = await openBillingPortalAction(window.location.href);
                window.location.href = url;
              } catch (e) {
                setStatus(
                  `Error: ${e instanceof Error ? e.message : "Failed to open billing portal"}`
                );
              }
            }}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            Manage Billing
          </button>
        </div>
      )}

      {/* Connections */}
      <div className="border border-border rounded-xl p-6 bg-card space-y-4">
        <h2 className="font-semibold">Connected Accounts</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bank accounts connected yet.
          </p>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">
                    {conn.institutionName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(conn.createdAt).toLocaleDateString()}
                    {conn.lastSyncedAt &&
                      ` | Last sync: ${new Date(
                        conn.lastSyncedAt
                      ).toLocaleString()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

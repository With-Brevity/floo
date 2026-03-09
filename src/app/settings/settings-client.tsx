"use client";

import { useState } from "react";
import {
  openBillingPortalAction,
  signOutAction,
  clearAllDataAction,
  refreshSubscriptionAction,
} from "@/app/actions";
import { getSignInUrl } from "@/lib/api";

interface Connection {
  id: string;
  institutionName: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export function SettingsClient({
  isSignedIn,
  email,
  name,
  subscriptionStatus,
  connections,
}: {
  isSignedIn: boolean;
  email: string | null;
  name: string | null;
  subscriptionStatus: string;
  connections: Connection[];
}) {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account */}
      <div className="border border-border rounded-xl p-6 bg-card space-y-4">
        <h2 className="font-semibold">Account</h2>
        {isSignedIn ? (
          <>
            <div className="text-sm space-y-1">
              {name && <p className="font-medium">{name}</p>}
              {email && (
                <p className="text-muted-foreground">{email}</p>
              )}
              <p className="text-muted-foreground">
                Subscription:{" "}
                <span className="capitalize">{subscriptionStatus}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await refreshSubscriptionAction();
                    setStatus("Subscription status refreshed.");
                  } catch (e) {
                    setStatus(
                      `Error: ${e instanceof Error ? e.message : "Failed to refresh"}`
                    );
                  }
                }}
                className="px-4 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                Refresh Status
              </button>
              <button
                onClick={async () => {
                  await signOutAction();
                  window.location.href = "/";
                }}
                className="px-4 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in with GitHub to get started.
            </p>
            <a
              href={getSignInUrl()}
              className="inline-block px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              Sign in with GitHub
            </a>
          </>
        )}
        {status && (
          <p
            className={`text-sm ${
              status.startsWith("Error")
                ? "text-destructive"
                : "text-success"
            }`}
          >
            {status}
          </p>
        )}
      </div>

      {/* Billing */}
      {isSignedIn && subscriptionStatus === "active" && (
        <div className="border border-border rounded-xl p-6 bg-card space-y-4">
          <h2 className="font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Manage your subscription, update payment method, or cancel.
          </p>
          <button
            onClick={async () => {
              try {
                const { url } = await openBillingPortalAction(
                  window.location.href
                );
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
                    Connected{" "}
                    {new Date(conn.createdAt).toLocaleDateString()}
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

      {/* Clear Data */}
      <div className="border border-destructive/30 rounded-xl p-6 bg-card space-y-4">
        <h2 className="font-semibold">Clear All Data</h2>
        <p className="text-sm text-muted-foreground">
          Remove all local data including connections, accounts,
          transactions, and your session. Your Stripe subscription is not
          affected.
        </p>
        <button
          onClick={async () => {
            if (
              !confirm(
                "Are you sure? This will delete all local data (connections, accounts, transactions, and session). Your Stripe subscription will not be cancelled."
              )
            )
              return;
            await clearAllDataAction();
            window.location.href = "/";
          }}
          className="px-4 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}

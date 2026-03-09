"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { claimApiKeyAction } from "@/app/actions";

export function ClaimApiKey() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"idle" | "claiming" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || status !== "idle") return;

    setStatus("claiming");
    claimApiKeyAction(sessionId)
      .then(() => {
        setStatus("done");
        window.history.replaceState({}, "", "/");
        window.location.reload();
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to claim API key");
        setStatus("error");
      });
  }, [sessionId, status]);

  if (!sessionId) return null;

  if (status === "error") {
    return (
      <div className="border border-destructive/30 rounded-xl p-6 bg-card">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-6 bg-card text-center">
      <p className="text-sm text-muted-foreground">
        Activating your subscription...
      </p>
    </div>
  );
}

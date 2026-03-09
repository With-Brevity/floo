"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { exchangeCodeAction } from "@/app/actions";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [status, setStatus] = useState<"exchanging" | "done" | "error">(
    "exchanging"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setStatus("error");
      return;
    }

    if (!code) {
      setError("No auth code provided");
      setStatus("error");
      return;
    }

    exchangeCodeAction(code)
      .then(() => {
        setStatus("done");
        window.location.href = "/";
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to sign in");
        setStatus("error");
      });
  }, [code, searchParams]);

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="border border-destructive/30 rounded-xl p-8 bg-card max-w-md text-center">
          <p className="text-destructive font-medium">Sign in failed</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <a
            href="/"
            className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="border border-border rounded-xl p-8 bg-card text-center">
        <p className="text-sm text-muted-foreground">
          Signing you in...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="border border-border rounded-xl p-8 bg-card text-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

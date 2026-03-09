"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { refreshSubscriptionAction } from "@/app/actions";

export function CheckoutReturn() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (checkout !== "success" || refreshing) return;

    setRefreshing(true);
    refreshSubscriptionAction()
      .then(() => {
        window.history.replaceState({}, "", "/");
        window.location.reload();
      })
      .catch(() => {
        // Subscription may not be processed yet, just clean URL
        window.history.replaceState({}, "", "/");
      });
  }, [checkout, refreshing]);

  if (checkout !== "success") return null;

  return (
    <div className="border border-border rounded-xl p-6 bg-card text-center">
      <p className="text-sm text-muted-foreground">
        Processing your subscription...
      </p>
    </div>
  );
}

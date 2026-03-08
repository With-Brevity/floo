"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { syncAllAction, syncConnectionAction } from "@/app/actions";

export function SyncButton({ connectionId }: { connectionId?: string }) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      if (connectionId) {
        await syncConnectionAction(connectionId);
      } else {
        await syncAllAction();
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync"}
      </button>
      {error && <p className="text-destructive text-sm mt-1">{error}</p>}
    </div>
  );
}

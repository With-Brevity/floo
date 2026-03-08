"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteConnectionAction } from "@/app/actions";

export function DeleteConnectionButton({
  connectionId,
}: {
  connectionId: string;
}) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    await deleteConnectionAction(connectionId);
    window.location.reload();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Delete?</span>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-xs bg-destructive text-white rounded hover:opacity-90"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-xs border border-border rounded hover:bg-accent"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
      title="Remove connection"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

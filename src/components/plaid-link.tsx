"use client";

import { useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";

interface PlaidLinkButtonProps {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: { institution?: { institution_id: string; name: string } | null }) => void;
  onExit: () => void;
}

export function PlaidLinkButton({
  linkToken,
  onSuccess,
  onExit,
}: PlaidLinkButtonProps) {
  const onPlaidSuccess = useCallback(
    (publicToken: string, metadata: { institution?: { institution_id: string; name: string } | null }) => {
      onSuccess(publicToken, metadata);
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit,
  });

  useEffect(() => {
    if (ready) {
      open();
    }
  }, [ready, open]);

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {ready ? "Open Plaid Link" : "Loading..."}
    </button>
  );
}

import { formatCurrency } from "@/lib/utils";
import * as queries from "@/db/queries";
import { ConnectBankButton } from "@/components/connect-bank-button";
import { SyncButton } from "@/components/sync-button";
import { DeleteConnectionButton } from "./delete-connection-button";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  const apiKey = queries.getApiKey();
  const connections = queries.getConnections();
  const accounts = queries.getAccounts();

  // Group accounts by connection
  const accountsByConnection = connections.map((conn) => ({
    connection: conn,
    accounts: accounts.filter((a) => a.connectionId === conn.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex items-center gap-3">
          {connections.length > 0 && <SyncButton />}
          <ConnectBankButton apiKey={apiKey} />
        </div>
      </div>

      {accountsByConnection.length === 0 ? (
        <div className="border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">
            No accounts connected yet. Connect a bank to see your accounts.
          </p>
        </div>
      ) : (
        accountsByConnection.map(({ connection, accounts: accts }) => (
          <div
            key={connection.id}
            className="border border-border rounded-xl bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-semibold">
                  {connection.institutionName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Last synced:{" "}
                  {connection.lastSyncedAt
                    ? new Date(connection.lastSyncedAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SyncButton connectionId={connection.id} />
                <DeleteConnectionButton connectionId={connection.id} />
              </div>
            </div>
            <div className="divide-y divide-border">
              {accts.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No accounts found. Try syncing.
                </p>
              ) : (
                accts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.officialName ||
                          `${account.type}${
                            account.subtype ? ` / ${account.subtype}` : ""
                          }`}
                        {account.mask ? ` (...${account.mask})` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {account.currentBalance != null
                          ? formatCurrency(account.currentBalance)
                          : "—"}
                      </p>
                      {account.availableBalance != null &&
                        account.availableBalance !== account.currentBalance && (
                          <p className="text-xs text-muted-foreground">
                            Available:{" "}
                            {formatCurrency(account.availableBalance)}
                          </p>
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

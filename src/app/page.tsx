import { formatCurrency, formatDate } from "@/lib/utils";
import * as queries from "@/db/queries";
import { ConnectBankButton } from "@/components/connect-bank-button";
import { SyncButton } from "@/components/sync-button";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const apiKey = queries.getApiKey();
  const connections = queries.getConnections();
  const netWorth = queries.getNetWorth();
  const recentTransactions = queries.getRecentTransactions(5);
  const accounts = queries.getAccounts();

  // Calculate totals by account type
  const totalsByType = accounts.reduce(
    (acc, a) => {
      const type = a.type || "other";
      acc[type] = (acc[type] || 0) + (a.currentBalance || 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const spending30d = queries.getSpendingByCategory(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const totalSpending30d = spending30d.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {connections.length > 0 && <SyncButton />}
          <ConnectBankButton apiKey={apiKey} />
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="border border-border rounded-xl p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">
            Welcome to Finance Dashboard
          </h2>
          <p className="text-muted-foreground mb-6">
            Connect your first bank account to get started.
          </p>
          <ConnectBankButton apiKey={apiKey} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-sm text-muted-foreground">Net Worth</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(netWorth)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-sm text-muted-foreground">
                Spending (30 days)
              </p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(totalSpending30d)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {spending30d.length} categor
                {spending30d.length !== 1 ? "ies" : "y"}
              </p>
            </div>
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-sm text-muted-foreground">Connections</p>
              <p className="text-3xl font-bold mt-1">{connections.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {connections
                  .map((c) => c.institutionName)
                  .join(", ")}
              </p>
            </div>
          </div>

          {/* Account breakdown */}
          {Object.keys(totalsByType).length > 0 && (
            <div className="border border-border rounded-xl p-6 bg-card">
              <h2 className="text-lg font-semibold mb-4">
                Balance by Account Type
              </h2>
              <div className="space-y-3">
                {Object.entries(totalsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, total]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm capitalize text-muted-foreground">
                        {type}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="border border-border rounded-xl p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">
              Recent Transactions
            </h2>
            {recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No transactions yet. Sync your accounts to see transactions.
              </p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {t.merchantName || t.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        t.amount < 0
                          ? "text-success"
                          : "text-foreground"
                      }`}
                    >
                      {t.amount < 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

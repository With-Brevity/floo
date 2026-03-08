import { formatCurrency } from "@/lib/utils";
import * as queries from "@/db/queries";
import { SyncButton } from "@/components/sync-button";

export const dynamic = "force-dynamic";

export default function InvestmentsPage() {
  const holdings = queries.getHoldings();
  const securities = queries.getSecurities();
  const accounts = queries.getAccounts();

  const securitiesMap = new Map(securities.map((s) => [s.id, s]));
  const accountsMap = new Map(accounts.map((a) => [a.id, a]));

  const totalValue = holdings.reduce(
    (sum, h) => sum + (h.institutionValue || 0),
    0
  );
  const totalCostBasis = holdings.reduce(
    (sum, h) => sum + (h.costBasis || 0),
    0
  );
  const totalGainLoss = totalValue - totalCostBasis;

  // Enrich holdings with security and account data
  const enrichedHoldings = holdings
    .map((h) => ({
      ...h,
      security: securitiesMap.get(h.securityId),
      account: accountsMap.get(h.accountId),
    }))
    .sort((a, b) => (b.institutionValue || 0) - (a.institutionValue || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investments</h1>
        <SyncButton />
      </div>

      {holdings.length === 0 ? (
        <div className="border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">
            No investment holdings found. Connect an investment account and sync
            to see your portfolio.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-sm text-muted-foreground">Cost Basis</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(totalCostBasis)}
              </p>
            </div>
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  totalGainLoss >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {totalGainLoss >= 0 ? "+" : ""}
                {formatCurrency(totalGainLoss)}
              </p>
            </div>
          </div>

          {/* Holdings table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">Holding</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3 text-right">Shares</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Cost Basis</th>
                  <th className="px-4 py-3 text-right">Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {enrichedHoldings.map((h, i) => {
                  const gainLoss =
                    (h.institutionValue || 0) - (h.costBasis || 0);
                  return (
                    <tr
                      key={i}
                      className="border-t border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">
                          {h.security?.tickerSymbol || h.security?.name || "Unknown"}
                        </p>
                        {h.security?.tickerSymbol && h.security?.name && (
                          <p className="text-xs text-muted-foreground">
                            {h.security.name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {h.account?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {h.quantity.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {h.security?.closePrice != null
                          ? formatCurrency(h.security.closePrice)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        {h.institutionValue != null
                          ? formatCurrency(h.institutionValue)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                        {h.costBasis != null
                          ? formatCurrency(h.costBasis)
                          : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-medium text-right ${
                          gainLoss >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {h.costBasis != null
                          ? `${gainLoss >= 0 ? "+" : ""}${formatCurrency(
                              gainLoss
                            )}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

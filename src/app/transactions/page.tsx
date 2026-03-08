import { formatCurrency, formatDate } from "@/lib/utils";
import * as queries from "@/db/queries";
import { SyncButton } from "@/components/sync-button";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    startDate?: string;
    endDate?: string;
    accountId?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  const filters = {
    search: params.search,
    startDate: params.startDate,
    endDate: params.endDate,
    accountId: params.accountId,
    limit,
    offset,
  };

  const txns = queries.getTransactions(filters);
  const totalCount = queries.getTransactionCount(filters);
  const totalPages = Math.ceil(totalCount / limit);
  const accounts = queries.getAccounts();

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/transactions?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <SyncButton />
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <input
          name="search"
          type="text"
          placeholder="Search transactions..."
          defaultValue={params.search}
          className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          name="startDate"
          type="date"
          defaultValue={params.startDate}
          className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          name="endDate"
          type="date"
          defaultValue={params.endDate}
          className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          name="accountId"
          defaultValue={params.accountId}
          className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.mask ? `(...${a.mask})` : ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          Filter
        </button>
      </form>

      {/* Transaction table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground text-sm"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              txns.map((t) => {
                let categories: string[] = [];
                if (t.category) {
                  try {
                    categories = JSON.parse(t.category);
                  } catch {
                    categories = [t.category];
                  }
                }
                return (
                  <tr
                    key={t.id}
                    className="border-t border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">
                        {t.merchantName || t.name}
                      </p>
                      {t.merchantName && t.merchantName !== t.name && (
                        <p className="text-xs text-muted-foreground">
                          {t.name}
                        </p>
                      )}
                      {t.pending && (
                        <span className="text-xs text-yellow-500">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {categories.join(" > ")}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-medium text-right ${
                        t.amount < 0 ? "text-success" : ""
                      }`}
                    >
                      {t.amount < 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(t.amount))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of{" "}
            {totalCount}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1 border border-border rounded hover:bg-accent"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1 border border-border rounded hover:bg-accent"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

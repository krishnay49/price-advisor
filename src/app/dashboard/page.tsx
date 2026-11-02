import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import Sparkline from "@/components/Sparkline";

type Row = {
  id: string;
  title: string;
  current_price: string | null;
  first_price: string | null;
  platform: string;
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const rows = await query<Row>(
    `SELECT p.id, p.title, p.current_price, p.platform,
            (SELECT price FROM price_history WHERE product_id = p.id ORDER BY scraped_at ASC LIMIT 1) as first_price
     FROM tracked_products t
     JOIN products p ON p.id = t.product_id
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );

  const histories = await Promise.all(
    rows.map(async (r) => {
      const points = await query<{ price: string }>(
        "SELECT price FROM price_history WHERE product_id = $1 ORDER BY scraped_at ASC",
        [r.id]
      );
      return points.map((p) => Number(p.price));
    })
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white mb-1">Tracked products</h1>
        <p className="text-sm text-white/40">
          {rows.length === 0
            ? "You aren't tracking anything yet."
            : `${rows.length} ${rows.length === 1 ? "product" : "products"} monitored daily.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl glass-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass border border-indigo-500/20">
            <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-white/40 text-sm mb-5">Start tracking products to see price changes here.</p>
          <Link
            href="/"
            className="inline-block rounded-xl btn-gradient px-6 py-3 text-sm font-semibold"
          >
            Track your first product
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const current = r.current_price ? Number(r.current_price) : null;
            const first = r.first_price ? Number(r.first_price) : null;
            const change = current != null && first != null ? current - first : null;

            return (
              <Link
                key={r.id}
                href={`/product/${r.id}`}
                className="flex items-center justify-between rounded-2xl glass-card p-5 transition-glass hover:scale-[1.01]"
              >
                <div className="pr-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full bg-gradient-to-r ${
                      r.platform === "amazon" ? "from-amber-500 to-orange-500" :
                      r.platform === "flipkart" ? "from-yellow-400 to-amber-500" :
                      "from-gray-400 to-gray-500"
                    }`} />
                    <span className="text-xs font-medium uppercase tracking-wider text-white/30 capitalize">
                      {r.platform}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {current != null ? (
                      <span className="text-white/60 font-medium">₹{current.toLocaleString("en-IN")}</span>
                    ) : (
                      "Price unknown"
                    )}
                    {change != null && change !== 0 && (
                      <span className={change < 0 ? "text-emerald-400" : "text-red-400"}>
                        {" · "}
                        {change < 0 ? "↓" : "↑"} ₹{Math.abs(change).toLocaleString("en-IN")} since tracked
                      </span>
                    )}
                  </p>
                </div>
                <Sparkline values={histories[i]} down={change != null && change < 0} />
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

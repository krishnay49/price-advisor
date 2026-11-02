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
      <h1 className="font-display text-2xl mb-1">Tracked products</h1>
      <p className="mb-8 text-sm text-ink/60">
        {rows.length === 0
          ? "You aren't tracking anything yet."
          : `${rows.length} ${rows.length === 1 ? "product" : "products"} monitored daily.`}
      </p>

      {rows.length === 0 ? (
        <Link
          href="/"
          className="inline-block rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper"
        >
          Track your first product
        </Link>
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
                className="flex items-center justify-between rounded-lg border border-ink/10 bg-white p-4 hover:border-signal"
              >
                <div className="pr-4">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="mt-1 text-xs text-ink/60">
                    {current != null ? `₹${current.toLocaleString("en-IN")}` : "Price unknown"}
                    {change != null && change !== 0 && (
                      <span className={change < 0 ? "text-signal" : "text-alert"}>
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

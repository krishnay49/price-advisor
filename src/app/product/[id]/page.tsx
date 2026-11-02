import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import PriceChart from "@/components/PriceChart";
import ProductChat from "@/components/ProductChat";
import ComparisonTable from "@/components/ComparisonTable";
import TrackButton from "@/components/TrackButton";
import { notFound } from "next/navigation";

async function getProduct(id: string) {
  const rows = await query<{
    id: string;
    platform: string;
    title: string;
    image_url: string | null;
    current_price: string | null;
    rating: string | null;
    rating_count: number | null;
    source_url: string;
  }>(
    "SELECT id, platform, title, image_url, current_price, rating, rating_count, source_url FROM products WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

async function getPriceHistory(id: string) {
  const rows = await query<{ price: string; scraped_at: string; platform: string }>(
    `WITH ids AS (
       SELECT $1::uuid AS pid
       UNION SELECT matched_product_id FROM product_matches WHERE product_id = $1::uuid
     ),
     best AS (
       SELECT h.product_id FROM price_history h JOIN ids ON ids.pid = h.product_id
       GROUP BY h.product_id
       ORDER BY COUNT(*) DESC, (h.product_id = $1::uuid) DESC
       LIMIT 1
     )
     SELECT h.price, h.scraped_at, p.platform
     FROM price_history h
     JOIN best ON best.product_id = h.product_id
     JOIN products p ON p.id = h.product_id
     ORDER BY h.scraped_at ASC`,
    [id]
  );
  return {
    platform: rows[0]?.platform ?? null,
    points: rows.map((r) => ({ price: Number(r.price), date: r.scraped_at })),
  };
}

async function getListings(id: string, product: Awaited<ReturnType<typeof getProduct>>) {
  const matches = await query<{
    platform: string;
    title: string;
    current_price: string | null;
    rating: string | null;
    source_url: string;
    match_confidence: string;
  }>(
    `SELECT p.platform, p.title, p.current_price, p.rating, p.source_url, m.match_confidence
     FROM product_matches m
     JOIN products p ON p.id = m.matched_product_id
     WHERE m.product_id = $1`,
    [id]
  );

  return [
    {
      platform: product!.platform,
      title: product!.title,
      price: product!.current_price ? Number(product!.current_price) : null,
      rating: product!.rating ? Number(product!.rating) : null,
      url: product!.source_url,
      isSource: true,
      confidence: 1,
    },
    ...matches.map((m) => ({
      platform: m.platform,
      title: m.title,
      price: m.current_price ? Number(m.current_price) : null,
      rating: m.rating ? Number(m.rating) : null,
      url: m.source_url,
      isSource: false,
      confidence: Number(m.match_confidence),
    })),
  ];
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const [historyData, listings, user] = await Promise.all([
    getPriceHistory(id),
    getListings(id, product),
    getCurrentUser(),
  ]);
  const history = historyData.points;

  const isTracked = user
    ? (await query("SELECT 1 FROM tracked_products WHERE user_id = $1 AND product_id = $2", [user.id, id]))
        .length > 0
    : false;

  const lowest = history.length ? Math.min(...history.map((h) => h.price)) : null;
  const highest = history.length ? Math.max(...history.map((h) => h.price)) : null;
  const priced = listings.filter((l) => l.price != null);
  const bestDeal = priced.length ? priced.reduce((a, b) => (b.price! < a.price! ? b : a)) : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <a href={product.source_url} target="_blank" rel="noreferrer" className="text-sm text-signal underline">
            View on original site ↗
          </a>
          <h1 className="font-display text-2xl md:text-3xl mt-2 mb-1">{product.title}</h1>
          {product.rating && (
            <p className="text-ink/60 text-sm">
              {Number(product.rating).toFixed(1)} ★ ({product.rating_count?.toLocaleString("en-IN")} ratings)
            </p>
          )}
        </div>
        <TrackButton productId={product.id} initiallyTracked={isTracked} signedIn={!!user} />
      </div>

      <div className="grid md:grid-cols-3 gap-3 my-10">
        <div className="border border-ink/10 rounded-lg p-4 bg-white">
          <p className="text-ink/50 text-xs uppercase tracking-wide">Best price now</p>
          <p className="font-display text-2xl mt-1">
            {bestDeal?.price != null ? `₹${bestDeal.price.toLocaleString("en-IN")}` : "—"}
          </p>
          {bestDeal && <p className="text-xs text-signal mt-1 capitalize">on {bestDeal.platform}</p>}
        </div>
        <div className="border border-ink/10 rounded-lg p-4 bg-white">
          <p className="text-ink/50 text-xs uppercase tracking-wide">Lowest tracked</p>
          <p className="font-display text-2xl mt-1">{lowest ? `₹${lowest.toLocaleString("en-IN")}` : "—"}</p>
        </div>
        <div className="border border-ink/10 rounded-lg p-4 bg-white">
          <p className="text-ink/50 text-xs uppercase tracking-wide">Highest tracked</p>
          <p className="font-display text-2xl mt-1">{highest ? `₹${highest.toLocaleString("en-IN")}` : "—"}</p>
        </div>
      </div>

      <section className="mb-12">
        <ComparisonTable productId={product.id} initialListings={listings} />
      </section>

      <section className="mb-12">
        <h2 className="font-display text-xl mb-4">
          Price history
          {historyData.platform && (
            <span className="ml-2 text-sm text-ink/50 capitalize">· {historyData.platform}</span>
          )}
        </h2>
        <div className="border border-ink/10 rounded-lg bg-white p-4">
          <PriceChart history={history} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Ask about this product</h2>
        <ProductChat productId={product.id} />
      </section>
    </main>
  );
}
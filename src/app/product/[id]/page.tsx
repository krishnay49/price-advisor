import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import PriceChart from "@/components/PriceChart";
import ProductChat from "@/components/ProductChat";
import ComparisonTable from "@/components/ComparisonTable";
import ReviewsSection from "@/components/ReviewsSection";
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
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <a
            href={product.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View on original site
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white mt-2 mb-1">
            {product.title}
          </h1>
          {product.rating && (
            <p className="text-white/40 text-sm flex items-center gap-1.5">
              <span className="text-amber-400">★</span>
              {Number(product.rating).toFixed(1)}
              <span className="text-white/25">·</span>
              {product.rating_count?.toLocaleString("en-IN")} ratings
            </p>
          )}
        </div>
        <TrackButton productId={product.id} initiallyTracked={isTracked} signedIn={!!user} />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid md:grid-cols-3 gap-4 mb-12">
        <div className="rounded-2xl glass-card p-5">
          <p className="text-white/30 text-xs uppercase tracking-wider font-semibold mb-1">Best price now</p>
          <p className="font-display text-2xl font-bold text-white">
            {bestDeal?.price != null ? `₹${bestDeal.price.toLocaleString("en-IN")}` : "—"}
          </p>
          {bestDeal && (
            <p className="text-xs text-indigo-400 mt-1 capitalize flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              on {bestDeal.platform}
            </p>
          )}
        </div>
        <div className="rounded-2xl glass-card p-5">
          <p className="text-white/30 text-xs uppercase tracking-wider font-semibold mb-1">Lowest tracked</p>
          <p className="font-display text-2xl font-bold text-emerald-400">
            {lowest ? `₹${lowest.toLocaleString("en-IN")}` : "—"}
          </p>
        </div>
        <div className="rounded-2xl glass-card p-5">
          <p className="text-white/30 text-xs uppercase tracking-wider font-semibold mb-1">Highest tracked</p>
          <p className="font-display text-2xl font-bold text-red-400">
            {highest ? `₹${highest.toLocaleString("en-IN")}` : "—"}
          </p>
        </div>
      </div>

      {/* ── Comparison ── */}
      <section className="mb-12">
        <ComparisonTable productId={product.id} initialListings={listings} />
      </section>

      {/* ── Price History ── */}
      <section className="mb-12">
        <h2 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Price history
          {historyData.platform && (
            <span className="text-sm font-normal text-white/30 capitalize">· {historyData.platform}</span>
          )}
        </h2>
        <div className="rounded-2xl glass-card p-5">
          <PriceChart history={history} />
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="mb-12">
        <ReviewsSection productId={product.id} />
      </section>

      {/* ── Chat ── */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Ask about this product
        </h2>
        <ProductChat productId={product.id} />
      </section>
    </main>
  );
}

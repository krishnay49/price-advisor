import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { lookupProduct, saveMatches } from "@/lib/priceSearch";

/**
 * GET  — return already-known matches (fast, reads from product_matches)
 * POST — actively search other platforms for this product and store matches
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query<{
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
     WHERE m.product_id = $1
     ORDER BY p.current_price ASC NULLS LAST`,
    [id]
  );

  const self = await query<{ platform: string; title: string; current_price: string | null; rating: string | null; source_url: string }>(
    "SELECT platform, title, current_price, rating, source_url FROM products WHERE id = $1",
    [id]
  );

  if (!self.length) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const listings = [
    {
      platform: self[0].platform,
      title: self[0].title,
      price: self[0].current_price ? Number(self[0].current_price) : null,
      rating: self[0].rating ? Number(self[0].rating) : null,
      url: self[0].source_url,
      isSource: true,
      confidence: 1,
    },
    ...rows.map((r) => ({
      platform: r.platform,
      title: r.title,
      price: r.current_price ? Number(r.current_price) : null,
      rating: r.rating ? Number(r.rating) : null,
      url: r.source_url,
      isSource: false,
      confidence: Number(r.match_confidence),
    })),
  ];

  const priced = listings.filter((l) => l.price != null);
  const bestDeal = priced.length ? priced.reduce((a, b) => (b.price! < a.price! ? b : a)) : null;

  return NextResponse.json({ listings, bestPlatform: bestDeal?.platform ?? null });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await query<{ platform: string; title: string; source_url: string }>(
    "SELECT platform, title, source_url FROM products WHERE id = $1",
    [id]
  );
  if (!source.length) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let result;
  try {
    result = await lookupProduct(source[0].title);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const saved = await saveMatches(id, source[0].source_url, source[0].platform, result.listings);
  return NextResponse.json({ matchesFound: saved });
}

  const { platform: sourcePlatform, title } = source[0];
  const targets = ALL_PLATFORMS.filter((p) => p !== sourcePlatform);
  const found: Array<{ platform: string; title: string; confidence: number }> = [];

  for (const target of targets) {
    let candidates;
    try {
      candidates = await searchPlatform(target, title);
    } catch {
      continue; // one platform failing shouldn't kill the whole comparison
    }

    // Keep only the best-scoring candidate above the threshold.
    let best: { url: string; title: string; price: number | null; rating: number | null; score: number } | null = null;
    for (const c of candidates) {
      const score = titleMatchScore(title, c.title);
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { url: c.url, title: c.title, price: c.price, rating: c.rating, score };
      }
    }
    if (!best) continue;

    // Upsert the matched listing as its own product row, then link it.
    const inserted = await query<{ id: string }>(
      `INSERT INTO products (platform, source_url, title, current_price, rating, last_scraped_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (source_url) DO UPDATE SET current_price = EXCLUDED.current_price, last_scraped_at = now()
       RETURNING id`,
      [target, best.url, best.title, best.price, best.rating]
    );
    const matchedId = inserted[0].id;

    if (best.price != null) {
      await query("INSERT INTO price_history (product_id, price) VALUES ($1, $2)", [matchedId, best.price]);
    }

    await query(
      `INSERT INTO product_matches (product_id, matched_product_id, match_confidence)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, matched_product_id) DO UPDATE SET match_confidence = EXCLUDED.match_confidence`,
      [id, matchedId, best.score]
    );

    found.push({ platform: target, title: best.title, confidence: best.score });
  }

  return NextResponse.json({ matchesFound: found.length, matches: found });
}

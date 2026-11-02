import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { scrapeProduct } from "@/lib/scraper";

// Call this once a day from Vercel Cron / GitHub Actions scheduled workflow:
//   GET /api/cron/update-prices
// with header:  Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await query<{ id: string; source_url: string }>(
    "SELECT id, source_url FROM products"
  );

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const product of products) {
    try {
      const scraped = await scrapeProduct(product.source_url);
      if (scraped.price != null) {
        await query("INSERT INTO price_history (product_id, price) VALUES ($1, $2)", [
          product.id,
          scraped.price,
        ]);
        await query(
          "UPDATE products SET current_price = $1, last_scraped_at = now() WHERE id = $2",
          [scraped.price, product.id]
        );
      }
      results.push({ id: product.id, ok: true });
    } catch (err) {
      results.push({ id: product.id, ok: false, error: (err as Error).message });
    }
    // Be polite: small delay between requests to reduce rate-limit/block risk.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return NextResponse.json({ updated: results.filter((r) => r.ok).length, total: results.length, results });
}

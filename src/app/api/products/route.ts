import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { lookupProduct, saveMatches, insertHistory } from "@/lib/priceSearch";

function platformOf(url: string): string {
  const host = new URL(url).hostname;
  if (host.includes("amazon.")) return "amazon";
  if (host.includes("flipkart.")) return "flipkart";
  if (host.includes("croma.")) return "croma";
  if (host.includes("reliancedigital.")) return "reliancedigital";
  return "other";
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing 'url' in request body" }, { status: 400 });
  }

  let platform: string;
  try {
    platform = platformOf(url);
  } catch {
    return NextResponse.json({ error: "That does not look like a valid link." }, { status: 400 });
  }

  const existing = await query<{ id: string }>("SELECT id FROM products WHERE source_url = $1", [url]);
  if (existing.length) {
    return NextResponse.json({ productId: existing[0].id, alreadyTracked: true });
  }

  let result;
  try {
    result = await lookupProduct(url);
  } catch (err) {
    return NextResponse.json({ error: `Could not look up this product. (${(err as Error).message})` }, { status: 502 });
  }
  if (!result.title) {
    return NextResponse.json({ error: "Could not identify this product from the link." }, { status: 502 });
  }

  const own = result.listings.find((l) => l.platform === platform);

  const rows = await query<{ id: string }>(
    `INSERT INTO products (platform, source_url, title, brand, image_url, current_price, rating, last_scraped_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING id`,
    [platform, url, result.title, result.brand, result.imageUrl, own?.price ?? null, own?.rating ?? null]
  );
  const productId = rows[0].id;

  if (own) {
    const points = own.history?.length
      ? own.history
      : own.price != null
      ? [{ date: new Date().toISOString(), price: own.price }]
      : [];
    await insertHistory(productId, points, false);
  }
  await saveMatches(productId, url, platform, result.listings);

  return NextResponse.json({ productId, alreadyTracked: false });
}
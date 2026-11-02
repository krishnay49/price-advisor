/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "@/lib/db";
import { titleMatchScore } from "@/lib/matcher";

export type HistoryPoint = { date: string; price: number };

export type Listing = {
  platform: string;
  title: string;
  price: number | null;
  rating: number | null;
  url: string;
  history?: HistoryPoint[];
};

export type LookupResult = {
  title: string;
  brand: string | null;
  imageUrl: string | null;
  listings: Listing[];
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const BASE = "https://api.openwebninja.com/realtime-product-search/v2";

const COMPARISON_SITES = [
  "flipshope", "mysmartprice", "smartprix", "pricebaba", "buyhatke",
  "pricehistory", "compareraja", "pricedekho", "91mobiles",
];

// Product links usually contain the product name, e.g. /samsung-galaxy-s25-ultra-5g-.../p/...
function titleFromSlug(url: string): string | null {
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
    if (["dp", "gp", "p", "s", "search"].includes(first) || !first.includes("-")) return null;
    return decodeURIComponent(first).replace(/[-+]/g, " ").slice(0, 120);
  } catch {
    return null;
  }
}

// Fallback for short links such as amazon.in/dp/ASIN: read the page title.
async function titleFromPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const raw = og ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    if (!raw || /robot check|access denied|captcha/i.test(raw)) return null;
    return raw.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 120);
  } catch {
    return null;
  }
}

function platformFromStore(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("amazon")) return "amazon";
  if (s.includes("flipkart")) return "flipkart";
  if (s.includes("croma")) return "croma";
  if (s.includes("reliance")) return "reliancedigital";
  return s.replace(/\.(com|in|co\.in)$/, "").trim() || "store";
}

function platformOfUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host.includes("amazon.")) return "amazon";
    if (host.includes("flipkart.")) return "flipkart";
    if (host.includes("croma.")) return "croma";
    if (host.includes("reliancedigital.")) return "reliancedigital";
  } catch {}
  return "other";
}

function parsePrice(value: unknown): number | null {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return isFinite(n) && n > 0 ? n : null;
}

function toDate(d: any): Date | null {
  if (d == null || d === "") return null;
  let date: Date;
  if (typeof d === "number" || /^\d+$/.test(String(d))) {
    const n = Number(d);
    date = new Date(n > 1e12 ? n : n * 1000);
  } else {
    date = new Date(String(d));
  }
  return isNaN(date.getTime()) ? null : date;
}

// Accepts several likely shapes: [{date, price}], [[date, price]], or {date: price}.
function normalizeHistory(raw: any): HistoryPoint[] {
  let arr: any[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object") {
    const nested = raw.points ?? raw.data ?? raw.history ?? raw.prices;
    arr = Array.isArray(nested) ? nested : Object.entries(raw);
  }

  const out: HistoryPoint[] = [];
  for (const e of arr) {
    let d: any;
    let p: any;
    if (Array.isArray(e)) [d, p] = e;
    else if (e && typeof e === "object") {
      d = e.date ?? e.timestamp ?? e.time ?? e.day ?? e.t ?? e.x;
      p = e.price ?? e.value ?? e.y;
    }
    const price = parsePrice(p);
    const date = toDate(d);
    if (price && date) out.push({ date: date.toISOString(), price });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function call(path: string, params: Record<string, string>) {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { "x-api-key": process.env.OPENWEBNINJA_KEY ?? "" },
  });
  const json = await res.json();
  if (!res.ok || json.status === "ERROR") {
    throw new Error(json?.error?.message ?? json?.message ?? "Price search failed");
  }
  return json.data;
}

// Finds every store offer (any object with a store_name and price) anywhere in the response.
function collectOffers(node: any, out: any[] = []): any[] {
  if (Array.isArray(node)) {
    for (const item of node) collectOffers(item, out);
  } else if (node && typeof node === "object") {
    if (node.store_name && node.price) out.push(node);
    else for (const value of Object.values(node)) collectOffers(value, out);
  }
  return out;
}

// Last resort: read the price from the pasted page's structured data.
async function priceFromPage(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(m[1]);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const offer = Array.isArray(item?.offers) ? item.offers[0] : item?.offers;
          const price = parsePrice(offer?.price ?? offer?.lowPrice);
          if (price) return price;
        }
      } catch {}
    }
  } catch {}
  return null;
}

// Accepts a product link or a product name. Returns prices and price history
// from many stores using Google Shopping data (India).
export async function lookupProduct(input: string): Promise<LookupResult> {
  const isUrl = /^https?:\/\//i.test(input);
  const queryTitle = isUrl ? titleFromSlug(input) ?? (await titleFromPage(input)) : input;
  if (!queryTitle) {
    throw new Error("Could not read the product name from this link. Try a link that includes the product name.");
  }

  // 1) Find the product. Prefer real catalog products with offers from several stores.
  const search = await call("/search", { q: queryTitle, country: "in", language: "en", limit: "10" });
  const products: any[] = search?.products ?? [];
  if (!products.length) throw new Error("No product found for this link.");

  const scoreOf = (p: any) => {
    const t = String(p.product_title ?? "");
    return (
      titleMatchScore(queryTitle, t) +
      (p.has_multiple_offers ? 0.5 : 0) -
      (/refurbished|renewed|used/i.test(t) ? 0.5 : 0)
    );
  };
  const product = products.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a));
  const title = String(product.product_title ?? queryTitle);

  // 2) Every store's offer with its own price history.
  let offers: any[] = [];
  try {
    const data = await call("/product-price-history-v2", {
      product_id: String(product.product_id),
      country: "in",
      language: "en",
      page: "1",
    });
    offers = Array.isArray(data?.offers) ? data.offers : collectOffers(data);
  } catch (err) {
    console.error("price-history failed, falling back to offers:", err);
    try {
      const data = await call("/product-offers", {
        product_id: String(product.product_id),
        country: "in",
        language: "en",
        page: "1",
      });
      offers = collectOffers(data);
    } catch (err2) {
      console.error("product-offers failed:", err2);
    }
  }

  const productRating = parseFloat(String(product.product_rating ?? ""));
  const rawOffers = offers.length ? offers : [product];

  const all: Listing[] = rawOffers
    .filter((o: any) => o.store_name && o.price)
    .filter((o: any) => !/refurb|renewed|used/i.test(`${o.product_condition ?? ""} ${o.offer_title ?? ""}`))
    .map((o: any) => ({
      platform: platformFromStore(String(o.store_name)),
      title,
      price: parsePrice(o.price),
      rating: isFinite(productRating) ? productRating : null,
      url: String(o.offer_page_url ?? o.link ?? o.url ?? o.product_page_url ?? ""),
      history: normalizeHistory(o.price_history),
    }))
    .filter((l) => l.price != null && l.url && !COMPARISON_SITES.some((s) => l.platform.includes(s)));

  const withHistory = all.filter((l) => l.history && l.history.length).length;
  console.log(`lookupProduct: "${title}" -> ${all.length} offers, ${withHistory} with price history`);
  if (offers.length && all.length && !withHistory) {
    console.log("price_history sample:", JSON.stringify(offers[0]?.price_history)?.slice(0, 400));
  }

  // Drop outliers such as accessories: anything below 40% of the median price.
  const prices = all.map((l) => l.price!).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 0;
  const sane = all.filter((l) => l.price! >= median * 0.4);

  // Cheapest listing per store, cheapest stores first.
  const byStore = new Map<string, Listing>();
  for (const l of sane) {
    const current = byStore.get(l.platform);
    if (!current || l.price! < current.price!) byStore.set(l.platform, l);
  }
  const listings = [...byStore.values()].sort((a, b) => a.price! - b.price!).slice(0, 6);
  if (!listings.length) throw new Error("No prices found for this product.");

  // If the pasted link's store is missing from the offers, look for it in two more ways.
  const sourcePlatform = isUrl ? platformOfUrl(input) : "other";
  if (sourcePlatform !== "other" && !listings.some((l) => l.platform === sourcePlatform)) {
    // a) Ask the API for that store directly.
    try {
      const s = await call("/search", {
        q: queryTitle,
        country: "in",
        language: "en",
        limit: "5",
        stores: sourcePlatform,
      });
      const candidates: any[] = (s?.products ?? []).filter(
        (p: any) => platformFromStore(String(p.store_name ?? "")) === sourcePlatform && parsePrice(p.price)
      );
      if (candidates.length) {
        const best = candidates.reduce((a, b) =>
          titleMatchScore(queryTitle, String(b.product_title ?? "")) >
          titleMatchScore(queryTitle, String(a.product_title ?? ""))
            ? b
            : a
        );
        listings.push({
          platform: sourcePlatform,
          title,
          price: parsePrice(best.price),
          rating: isFinite(productRating) ? productRating : null,
          url: input,
        });
        listings.sort((a, b) => a.price! - b.price!);
      }
    } catch (err) {
      console.error("source store lookup failed:", err);
    }

    // b) Last resort: read the price straight from the pasted page.
    if (!listings.some((l) => l.platform === sourcePlatform)) {
      const pagePrice = await priceFromPage(input);
      console.log("price from pasted page:", pagePrice);
      if (pagePrice) {
        listings.push({
          platform: sourcePlatform,
          title,
          price: pagePrice,
          rating: isFinite(productRating) ? productRating : null,
          url: input,
        });
        listings.sort((a, b) => a.price! - b.price!);
      }
    }
  }

  return { title, brand: null, imageUrl: product.product_photos?.[0] ?? null, listings };
}

// Inserts price points in one query. replace = true clears older points first.
export async function insertHistory(productId: string, points: HistoryPoint[], replace: boolean) {
  if (!points.length) return;
  if (replace) await query("DELETE FROM price_history WHERE product_id = $1", [productId]);
  await query(
    `INSERT INTO price_history (product_id, price, scraped_at)
     SELECT $1::uuid, t.p, t.d FROM unnest($2::numeric[], $3::timestamptz[]) AS t(p, d)`,
    [productId, points.map((p) => p.price), points.map((p) => p.date)]
  );
}

// Saves the listings from other platforms as matches of this product.
export async function saveMatches(
  productId: string,
  sourceUrl: string,
  sourcePlatform: string,
  listings: Listing[]
) {
  let saved = 0;
  for (const l of listings) {
    if (l.price == null || l.platform === sourcePlatform || l.url === sourceUrl) continue;

    const rows = await query<{ id: string }>(
      `INSERT INTO products (platform, source_url, title, current_price, rating, last_scraped_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (source_url) DO UPDATE SET current_price = EXCLUDED.current_price, last_scraped_at = now()
       RETURNING id`,
      [l.platform, l.url, l.title, l.price, l.rating]
    );
    const matchedId = rows[0].id;

    const hasHistory = Boolean(l.history && l.history.length);
    const points = hasHistory ? l.history! : [{ date: new Date().toISOString(), price: l.price }];
    await insertHistory(matchedId, points, hasHistory);

    await query(
      `INSERT INTO product_matches (product_id, matched_product_id, match_confidence)
       VALUES ($1, $2, 0.9) ON CONFLICT (product_id, matched_product_id) DO NOTHING`,
      [productId, matchedId]
    );
    saved++;
  }
  return saved;
}
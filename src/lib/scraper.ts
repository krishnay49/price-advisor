import { chromium } from "playwright";

export type ScrapedProduct = {
  platform: string;
  externalId: string | null;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  rating: number | null;
  ratingCount: number | null;
  specs: Record<string, string>;
};

export type ScrapedReview = {
  author: string | null;
  rating: number | null;
  text: string;
};

export type SearchResult = {
  platform: string;
  title: string;
  price: number | null;
  url: string;
  rating: number | null;
};

export function detectPlatform(url: string): string {
  const host = new URL(url).hostname;
  if (host.includes("amazon.")) return "amazon";
  if (host.includes("flipkart.")) return "flipkart";
  throw new Error(`Unsupported platform for URL: ${url}`);
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * NOTE ON FRAGILITY: e-commerce sites change markup often and actively
 * discourage scraping. Selectors below are a realistic starting point,
 * not a guarantee — expect to update them. Keep request volume low.
 */
export async function scrapeAmazonProduct(url: string): Promise<ScrapedProduct> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const title = (await page.locator("#productTitle").first().textContent())?.trim() ?? "";

    const priceText = await page.locator(".a-price .a-offscreen").first().textContent().catch(() => null);
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) : null;

    const imageUrl = await page.locator("#landingImage").first().getAttribute("src").catch(() => null);

    const ratingText = await page.locator("#acrPopover").first().getAttribute("title").catch(() => null);
    const rating = ratingText ? parseFloat(ratingText) : null;

    const ratingCountText =
      (await page.locator("#acrCustomerReviewText").first().textContent().catch(() => null)) ?? "";
    const ratingCount = ratingCountText ? parseInt(ratingCountText.replace(/[^0-9]/g, ""), 10) : null;

    const bullets = await page.locator("#feature-bullets li").allTextContents();
    const specs: Record<string, string> = {};
    bullets.forEach((b, i) => {
      const clean = b.trim();
      if (clean) specs[`bullet_${i + 1}`] = clean;
    });

    const externalIdMatch = url.match(/\/dp\/([A-Z0-9]{10})/);

    return {
      platform: "amazon",
      externalId: externalIdMatch ? externalIdMatch[1] : null,
      title,
      brand: null,
      imageUrl,
      price,
      rating,
      ratingCount,
      specs,
    };
  } finally {
    await browser.close();
  }
}

export async function scrapeFlipkartProduct(url: string): Promise<ScrapedProduct> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    // Flipkart rotates its CSS class names, so read the structured data instead.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ld: any = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const b of blocks) {
        try {
          const data = JSON.parse(b.textContent || "");
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item && (item["@type"] === "Product" || item.name)) return item;
          }
        } catch {}
      }
      return null;
    });

    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .first()
      .getAttribute("content")
      .catch(() => null);

    const title = String(ld?.name ?? ogTitle ?? "").trim();

    const offer = Array.isArray(ld?.offers) ? ld.offers[0] : ld?.offers;
    const rawPrice = offer?.price ?? offer?.lowPrice;
    const price = rawPrice != null ? parseFloat(String(rawPrice).replace(/[^0-9.]/g, "")) : null;

    const image = Array.isArray(ld?.image) ? ld.image[0] : ld?.image;
    const rating = ld?.aggregateRating?.ratingValue ? parseFloat(ld.aggregateRating.ratingValue) : null;
    const ratingCount = ld?.aggregateRating?.ratingCount
      ? parseInt(String(ld.aggregateRating.ratingCount).replace(/,/g, ""), 10)
      : null;

    const externalIdMatch = url.match(/pid=([A-Z0-9]+)/i);

    return {
      platform: "flipkart",
      externalId: externalIdMatch ? externalIdMatch[1] : null,
      title,
      brand: typeof ld?.brand === "string" ? ld.brand : ld?.brand?.name ?? null,
      imageUrl: image ?? null,
      price: price != null && !isNaN(price) ? price : null,
      rating: rating != null && !isNaN(rating) ? rating : null,
      ratingCount: ratingCount != null && !isNaN(ratingCount) ? ratingCount : null,
      specs: {},
    };
  } finally {
    await browser.close();
  }
}
export async function searchPlatform(platform: string, queryTitle: string, limit = 5): Promise<SearchResult[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });
  const results: SearchResult[] = [];

  try {
    if (platform === "flipkart") {
      await page.goto(`https://www.flipkart.com/search?q=${encodeURIComponent(queryTitle)}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const cards = await page.locator("div._1AtVbE, div._13oc-S").all();
      for (const card of cards.slice(0, limit)) {
        const title = (await card.locator("div._4rR01T, a.s1Q9rs, div.IRpwTa").first().textContent().catch(() => null))?.trim();
        const href = await card.locator("a").first().getAttribute("href").catch(() => null);
        const priceText = await card.locator("div._30jeq3").first().textContent().catch(() => null);
        const ratingText = await card.locator("div._3LWZlK").first().textContent().catch(() => null);
        if (title && href) {
          results.push({
            platform: "flipkart",
            title,
            url: `https://www.flipkart.com${href}`,
            price: priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) : null,
            rating: ratingText ? parseFloat(ratingText) : null,
          });
        }
      }
    } else if (platform === "amazon") {
      await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(queryTitle)}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const cards = await page.locator("[data-component-type='s-search-result']").all();
      for (const card of cards.slice(0, limit)) {
        const title = (await card.locator("h2 span").first().textContent().catch(() => null))?.trim();
        const href = await card.locator("h2 a").first().getAttribute("href").catch(() => null);
        const priceText = await card.locator(".a-price .a-offscreen").first().textContent().catch(() => null);
        const ratingText = await card.locator(".a-icon-star-small .a-icon-alt").first().textContent().catch(() => null);
        if (title && href) {
          results.push({
            platform: "amazon",
            title,
            url: `https://www.amazon.in${href}`,
            price: priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) : null,
            rating: ratingText ? parseFloat(ratingText) : null,
          });
        }
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

export async function scrapeAmazonReviews(url: string, maxReviews = 20): Promise<ScrapedReview[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });
  const reviews: ScrapedReview[] = [];

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const reviewBlocks = await page.locator("[data-hook='review']").all();
    for (const block of reviewBlocks.slice(0, maxReviews)) {
      const text = (await block.locator("[data-hook='review-body']").first().textContent().catch(() => null))?.trim();
      const author = (await block.locator(".a-profile-name").first().textContent().catch(() => null))?.trim() ?? null;
      const ratingTitle = await block
        .locator("[data-hook='review-star-rating']")
        .first()
        .getAttribute("title")
        .catch(() => null);
      const rating = ratingTitle ? parseFloat(ratingTitle) : null;
      if (text) reviews.push({ author, rating, text });
    }
  } finally {
    await browser.close();
  }

  return reviews;
}

export async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  const platform = detectPlatform(url);
  if (platform === "amazon") return scrapeAmazonProduct(url);
  if (platform === "flipkart") return scrapeFlipkartProduct(url);
  throw new Error(`Scraper not yet implemented for platform: ${platform}`);
}

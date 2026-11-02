import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const BASE = "https://api.openwebninja.com/realtime-product-search/v2";

async function call(path: string, params: Record<string, string>) {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { "x-api-key": process.env.OPENWEBNINJA_KEY ?? "" },
  });
  const json = await res.json();
  if (!res.ok || json.status === "ERROR") {
    throw new Error(
      json?.error?.message ?? json?.message ?? "Review fetch failed"
    );
  }
  return json.data;
}

type Review = {
  author: string;
  rating: number | null;
  title: string;
  text: string;
  date: string | null;
  source: string | null;
};

// Tries to find the OpenWebNinja product_id by searching for the product title.
async function findProductId(title: string): Promise<string | null> {
  try {
    const data = await call("/search", {
      q: title,
      country: "in",
      language: "en",
      limit: "5",
    });
    const products = data?.products ?? [];
    if (!products.length) return null;

    // Pick the best match (first result from API is usually most relevant).
    return String(products[0].product_id);
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the product title from our DB.
    const rows = await query<{ title: string; platform: string }>(
      "SELECT title, platform FROM products WHERE id = $1",
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const { title, platform } = rows[0];

    // Find the product on OpenWebNinja.
    const productId = await findProductId(title);

    if (!productId) {
      return NextResponse.json({
        reviews: [],
        averageRating: null,
        totalReviews: null,
        ratingBreakdown: null,
      });
    }

    // Fetch reviews from the API.
    const data = await call("/product-reviews", {
      product_id: productId,
      country: "in",
      language: "en",
      limit: "20",
    });

    // Map the API response to our Review type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawReviews: any[] = data?.reviews ?? [];

    const allReviews: Review[] = rawReviews
      .filter((r) => r && (r.text || r.review_text || r.body || r.content))
      .map((r) => ({
        author: r.author ?? r.reviewer_name ?? r.name ?? null,
        rating: r.rating ?? r.reviewer_rating ?? r.stars ?? null,
        title: r.title ?? r.review_title ?? "",
        text: r.text ?? r.review_text ?? r.body ?? r.content ?? "",
        date: r.date ?? r.review_date ?? r.published_at ?? null,
        source: r.source_store ?? r.source ?? platform ?? null,
      }));

    // Pick ~5 reviews: half positive (4-5 stars), half negative (1-3 stars).
    const positive = allReviews.filter(
      (r) => r.rating != null && r.rating >= 4
    );
    const negative = allReviews.filter(
      (r) => r.rating != null && r.rating <= 3
    );
    const unrated = allReviews.filter((r) => r.rating == null);

    const pickPositive = positive.slice(0, 2);
    const pickNegative = negative.slice(0, 2);

    // Fill remaining slots (up to 5 total) from whichever side has more.
    let reviews = [...pickPositive, ...pickNegative];
    const remaining = 5 - reviews.length;
    if (remaining > 0) {
      const extras = [
        ...positive.slice(pickPositive.length),
        ...negative.slice(pickNegative.length),
        ...unrated,
      ].slice(0, remaining);
      reviews = [...reviews, ...extras];
    }

    // Sort: negative first, then positive — gives a balanced reading experience.
    reviews.sort((a, b) => (a.rating ?? 3) - (b.rating ?? 3));

    // Compute summary statistics.
    const rated = reviews.filter((r) => r.rating != null);
    const averageRating =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + r.rating!, 0) / rated.length
        : (data?.product_rating ?? null);

    const totalReviews =
      data?.total_reviews ?? data?.product_num_reviews ?? reviews.length;

    // Build rating breakdown from review data.
    const ratingBreakdown: Record<string, number> = {
      "5": 0,
      "4": 0,
      "3": 0,
      "2": 0,
      "1": 0,
    };

    for (const r of rated) {
      const star = String(Math.round(r.rating!));
      if (star in ratingBreakdown) ratingBreakdown[star]++;
    }

    return NextResponse.json({
      reviews,
      averageRating:
        averageRating != null ? Math.round(averageRating * 10) / 10 : null,
      totalReviews,
      ratingBreakdown,
    });
  } catch (error) {
    console.error("Reviews GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load reviews",
      },
      { status: 500 }
    );
  }
}

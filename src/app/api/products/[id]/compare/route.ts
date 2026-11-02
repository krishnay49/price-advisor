import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { lookupProduct, saveMatches } from "@/lib/priceSearch";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await query<{
      platform: string;
      title: string;
      current_price: string | null;
      rating: string | null;
      source_url: string;
      match_confidence: string;
    }>(
      `SELECT p.platform, p.title, p.current_price, p.rating,
              p.source_url, m.match_confidence
       FROM product_matches m
       JOIN products p ON p.id = m.matched_product_id
       WHERE m.product_id = $1
       ORDER BY p.current_price ASC NULLS LAST`,
      [id]
    );

    const self = await query<{
      platform: string;
      title: string;
      current_price: string | null;
      rating: string | null;
      source_url: string;
    }>(
      `SELECT platform, title, current_price, rating, source_url
       FROM products WHERE id = $1`,
      [id]
    );

    if (!self.length) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const listings = [
      {
        platform: self[0].platform,
        title: self[0].title,
        price: self[0].current_price
          ? Number(self[0].current_price)
          : null,
        rating: self[0].rating
          ? Number(self[0].rating)
          : null,
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

    const priced = listings.filter((l) => l.price !== null);

    const bestDeal = priced.length
      ? priced.reduce((a, b) => (b.price! < a.price! ? b : a))
      : null;

    return NextResponse.json({
      listings,
      bestPlatform: bestDeal?.platform ?? null,
    });
  } catch (error) {
    console.error("Comparison GET error:", error);

    return NextResponse.json(
      { error: "Failed to load product comparisons" },
      { status: 500 }
    );
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const source = await query<{
      platform: string;
      title: string;
      source_url: string;
    }>(
      `SELECT platform, title, source_url
       FROM products
       WHERE id = $1`,
      [id]
    );

    if (!source.length) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const result = await lookupProduct(source[0].title);

    const saved = await saveMatches(
      id,
      source[0].source_url,
      source[0].platform,
      result.listings
    );

    return NextResponse.json({ matchesFound: saved });
  } catch (error) {
    console.error("Comparison POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to compare product prices",
      },
      { status: 502 }
    );
  }
}
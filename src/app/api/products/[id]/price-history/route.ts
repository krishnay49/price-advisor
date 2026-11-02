import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const history = await query<{ price: string; scraped_at: string }>(
    "SELECT price, scraped_at FROM price_history WHERE product_id = $1 ORDER BY scraped_at ASC",
    [id]
  );

  const stats = await query<{ min: string; max: string; avg: string }>(
    "SELECT MIN(price) as min, MAX(price) as max, AVG(price) as avg FROM price_history WHERE product_id = $1",
    [id]
  );

  return NextResponse.json({
    history: history.map((h) => ({ price: Number(h.price), date: h.scraped_at })),
    stats: stats[0]
      ? { min: Number(stats[0].min), max: Number(stats[0].max), avg: Number(stats[0].avg) }
      : null,
  });
}

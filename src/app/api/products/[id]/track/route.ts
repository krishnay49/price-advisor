import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to track products." }, { status: 401 });

  await query(
    `INSERT INTO tracked_products (user_id, product_id) VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [user.id, id]
  );

  return NextResponse.json({ tracked: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to track products." }, { status: 401 });

  await query("DELETE FROM tracked_products WHERE user_id = $1 AND product_id = $2", [
    user.id,
    id,
  ]);

  return NextResponse.json({ tracked: false });
}

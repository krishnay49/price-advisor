import { Pool, QueryResultRow } from "pg";

// A single pooled connection reused across API routes / serverless invocations.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

// pgvector expects embeddings formatted as '[0.1,0.2,...]' in SQL.
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

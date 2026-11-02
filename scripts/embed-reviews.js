// Fills in embeddings for reviews that have none.  Run: npm run db:embed
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MODEL = "gemini-embedding-001";

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: `models/${MODEL}`, content: { parts: [{ text }] } }),
    }
  );
  const data = await res.json();
  if (!data.embedding) throw new Error("Embedding failed: " + JSON.stringify(data));
  return data.embedding.values;
}

async function main() {
  const { rows } = await pool.query("SELECT id, review_text FROM reviews WHERE embedding IS NULL");
  console.log(`Found ${rows.length} reviews without embeddings.`);
  for (const r of rows) {
    const values = await embed(r.review_text);
    await pool.query("UPDATE reviews SET embedding = $1, chunk_text = $2 WHERE id = $3", [
      `[${values.join(",")}]`,
      r.review_text,
      r.id,
    ]);
    console.log(`Embedded review ${r.id}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());

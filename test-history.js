require("dotenv").config();
const BASE = "https://api.openwebninja.com/realtime-product-search/v2";
const headers = { "x-api-key": process.env.OPENWEBNINJA_KEY };

async function main() {
  const q = new URLSearchParams({ q: "Samsung Galaxy S25 Ultra", country: "in", language: "en", limit: "5" });
  const s = await (await fetch(`${BASE}/search?${q}`, { headers })).json();
  const p = s.data.products.find((x) => x.has_multiple_offers) ?? s.data.products[0];

  const h = new URLSearchParams({ product_id: p.product_id, country: "in", language: "en", page: "1" });
  const r = await fetch(`${BASE}/product-price-history-v2?${h}`, { headers });
  const text = await r.text();
  console.log("status", r.status);
  console.log(text.slice(0, 2500));
  try {
    const d = JSON.parse(text).data;
    console.log("\nTOP-LEVEL KEYS:", Object.keys(d));
    const first = (d.offers ?? [])[0];
    if (first) console.log("FIRST OFFER KEYS:", Object.keys(first));
  } catch {}
}

main();
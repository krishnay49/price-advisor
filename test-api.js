require("dotenv").config();

const key = process.env.OPENWEBNINJA_KEY;
const BASE = "https://api.openwebninja.com/realtime-product-search/v2";

async function get(path, params) {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { "x-api-key": key },
  });
  const text = await res.text();
  console.log(`\n${path} -> status ${res.status}`);
  console.log(text.slice(0, 3000));
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function main() {
  console.log("Key loaded:", Boolean(key));
  const search = await get("/search", { q: "Samsung Galaxy S25 Ultra", country: "in", language: "en", limit: "3" });
  const id = search?.data?.products?.[0]?.product_id;
  if (id) await get("/product-offers", { product_id: String(id), country: "in", page: "1" });
}

main();
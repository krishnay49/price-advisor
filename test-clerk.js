require("dotenv").config();

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const sk = process.env.CLERK_SECRET_KEY ?? "";

console.log("Publishable key present:", pk.startsWith("pk_"), "| length:", pk.length);
console.log("Secret key present:", sk.startsWith("sk_"), "| length:", sk.length);
console.log("Secret key has spaces/quotes:", /["'\s]/.test(sk));

// The publishable key encodes which Clerk app it belongs to.
try {
  const encoded = pk.split("_").slice(2).join("_");
  console.log("Publishable key belongs to:", Buffer.from(encoded, "base64").toString().replace("$", ""));
} catch {}

fetch("https://api.clerk.com/v1/jwks", { headers: { Authorization: `Bearer ${sk}` } })
  .then(async (r) => {
    console.log("\nClerk API status:", r.status);
    console.log((await r.text()).slice(0, 300));
  })
  .catch((e) => console.log("\nCould not reach Clerk:", e.message, e.cause ? String(e.cause) : ""));
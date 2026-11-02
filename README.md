# Price Advisor

Paste a product link, track its price history, compare prices across platforms,
and ask an AI chatbot questions grounded in price data and real reviews (RAG).

## Setup (Windows / any OS)

1. Create a Neon project (neon.tech). In its SQL Editor, run `db/schema.sql`, then optionally `db/seed.sql`.
2. Create a Clerk application (clerk.com) and a Gemini API key (aistudio.google.com).
3. Copy `.env.example` to a new file named exactly `.env` and fill in every value.
   The `.env` file is never included in the zip; you must create it.
4. Install and run:
   ```
   npm install
   npx playwright install chromium
   npm run db:embed      # only if you loaded seed.sql
   npm run dev
   ```
5. Open http://localhost:3000

## Notes
- Embeddings use `gemini-embedding-001` (3072 dimensions); the schema matches.
- Chat uses `gemini-3.5-flash` (`src/lib/gemini.ts`).
- Scraper selectors for Amazon/Flipkart change often; update them in `src/lib/scraper.ts`.
- Auth is Clerk; user ids are stored as text in `tracked_products.user_id`.

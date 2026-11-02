-- Run once against your Neon Postgres database (SQL Editor -> paste -> Run).
-- Users are managed by Clerk, so there is no users table; user ids are Clerk ids (text).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  external_id TEXT,
  title TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  current_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  rating NUMERIC(3,2),
  rating_count INTEGER,
  first_tracked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_scraped_at TIMESTAMPTZ,
  embedding VECTOR(3072)
);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_history_product_time ON price_history (product_id, scraped_at);

CREATE TABLE IF NOT EXISTS product_matches (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  matched_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  match_confidence NUMERIC(4,3) NOT NULL,
  PRIMARY KEY (product_id, matched_product_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author TEXT,
  rating NUMERIC(2,1),
  review_text TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(3072)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);

CREATE TABLE IF NOT EXISTS tracked_products (
  user_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages (session_id, created_at);

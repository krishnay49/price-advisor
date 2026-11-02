-- Optional: sample data so you can demo the UI before scraping works end-to-end.
-- Embeddings are left NULL here — run scripts/embed-reviews.ts after seeding to fill them in.

INSERT INTO products (id, platform, source_url, external_id, title, brand, image_url, specs, current_price, rating, rating_count, first_tracked_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'amazon',
  'https://www.amazon.in/dp/EXAMPLE123',
  'EXAMPLE123',
  'Noise-Cancelling Over-Ear Headphones, 40h Battery',
  'ExampleAudio',
  'https://example.com/headphones.jpg',
  '{"battery_life_hours": 40, "noise_cancelling": true, "bluetooth_version": "5.3"}',
  6499.00,
  4.3,
  2140,
  now() - interval '90 days'
)
ON CONFLICT (source_url) DO NOTHING;

INSERT INTO price_history (product_id, price, scraped_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 7999.00, now() - interval '90 days'),
  ('11111111-1111-1111-1111-111111111111', 7999.00, now() - interval '75 days'),
  ('11111111-1111-1111-1111-111111111111', 6999.00, now() - interval '60 days'),
  ('11111111-1111-1111-1111-111111111111', 6999.00, now() - interval '45 days'),
  ('11111111-1111-1111-1111-111111111111', 5999.00, now() - interval '30 days'),
  ('11111111-1111-1111-1111-111111111111', 6999.00, now() - interval '15 days'),
  ('11111111-1111-1111-1111-111111111111', 6499.00, now());

INSERT INTO reviews (product_id, author, rating, review_text, chunk_text, posted_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ananya', 5.0,
   'Battery genuinely lasts close to the advertised 40 hours. Noise cancelling is excellent on flights, blocks engine drone almost completely.',
   'Battery genuinely lasts close to the advertised 40 hours. Noise cancelling is excellent on flights, blocks engine drone almost completely.',
   now() - interval '20 days'),
  ('11111111-1111-1111-1111-111111111111', 'Rahul', 4.0,
   'Good sound but they run a bit warm on the ears after 2+ hours of continuous use. Bluetooth connection to two devices at once works well.',
   'Good sound but they run a bit warm on the ears after 2+ hours of continuous use. Bluetooth connection to two devices at once works well.',
   now() - interval '10 days'),
  ('11111111-1111-1111-1111-111111111111', 'Priya', 3.0,
   'Mic quality on calls is average, people said my voice sounded muffled indoors. Otherwise comfortable for daily commute.',
   'Mic quality on calls is average, people said my voice sounded muffled indoors. Otherwise comfortable for daily commute.',
   now() - interval '5 days');

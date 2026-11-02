"use client";

import { useEffect, useRef, useState } from "react";

type Review = {
  author: string;
  rating: number | null;
  title: string;
  text: string;
  date: string | null;
  source: string | null;
};

type ReviewsData = {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number | null;
  ratingBreakdown: Record<string, number> | null;
};

function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-white/20">—</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${
            i < full
              ? "fill-current"
              : i === full && half
              ? "fill-current opacity-50"
              : "fill-current opacity-15"
          }`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-white/40">{rating.toFixed(1)}</span>
    </span>
  );
}

function RatingBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right text-white/40">{label}</span>
      <span className="text-amber-400/60">★</span>
      <div className="h-2 flex-1 rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-white/30">{count}</span>
    </div>
  );
}

export default function ReviewsSection({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const started = useRef(false);

  async function fetchReviews() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not load reviews.");
        return;
      }
      setData(json);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const breakdown = data?.ratingBreakdown;
  const maxCount = breakdown ? Math.max(...Object.values(breakdown), 1) : 1;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Customer reviews
        </h2>
        <button
          onClick={fetchReviews}
          disabled={loading}
          className="rounded-lg glass border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && !data && (
        <div className="rounded-2xl glass-card p-10 text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
          <p className="text-sm text-white/30">Fetching reviews...</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl glass-card p-8 text-center">
          <p className="text-sm text-white/30">{error}</p>
        </div>
      )}

      {data && !loading && data.reviews.length === 0 && (
        <div className="rounded-2xl glass-card p-8 text-center">
          <p className="text-sm text-white/30">No reviews found for this product.</p>
        </div>
      )}

      {data && data.reviews.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 rounded-2xl glass-card p-6 sm:grid-cols-[180px_1fr]">
            <div className="flex flex-col items-center justify-center border-b border-white/[0.06] pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
              <p className="font-display text-4xl font-bold text-white">
                {data.averageRating?.toFixed(1) ?? "—"}
              </p>
              <Stars rating={data.averageRating} />
              {data.totalReviews != null && (
                <p className="mt-1 text-xs text-white/30">
                  {data.totalReviews.toLocaleString("en-IN")} reviews
                </p>
              )}
            </div>
            {breakdown && (
              <div className="flex flex-col justify-center gap-1.5 pt-4 sm:pt-0">
                {["5", "4", "3", "2", "1"].map((star) => (
                  <RatingBar key={star} label={star} count={breakdown[star] ?? 0} max={maxCount} />
                ))}
              </div>
            )}
          </div>

          {/* Individual reviews */}
          <div className="space-y-3">
            {data.reviews.map((review, i) => {
              const isLong = review.text.length > 250;
              const isOpen = expanded.has(i);

              return (
                <div key={i} className="rounded-2xl glass-card p-5 transition-glass">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <Stars rating={review.rating} />
                      {review.title && (
                        <p className="mt-1.5 text-sm font-semibold text-white leading-snug">
                          {review.title}
                        </p>
                      )}
                    </div>
                    {review.source && (
                      <span className="shrink-0 rounded-full glass px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white/30">
                        {review.source}
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-white/50">
                    {isLong && !isOpen ? review.text.slice(0, 250) + "..." : review.text}
                    {isLong && (
                      <button
                        onClick={() => toggleExpand(i)}
                        className="ml-1 text-indigo-400 text-xs font-medium hover:text-indigo-300"
                      >
                        {isOpen ? "Show less" : "Read more"}
                      </button>
                    )}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-white/25">
                    {review.author && <span>{review.author}</span>}
                    {review.date && (
                      <span>
                        {new Date(review.date).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

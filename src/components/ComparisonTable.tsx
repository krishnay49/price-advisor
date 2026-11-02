"use client";

import { useEffect, useRef, useState } from "react";

type Listing = {
  platform: string;
  title: string;
  price: number | null;
  rating: number | null;
  url: string;
  isSource: boolean;
  confidence: number;
};

const PLATFORM_LABELS: Record<string, string> = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  croma: "Croma",
  reliancedigital: "Reliance Digital",
};

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "from-amber-500 to-orange-500",
  flipkart: "from-yellow-400 to-amber-500",
  croma: "from-green-400 to-emerald-500",
  reliancedigital: "from-blue-400 to-indigo-500",
};

export default function ComparisonTable({
  productId,
  initialListings,
}: {
  productId: string;
  initialListings: Listing[];
}) {
  const [listings, setListings] = useState(initialListings);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  const priced = listings.filter((l) => l.price != null);
  const bestPrice = priced.length ? Math.min(...priced.map((l) => l.price!)) : null;

  async function findMatches() {
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/compare`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "Could not search other platforms.");
        return;
      }
      if (data.matchesFound === 0) {
        setMessage("No confident match found on other platforms.");
        return;
      }

      const refreshed = await fetch(`/api/products/${productId}/compare`).then((r) => r.json());
      setListings(refreshed.listings);
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initialListings.length === 1) findMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">Compare across platforms</h2>
        <button
          onClick={findMatches}
          disabled={searching}
          className="rounded-lg glass border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
        >
          {searching ? (
            <span className="flex items-center gap-2">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching...
            </span>
          ) : (
            "Search again"
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl glass-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Platform</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Price</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Rating</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Match</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.url} className="border-t border-white/[0.04] transition-glass hover:bg-white/[0.03]">
                <td className="px-5 py-4 font-medium text-white">
                  <span className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[l.platform] ?? "from-gray-400 to-gray-500"}`} />
                    {PLATFORM_LABELS[l.platform] ?? l.platform}
                  </span>
                  {l.price != null && l.price === bestPrice && listings.length > 1 && (
                    <span className="ml-2 inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                      Best deal
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 font-semibold text-white">
                  {l.price != null ? `₹${l.price.toLocaleString("en-IN")}` : l.isSource ? "Not available" : "—"}
                </td>
                <td className="px-5 py-4 text-white/50">
                  {l.rating != null ? (
                    <span className="flex items-center gap-1">
                      <span className="text-amber-400">★</span> {l.rating.toFixed(1)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-white/40 text-xs">
                  {l.isSource ? "This listing" : `${Math.round(l.confidence * 100)}%`}
                </td>
                <td className="px-5 py-4 text-right">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Open ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {searching && <p className="mt-3 text-xs text-white/40">Searching other platforms...</p>}
      {message && !searching && <p className="mt-3 text-xs text-white/40">{message}</p>}
    </div>
  );
}

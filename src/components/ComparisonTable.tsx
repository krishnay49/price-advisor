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

  // Search other platforms automatically when the page opens,
  // but only if we don't already have matches for this product.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initialListings.length === 1) findMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl">Compare across platforms</h2>
        <button
          onClick={findMatches}
          disabled={searching}
          className="rounded-md border border-ink/15 px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search again"}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink/[0.03]">
              <th className="px-4 py-2.5 text-left font-medium text-ink/60">Platform</th>
              <th className="px-4 py-2.5 text-left font-medium text-ink/60">Price</th>
              <th className="px-4 py-2.5 text-left font-medium text-ink/60">Rating</th>
              <th className="px-4 py-2.5 text-left font-medium text-ink/60">Match</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.url} className="border-t border-ink/5">
                <td className="px-4 py-3 font-medium">
                  {PLATFORM_LABELS[l.platform] ?? l.platform}
                  {l.price != null && l.price === bestPrice && listings.length > 1 && (
                    <span className="ml-2 rounded-full bg-signal/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-signal">
                      Best deal
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {l.price != null ? `₹${l.price.toLocaleString("en-IN")}` : l.isSource ? "Not available" : "—"}
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {l.rating != null ? `${l.rating.toFixed(1)} ★` : "—"}
                </td>
                <td className="px-4 py-3 text-ink/50 text-xs">
                  {l.isSource ? "This listing" : `${Math.round(l.confidence * 100)}% confident`}
                </td>
                <td className="px-4 py-3 text-right">
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-xs text-signal underline">
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {searching && <p className="mt-2 text-xs text-ink/60">Searching other platforms...</p>}
      {message && !searching && <p className="mt-2 text-xs text-ink/60">{message}</p>}
    </div>
  );
}
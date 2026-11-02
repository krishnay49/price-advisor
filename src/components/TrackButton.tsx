"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackButton({
  productId,
  initiallyTracked,
  signedIn,
}: {
  productId: string;
  initiallyTracked: boolean;
  signedIn: boolean;
}) {
  const [tracked, setTracked] = useState(initiallyTracked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle() {
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/track`, {
        method: tracked ? "DELETE" : "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update tracking.");
        return;
      }

      setTracked(!tracked);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
          tracked
            ? "glass border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/10"
            : signedIn
            ? "btn-gradient"
            : "glass border border-white/10 text-white/70 hover:text-white hover:border-white/20"
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            ...
          </span>
        ) : tracked ? (
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Tracking
          </span>
        ) : signedIn ? (
          "Track this"
        ) : (
          "Sign in to track"
        )}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

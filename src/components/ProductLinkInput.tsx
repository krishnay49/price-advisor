"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductLinkInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push(`/product/${data.productId}`);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="url"
        required
        placeholder="https://www.amazon.in/dp/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 rounded-xl glass-input px-5 py-4 text-base transition-glass"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl btn-gradient px-7 py-4 text-base"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Reading page...
          </span>
        ) : (
          "Track price →"
        )}
      </button>
      {error && <p className="text-red-400 text-sm sm:basis-full">{error}</p>}
    </form>
  );
}

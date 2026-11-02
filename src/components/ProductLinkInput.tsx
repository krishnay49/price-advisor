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
        className="flex-1 rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-signal focus:ring-1 focus:ring-signal"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-ink px-6 py-3 text-paper font-medium disabled:opacity-50"
      >
        {loading ? "Reading page..." : "Track price"}
      </button>
      {error && <p className="text-alert text-sm sm:basis-full">{error}</p>}
    </form>
  );
}

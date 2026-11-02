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
  const router = useRouter();

  async function toggle() {
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/products/${productId}/track`, {
        method: tracked ? "DELETE" : "POST",
      });
      setTracked(!tracked);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        tracked ? "border border-ink/15 text-ink" : "bg-ink text-paper"
      }`}
    >
      {loading ? "..." : tracked ? "Tracking" : signedIn ? "Track this" : "Sign in to track"}
    </button>
  );
}

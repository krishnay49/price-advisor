"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type PricePoint = { price: number; date: string };

export default function PriceChart({ history }: { history: PricePoint[] }) {
  if (!history.length) {
    return <p className="text-ink/60 text-sm">No price history yet — check back after the next scrape.</p>;
  }

  const data = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    price: h.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#12151B15" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
        <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Price"]} />
        <Line type="monotone" dataKey="price" stroke="#2F6F4F" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

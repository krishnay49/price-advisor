"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";

type PricePoint = { price: number; date: string };

export default function PriceChart({ history }: { history: PricePoint[] }) {
  if (!history.length) {
    return (
      <div className="flex items-center justify-center py-12 text-white/30 text-sm">
        <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        No price history yet — check back after the next scrape.
      </div>
    );
  }

  const data = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    price: h.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} domain={["auto", "auto"]} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "rgba(20, 24, 41, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", backdropFilter: "blur(20px)", color: "#e8eaf0", fontSize: "13px" }}
          formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Price"]}
        />
        <Area type="monotone" dataKey="price" stroke="#818cf8" strokeWidth={2.5} fill="url(#priceGradient)" dot={{ r: 3, fill: "#818cf8", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#a5b4fc", strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

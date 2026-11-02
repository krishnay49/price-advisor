"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function ProductChat({ productId }: { productId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me about this product's price, reviews, or alternatives." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: "user", content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${productId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, history: nextMessages.slice(0, -1) }),
      });
      const data = await res.json();
      setMessages([...nextMessages, { role: "assistant", content: data.reply ?? data.error ?? "No response." }]);
    } catch {
      setMessages([...nextMessages, { role: "assistant", content: "Something went wrong reaching the assistant." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col border border-ink/10 rounded-lg bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                m.role === "user" ? "bg-ink text-paper" : "bg-paper text-ink"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-ink/40 text-sm">Thinking...</p>}
      </div>
      <div className="flex border-t border-ink/10 p-3 gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="e.g. Is the battery actually good?"
          className="flex-1 rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-signal"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="rounded-md bg-signal px-4 py-2 text-paper text-sm font-medium disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}

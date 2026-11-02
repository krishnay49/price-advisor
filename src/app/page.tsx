import ProductLinkInput from "@/components/ProductLinkInput";

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: "Price History",
    desc: "See how the price has changed over time. Know if it's truly a deal or just marketing.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5 5 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5 5 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    title: "Cross-Platform Compare",
    desc: "Automatically find the same product on Amazon, Flipkart, Croma & more. See who has the best price.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: "Real Reviews",
    desc: "Balanced reviews from real buyers — both positive and negative — so you get the full picture.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "AI Product Assistant",
    desc: "Ask anything — battery life, build quality, comparisons. Get answers grounded in real data, not guesses.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <main className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI-Powered Price Intelligence
        </div>

        <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-5 gradient-text">
          Know if it&apos;s actually{" "}
          <span className="gradient-text-accent">a good price.</span>
        </h1>

        <p className="text-white/50 text-lg md:text-xl mb-12 max-w-xl mx-auto leading-relaxed">
          Paste any product link. We track the real price history, compare it
          across platforms, and let you ask questions with AI.
        </p>

        <div className="max-w-2xl mx-auto">
          <ProductLinkInput />
        </div>

        <p className="mt-4 text-xs text-white/25">
          Supports Amazon.in & Flipkart · More platforms coming soon
        </p>
      </main>

      {/* ── Features ── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">
          What you get
        </p>
        <h2 className="text-center font-display text-2xl md:text-3xl font-bold text-white mb-12">
          Everything you need to shop smarter
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl glass-card p-6 transition-glass hover:scale-[1.02]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 icon-glow">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed text-white/45">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">
          How it works
        </p>
        <h2 className="text-center font-display text-2xl md:text-3xl font-bold text-white mb-12">
          Three steps to smarter shopping
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { step: "01", title: "Paste a link", desc: "Drop any Amazon or Flipkart product URL." },
            { step: "02", title: "Get insights", desc: "See price history, platform comparisons, and real reviews instantly." },
            { step: "03", title: "Ask questions", desc: "Chat with AI about the product — battery, camera, durability, anything." },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl glass border border-indigo-500/20">
                <span className="font-display text-lg font-bold gradient-text-accent">{s.step}</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{s.title}</h3>
              <p className="text-sm text-white/40">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-10 text-center">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white">Price Advisor</span>
          </div>
          <p className="text-sm text-white/30">
            Made with ♥ by <span className="font-semibold text-white/50">Krishna</span>
          </p>
          <p className="mt-1 text-xs text-white/20">
            © {new Date().getFullYear()} Price Advisor. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

import ProductLinkInput from "@/components/ProductLinkInput";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <p className="text-sm uppercase tracking-wide text-signal mb-3">Price Advisor</p>
      <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
        Paste a link. Know if it&apos;s actually a good price.
      </h1>
      <p className="text-ink/70 text-lg mb-10 max-w-xl">
        We track the real price history, compare it across platforms, and let you
        ask questions grounded in actual reviews — not guesses.
      </p>
      <ProductLinkInput />
    </main>
  );
}

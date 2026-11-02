/**
 * Decides whether a listing found on another platform is the *same* product.
 *
 * Title-only string similarity is unreliable here ("128GB" vs "256GB" differ by
 * three characters but are different products), so this combines:
 *   1. token overlap on the normalized title
 *   2. a hard check on model-defining tokens (numbers + capacities)
 * Anything below MATCH_THRESHOLD is discarded rather than shown as a match.
 */

const MATCH_THRESHOLD = 0.55;

const STOPWORDS = new Set([
  "with", "and", "for", "the", "new", "best", "buy", "online", "black", "white",
  "blue", "red", "pack", "of", "in", "at", "price", "india",
]);

function normalize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Tokens that usually encode the actual model/variant: 128gb, 40h, xm5, 165hz */
function modelTokens(tokens: string[]): Set<string> {
  return new Set(tokens.filter((t) => /\d/.test(t)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function titleMatchScore(titleA: string, titleB: string): number {
  const tokensA = normalize(titleA);
  const tokensB = normalize(titleB);

  const overlap = jaccard(new Set(tokensA), new Set(tokensB));

  const modelA = modelTokens(tokensA);
  const modelB = modelTokens(tokensB);

  // If both titles specify model/capacity tokens and none of them agree,
  // these are almost certainly different variants — reject outright.
  if (modelA.size > 0 && modelB.size > 0) {
    const modelOverlap = jaccard(modelA, modelB);
    if (modelOverlap === 0) return 0;
    return overlap * 0.6 + modelOverlap * 0.4;
  }

  return overlap;
}

export function isLikelyMatch(titleA: string, titleB: string): boolean {
  return titleMatchScore(titleA, titleB) >= MATCH_THRESHOLD;
}

export { MATCH_THRESHOLD };

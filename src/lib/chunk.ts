/**
 * Splits long review text into ~sentence-bounded chunks so each embedded
 * chunk stays focused (better retrieval precision than embedding a whole
 * 500-word review as one vector). Short reviews come back as a single chunk.
 */
export function chunkText(text: string, maxChars = 400): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = (current + " " + sentence).trim();
    }
  }
  if (current) chunks.push(current.trim());

  return chunks.length ? chunks : [text];
}

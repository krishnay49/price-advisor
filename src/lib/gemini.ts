const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use the same model for normal chat and Google Search.
// You can override this in your .env.local file.
const CHAT_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

// ==========================================
// TYPES
// ==========================================

export type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      { type: string; description: string }
    >;
    required?: string[];
  };
};

export type GeminiPart = {
  text?: string;

  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };

  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };

  thoughtSignature?: string;

  [key: string]: unknown;
};

export type GeminiMessage = {
  role: "user" | "model";
  parts: GeminiPart[];
};

// ==========================================
// API REQUEST HELPER
// ==========================================

async function geminiRequest(
  body: Record<string, unknown>
) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent`;

  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return await response.json();
    }

    const errorText = await response.text();

    // Retry temporary rate limits and server errors.
    if (
      (response.status === 429 || response.status === 503) &&
      attempt < maxRetries
    ) {
      const delay = Math.min(
        1000 * Math.pow(2, attempt),
        4000
      );

      console.warn(
        `Gemini returned ${response.status}. Retrying in ${delay}ms.`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );

      continue;
    }

    if (response.status === 429) {
      throw new Error(
        "Gemini API rate limit exceeded. Please wait before trying again. Check your Google AI Studio quota and billing."
      );
    }

    if (response.status === 503) {
      throw new Error(
        "Gemini is temporarily unavailable. Please try again shortly."
      );
    }

    console.error("Gemini API error:", errorText);

    throw new Error(
      `Gemini API Error ${response.status}: ${errorText}`
    );
  }

  throw new Error("Gemini request failed.");
}

// ==========================================
// NORMAL GEMINI FUNCTION CALLING
// ==========================================

export async function callGeminiWithTools(
  messages: GeminiMessage[],
  functions: GeminiFunctionDeclaration[],
  systemInstruction: string
) {
  const data = await geminiRequest({
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },

    contents: messages,

    tools: [
      {
        function_declarations: functions,
      },
    ],
  });

  const candidate = data.candidates?.[0];

  const modelContent = candidate?.content;

  const parts: GeminiPart[] =
    modelContent?.parts ?? [];

  const functionCalls = parts
    .filter((part) => part.functionCall)
    .map((part) => part.functionCall!);

  const text = parts
    .filter(
      (part) => typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("\n");

  return {
    text,
    functionCalls,

    // Preserve original response parts and thought signatures.
    modelContent: modelContent as
      | GeminiMessage
      | undefined,

    rawParts: parts,

    finishReason: candidate?.finishReason,
  };
}

// ==========================================
// GOOGLE SEARCH GROUNDING
// ==========================================

export async function callGeminiWithGoogleSearch(
  productTitle: string,
  userMessage: string
) {
  const prompt = `
You are Price Advisor, an expert product research assistant.

PRODUCT:
${productTitle}

USER QUESTION:
${userMessage}

INSTRUCTIONS:

1. Search the internet for information about this exact product.
2. Find trustworthy sources and real customer experiences where available.
3. For battery questions, explain real-world battery performance.
4. For camera questions, explain actual camera performance.
5. Discuss common complaints and negative feedback.
6. Do not invent customer reviews, ratings or statistics.
7. Distinguish manufacturer claims from customer experiences.
8. If reliable information is unavailable, say so.
9. Give a balanced and useful answer.
10. Keep your answer conversational and easy to understand.
`;

  const data = await geminiRequest({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],

    tools: [
      {
        google_search: {},
      },
    ],
  });

  const candidate = data.candidates?.[0];

  const parts = candidate?.content?.parts ?? [];

  const reply = parts
    .map((part: { text?: string }) => part.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();

  const groundingMetadata =
    candidate?.groundingMetadata;

  const groundingChunks =
    groundingMetadata?.groundingChunks ?? [];

  // Extract and remove duplicate sources.
  const sourceMap = new Map<
    string,
    { title: string; uri: string }
  >();

  for (const chunk of groundingChunks) {
    if (chunk.web?.uri) {
      sourceMap.set(chunk.web.uri, {
        title:
          chunk.web.title || chunk.web.uri,
        uri: chunk.web.uri,
      });
    }
  }

  const sources = Array.from(sourceMap.values());

  return {
    reply:
      reply ||
      "I couldn't find reliable information about this product.",

    sources,

    searchQueries:
      groundingMetadata?.webSearchQueries ?? [],
  };
}
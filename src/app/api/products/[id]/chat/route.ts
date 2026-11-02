import { NextRequest, NextResponse } from "next/server";
import { query, toVectorLiteral } from "@/lib/db";
import {
  callGeminiWithTools,
  callGeminiWithGoogleSearch,
  GeminiFunctionDeclaration,
  GeminiMessage,
} from "@/lib/gemini";

// ==========================================
// GEMINI FUNCTION DECLARATIONS
// ==========================================

const FUNCTIONS: GeminiFunctionDeclaration[] = [
  {
    name: "getPriceHistory",
    description:
      "Get the minimum, maximum, average and current price for this product.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "compareAcrossPlatforms",
    description:
      "Compare this product's price across different shopping platforms.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getSimilarProducts",
    description:
      "Find similar products that can be used as alternatives.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

// ==========================================
// GET PRICE HISTORY
// ==========================================

async function getPriceHistory(productId: string) {
  const rows = await query<{
    min: string | null;
    max: string | null;
    avg: string | null;
    current: string | null;
    days: string | null;
  }>(
    `
    SELECT
      MIN(price) AS min,
      MAX(price) AS max,
      AVG(price) AS avg,
      (
        SELECT price
        FROM price_history
        WHERE product_id = $1
        ORDER BY scraped_at DESC
        LIMIT 1
      ) AS current,
      EXTRACT(DAY FROM now() - MIN(scraped_at)) AS days
    FROM price_history
    WHERE product_id = $1
    `,
    [productId]
  );

  const r = rows[0];

  if (!r || r.current == null) {
    return { tracked: false };
  }

  return {
    tracked: true,
    lowestPrice: Number(r.min),
    highestPrice: Number(r.max),
    averagePrice: Math.round(Number(r.avg)),
    currentPrice: Number(r.current),
    daysTracked: Number(r.days ?? 0),
  };
}

// ==========================================
// COMPARE PRICES ACROSS PLATFORMS
// ==========================================

async function compareAcrossPlatforms(productId: string) {
  const rows = await query<{
    platform: string;
    current_price: string | null;
    rating: string | null;
  }>(
    `
    SELECT
      platform,
      current_price,
      rating
    FROM products
    WHERE id = $1

    UNION ALL

    SELECT
      p.platform,
      p.current_price,
      p.rating
    FROM product_matches m
    JOIN products p
      ON p.id = m.matched_product_id
    WHERE m.product_id = $1
    `,
    [productId]
  );

  const listings = rows
    .filter((r) => r.current_price != null)
    .map((r) => ({
      platform: r.platform,
      price: Number(r.current_price),
      rating: r.rating ? Number(r.rating) : null,
    }));

  if (listings.length === 0) {
    return {
      listings: [],
      note: "No prices recorded yet.",
    };
  }

  if (listings.length === 1) {
    return {
      listings,
      note: "Only the original listing is tracked.",
    };
  }

  const cheapest = listings.reduce((a, b) =>
    b.price < a.price ? b : a
  );

  return {
    listings,
    cheapestPlatform: cheapest.platform,
    cheapestPrice: cheapest.price,
  };
}

// ==========================================
// FIND SIMILAR PRODUCTS
// ==========================================

async function getSimilarProducts(productId: string) {
  const rows = await query<{
    id: string;
    embedding: number[] | null;
  }>(
    `
    SELECT id, embedding
    FROM products
    WHERE id = $1
    `,
    [productId]
  );

  if (!rows[0]?.embedding) {
    return { similar: [] };
  }

  const similar = await query<{
    id: string;
    title: string;
    current_price: string | null;
  }>(
    `
    SELECT
      id,
      title,
      current_price
    FROM products
    WHERE id != $1
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $2
    LIMIT 5
    `,
    [
      productId,
      toVectorLiteral(rows[0].embedding),
    ]
  );

  return {
    similar: similar.map((s) => ({
      id: s.id,
      title: s.title,
      price:
        s.current_price != null
          ? Number(s.current_price)
          : null,
    })),
  };
}

// ==========================================
// EXECUTE GEMINI FUNCTIONS
// ==========================================

async function executeFunction(
  name: string,
  productId: string
): Promise<Record<string, unknown>> {
  switch (name) {
    case "getPriceHistory":
      return await getPriceHistory(productId);

    case "compareAcrossPlatforms":
      return await compareAcrossPlatforms(productId);

    case "getSimilarProducts":
      return await getSimilarProducts(productId);

    default:
      return {
        error: `Unknown function: ${name}`,
      };
  }
}

// ==========================================
// SYSTEM INSTRUCTION
// ==========================================

const SYSTEM_INSTRUCTION = `
You are Price Advisor, an intelligent shopping assistant.

Your job is to help users make better purchasing decisions.

You can access:

1. Product price history from the database.
2. Price comparisons across shopping platforms.
3. Similar products and alternatives.
4. Internet-based product research through Google Search.

IMPORTANT RULES:

- Use database tools for price history and price comparisons.
- Use internet search for product reviews and product research.
- Never invent prices, reviews, ratings or specifications.
- Clearly distinguish database information from internet research.
- If information is unavailable, clearly say so.
- Explain whether a product is worth buying when sufficient information exists.
- Keep answers conversational, helpful and easy to understand.
- Mention actual numbers whenever available.
- You can call multiple database tools when necessary.
`;

// ==========================================
// DETECT INTERNET RESEARCH QUESTIONS
// ==========================================

function needsWebResearch(message: string): boolean {
  const pattern =
    /\b(review|reviews|battery|camera|display|screen|performance|heating|overheating|durability|build quality|pros|cons|complaints|customer feedback|worth buying|real.world|how is|quality|user experience|long.term use)\b/i;

  return pattern.test(message);
}

// ==========================================
// POST API ROUTE
// ==========================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const productId = (await params).id;

    const { message, history } = (await req.json()) as {
      message: string;
      history?: Array<{
        role: "user" | "assistant";
        content: string;
      }>;
    };

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // ======================================
    // RETRIEVE PRODUCT
    // ======================================

    const product = await query<{
      title: string;
    }>(
      `
      SELECT title
      FROM products
      WHERE id = $1
      `,
      [productId]
    );

    if (!product.length) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const productTitle = product[0].title;

    // ======================================
    // INTERNET PRODUCT RESEARCH
    // ======================================

    if (needsWebResearch(message)) {
      const result = await callGeminiWithGoogleSearch(
        productTitle,
        message
      );

      return NextResponse.json({
        reply: result.reply,
        sources: result.sources,
        sourceType: "google_search",
        toolsUsed: ["google_search"],
      });
    }

    // ======================================
    // PREPARE CONVERSATION HISTORY
    // ======================================

    const messages: GeminiMessage[] = [
      ...(history ?? []).map((h) => ({
        role:
          h.role === "user"
            ? ("user" as const)
            : ("model" as const),
        parts: [{ text: h.content }],
      })),

      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const systemInstruction = `
      ${SYSTEM_INSTRUCTION}

      Current product: ${productTitle}
    `;

    let conversation: GeminiMessage[] = [...messages];

    const toolsUsed: string[] = [];

    const toolResults: Array<{
      name: string;
      result: Record<string, unknown>;
    }> = [];

    // ======================================
    // GEMINI TOOL-CALLING LOOP
    // ======================================

    const MAX_TOOL_ROUNDS = 5;

    for (
      let round = 0;
      round < MAX_TOOL_ROUNDS;
      round++
    ) {
      const result = await callGeminiWithTools(
        conversation,
        FUNCTIONS,
        systemInstruction
      );

      // Gemini finished generating its answer.

      if (
        result.text?.trim() &&
        result.functionCalls.length === 0
      ) {
        return NextResponse.json({
          reply: result.text,
          toolsUsed,
          toolResults,
          sources: [],
        });
      }

      // No function calls and no text.

      if (result.functionCalls.length === 0) {
        console.error(
          "Gemini returned no text:",
          result.finishReason,
          result.rawParts
        );

        return NextResponse.json({
          reply:
            "I couldn't generate a response. Please try again.",
          toolsUsed,
          toolResults,
          sources: [],
        });
      }

      if (!result.modelContent) {
        throw new Error(
          "Gemini returned no original model content."
        );
      }

      // Preserve original Gemini response, including thought signatures.

      conversation.push(result.modelContent);

      // Execute requested database functions.

      const functionResponses = await Promise.all(
        result.functionCalls.map(async (call) => {
          const functionResult = await executeFunction(
            call.name,
            productId
          );

          toolsUsed.push(call.name);

          toolResults.push({
            name: call.name,
            result: functionResult,
          });

          return {
            functionResponse: {
              name: call.name,
              response: functionResult,
            },
          };
        })
      );

      // Send function results back to Gemini.

      conversation.push({
        role: "user",
        parts: functionResponses,
      });
    }

    // ======================================
    // MAXIMUM TOOL-CALL LIMIT REACHED
    // ======================================

    return NextResponse.json({
      reply:
        "I gathered product information but couldn't complete the analysis. Please try a more specific question.",
      toolsUsed,
      toolResults,
      sources: [],
    });

  } catch (error) {
    console.error("Product Chat API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong reaching the assistant.",
      },
      { status: 500 }
    );
  }
}
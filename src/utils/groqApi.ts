/**
 * Centralized GROQ API utility for CloudCrop AI
 * All AI-powered features route through this module.
 */

const GROQ_API_URL = "/api/groq";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * Send a chat completion request to the GROQ API
 */
export async function groqChat(
  messages: GroqMessage[],
  options: GroqOptions = {}
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.3,
    maxTokens = 2048,
    topP = 0.9,
  } = options;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      options: { model, temperature, maxTokens, topP },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("GROQ API error:", response.status, errorData);
    throw new Error(`GROQ API error: ${response.status}`);
  }

  const data = await response.json().catch(() => ({}));
  return data.content || "";
}

/**
 * Quick helper for single-prompt queries (system + user message)
 */
export async function groqQuery(
  prompt: string,
  systemPrompt: string = "You are a helpful agricultural AI assistant for Indian farmers.",
  options: GroqOptions = {}
): Promise<string> {
  return groqChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    options
  );
}

/**
 * Helper that sends a prompt and parses the response as JSON.
 * Handles markdown code fences and extracts JSON from the response.
 */
export async function groqJsonQuery<T>(
  prompt: string,
  systemPrompt: string = "You are a data API. Return ONLY valid JSON with no extra text, no markdown, no explanations.",
  options: GroqOptions = {}
): Promise<T> {
  const raw = await groqChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    { temperature: 0.1, ...options }
  );

  // Clean the response: strip markdown code fences, find JSON
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Try to find a JSON array or object
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  // Fallback: try parsing the whole cleaned string
  return JSON.parse(cleaned);
}

/**
 * Batch-translates UI strings to target language.
 * Splits large arrays into chunks to avoid token limits.
 * Returns translated strings (falls back to originals on error).
 */
export async function groqTranslate(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  if (!texts.length || targetLang === "en") return texts;

  const langNames: Record<string, string> = {
    hi: "Hindi", te: "Telugu", ta: "Tamil", mr: "Marathi",
    bn: "Bengali", pa: "Punjabi", gu: "Gujarati", kn: "Kannada",
    ml: "Malayalam", ur: "Urdu", or: "Odia", as: "Assamese",
    bho: "Bhojpuri",
  };

  const langName = langNames[targetLang] || targetLang;
  const CHUNK_SIZE = 30; // Stay within GROQ token limits per request

  /**
   * Translate a single chunk and parse the JSON array response.
   */
  async function translateChunk(chunk: string[]): Promise<string[]> {
    const raw = await groqChat(
      [
        {
          role: "system",
          content: `You are a professional translator. Translate the provided JSON array of UI strings to ${langName}. Rules: (1) Return ONLY a valid JSON array with no preamble or explanation. (2) Keep "CloudCrop AI" unchanged. (3) Output array MUST have exactly the same number of elements as the input.`,
        },
        { role: "user", content: JSON.stringify(chunk) },
      ],
      { temperature: 0.1, maxTokens: 4096 }
    );

    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length === chunk.length) {
        return parsed as string[];
      }
    }
    // Return originals if parse fails
    return chunk;
  }

  try {
    // Split into chunks
    const chunks: string[][] = [];
    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
      chunks.push(texts.slice(i, i + CHUNK_SIZE));
    }

    // Translate each chunk sequentially (avoids rate limiting)
    const results: string[] = [];
    for (const chunk of chunks) {
      const translated = await translateChunk(chunk);
      results.push(...translated);
    }

    return results.length === texts.length ? results : texts;
  } catch (error) {
    console.error("Batch translation error:", error);
    return texts;
  }
}

/**
 * Health check — verifies the /api/groq endpoint is reachable and GROQ_API_KEY is configured.
 * Useful for diagnosing translation failures.
 */
export async function checkGroqApiHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        options: { maxTokens: 5 },
      }),
    });
    if (response.ok) return { ok: true };
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data?.error || `HTTP ${response.status}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export { GROQ_API_URL, DEFAULT_MODEL };

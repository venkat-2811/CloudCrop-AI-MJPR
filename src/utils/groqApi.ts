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
 * Circuit breaker to prevent flooding the API when it's unavailable.
 * After 3 consecutive failures, pauses all requests for 30 seconds.
 */
let _circuitFailures = 0;
let _circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 30_000;

function checkCircuit(): void {
  if (_circuitOpenUntil > 0 && Date.now() > _circuitOpenUntil) {
    // Reset circuit after timeout
    _circuitFailures = 0;
    _circuitOpenUntil = 0;
  }
  if (_circuitOpenUntil > 0) {
    throw new Error("API temporarily unavailable (circuit breaker open). Will retry automatically in a few seconds.");
  }
}

function recordSuccess(): void {
  _circuitFailures = 0;
  _circuitOpenUntil = 0;
}

function recordFailure(): void {
  _circuitFailures++;
  if (_circuitFailures >= CIRCUIT_THRESHOLD) {
    _circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
    console.warn(`GROQ API circuit breaker opened after ${_circuitFailures} failures. Will retry in ${CIRCUIT_RESET_MS / 1000}s.`);
  }
}

/**
 * Send a chat completion request to the GROQ API
 */
export async function groqChat(
  messages: GroqMessage[],
  options: GroqOptions = {}
): Promise<string> {
  // Check circuit breaker before making request
  checkCircuit();

  const {
    model = DEFAULT_MODEL,
    temperature = 0.3,
    maxTokens = 2048,
    topP = 0.9,
  } = options;

  try {
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
      recordFailure();
      throw new Error(`GROQ API error: ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    recordSuccess();
    return data.content || "";
  } catch (error: any) {
    // Only record failure for network errors (not already recorded above)
    if (!error?.message?.includes("GROQ API error:") && !error?.message?.includes("circuit breaker")) {
      recordFailure();
    }
    throw error;
  }
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
 * Uses retry logic and per-item fallback for robustness.
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
  const CHUNK_SIZE = 15; // Smaller chunks for more reliable LLM output

  /**
   * Extract a JSON array from a potentially messy LLM response.
   */
  function extractJsonArray(raw: string): any[] | null {
    // Strip markdown fences, explanatory text, etc.
    let cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .replace(/^[^[]*/, "") // remove everything before first [
      .replace(/][^]]*$/, "]") // remove everything after last ]
      .trim();

    // Try to find a JSON array
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Try fixing common issues: trailing commas, unescaped quotes
        try {
          const fixed = jsonMatch[0]
            .replace(/,\s*]/g, "]")
            .replace(/,\s*}/g, "}");
          const parsed = JSON.parse(fixed);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // give up
        }
      }
    }
    return null;
  }

  /**
   * Translate a single chunk with one retry on failure.
   */
  async function translateChunk(chunk: string[], attempt = 0): Promise<string[]> {
    try {
      const raw = await groqChat(
        [
          {
            role: "system",
            content: `You are a JSON translation API. Translate the input JSON array of short UI strings into ${langName}. CRITICAL RULES:\n1. Output ONLY a raw JSON array — no markdown, no explanation, no code fences.\n2. The output array MUST contain EXACTLY ${chunk.length} elements.\n3. Keep the brand name "CloudCrop AI" unchanged.\n4. Each translated string should be concise (similar length to original).`,
          },
          { role: "user", content: JSON.stringify(chunk) },
        ],
        { temperature: 0.1, maxTokens: 4096 }
      );

      const parsed = extractJsonArray(raw);

      if (parsed && parsed.length === chunk.length) {
        // Ensure all items are strings, fall back to original for non-strings
        return parsed.map((item, i) =>
          typeof item === "string" && item.trim() ? item : chunk[i]
        );
      }

      // If parsed but wrong length, try to salvage what we can
      if (parsed && parsed.length > 0) {
        console.warn(`Translation chunk: expected ${chunk.length} items, got ${parsed.length}. Salvaging...`);
        return chunk.map((original, i) => {
          const translated = parsed[i];
          return typeof translated === "string" && translated.trim() ? translated : original;
        });
      }

      // Retry once
      if (attempt < 1) {
        console.warn("Translation parse failed, retrying chunk...");
        return translateChunk(chunk, attempt + 1);
      }

      console.warn("Translation chunk failed after retry, using originals");
      return chunk;
    } catch (error) {
      if (attempt < 1) {
        console.warn("Translation chunk error, retrying:", error);
        // Small delay before retry
        await new Promise(r => setTimeout(r, 500));
        return translateChunk(chunk, attempt + 1);
      }
      console.error("Translation chunk failed after retry:", error);
      return chunk;
    }
  }

  try {
    // Split into chunks
    const chunks: string[][] = [];
    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
      chunks.push(texts.slice(i, i + CHUNK_SIZE));
    }

    // Translate each chunk sequentially (avoids rate limiting)
    const results: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const translated = await translateChunk(chunks[i]);
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
 * Respects the circuit breaker: if the circuit is open, returns unhealthy immediately.
 */
export async function checkGroqApiHealth(): Promise<{ ok: boolean; error?: string }> {
  // If circuit breaker is open, skip the request
  if (_circuitOpenUntil > 0 && Date.now() < _circuitOpenUntil) {
    return { ok: false, error: "API temporarily unavailable" };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        options: { maxTokens: 5 },
      }),
    });
    if (response.ok) {
      recordSuccess();
      return { ok: true };
    }
    const data = await response.json().catch(() => ({}));
    recordFailure();
    return { ok: false, error: data?.error || `HTTP ${response.status}` };
  } catch (e: any) {
    recordFailure();
    return { ok: false, error: e?.message || "Network error" };
  }
}

export { GROQ_API_URL, DEFAULT_MODEL };

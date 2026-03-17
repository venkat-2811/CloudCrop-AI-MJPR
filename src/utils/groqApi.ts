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
 * Translation helper using GROQ
 */
export async function groqTranslate(
  text: string,
  targetLang: string
): Promise<string> {
  if (!text.trim() || targetLang === "en") return text;

  const langNames: Record<string, string> = {
    hi: "Hindi", te: "Telugu", ta: "Tamil", mr: "Marathi",
    bn: "Bengali", pa: "Punjabi", gu: "Gujarati", kn: "Kannada",
    ml: "Malayalam", ur: "Urdu", or: "Odia", as: "Assamese", sa: "Sanskrit",
  };

  const langName = langNames[targetLang] || targetLang;

  return groqChat(
    [
      { role: "system", content: `You are a translator. Translate the given text to ${langName}. Return ONLY the translated text, nothing else. Keep brand names like "CloudCrop AI" unchanged.` },
      { role: "user", content: text },
    ],
    { temperature: 0.2, maxTokens: 500 }
  );
}

/**
 * Batch translation helper
 */
export async function groqBatchTranslate(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  if (!texts.length || targetLang === "en") return texts;

  const langNames: Record<string, string> = {
    hi: "Hindi", te: "Telugu", ta: "Tamil", mr: "Marathi",
    bn: "Bengali", pa: "Punjabi", gu: "Gujarati", kn: "Kannada",
    ml: "Malayalam", ur: "Urdu", or: "Odia", as: "Assamese", sa: "Sanskrit",
  };

  const langName = langNames[targetLang] || targetLang;
  const joined = texts.map((t, i) => `[${i}] ${t}`).join("\n");

  try {
    const result = await groqChat(
      [
        {
          role: "system",
          content: `You are a translator. Translate each numbered line to ${langName}. Return ONLY the translated lines in the same numbered format [0], [1], etc. Keep brand names like "CloudCrop AI" unchanged.`,
        },
        { role: "user", content: joined },
      ],
      { temperature: 0.2, maxTokens: 2000 }
    );

    // Parse numbered output
    const lines = result.split("\n").filter((l) => l.trim());
    const translated: string[] = [...texts]; // fallback to originals

    lines.forEach((line) => {
      const match = line.match(/^\[(\d+)\]\s*(.+)/);
      if (match) {
        const idx = parseInt(match[1]);
        if (idx >= 0 && idx < texts.length) {
          translated[idx] = match[2].trim();
        }
      }
    });

    return translated;
  } catch (error) {
    console.error("Batch translation error:", error);
    return texts; // fallback
  }
}

export { GROQ_API_URL, DEFAULT_MODEL };

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "missing_groq_api_key" });
    return;
  }

  const { messages, options } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "missing_messages" });
    return;
  }

  const model = options?.model || DEFAULT_MODEL;
  const temperature = options?.temperature ?? 0.3;
  const maxTokens = options?.maxTokens ?? 2048;
  const topP = options?.topP ?? 0.9;

  try {
    const upstream = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
      }),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error("GROQ upstream error:", upstream.status, text);
      res.status(502).json({ error: "groq_upstream_error", status: upstream.status });
      return;
    }

    const data = JSON.parse(text);
    res.status(200).json({ content: data.choices?.[0]?.message?.content || "" });
  } catch (e) {
    console.error("GROQ proxy error:", e);
    res.status(500).json({ error: "server_error" });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Empathy AI reply scaffold.
 * Set one of: OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY
 * Optional: AI_PROVIDER = openai | groq | gemini
 *
 * Body: { sessionId, messages: {role, content}[], visitorName? }
 * Returns: { reply: string }
 *
 * You can also trigger from Telegram with /ai later.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const provider =
    (process.env.AI_PROVIDER as string) ||
    (process.env.GROQ_API_KEY
      ? "groq"
      : process.env.OPENAI_API_KEY
        ? "openai"
        : process.env.GEMINI_API_KEY
          ? "gemini"
          : null);

  if (!provider) {
    return res.status(503).json({
      error: "No AI key configured. Add GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.",
    });
  }

  const { messages, visitorName } = req.body as {
    sessionId?: string;
    visitorName?: string;
    messages?: { role: string; content: string }[];
  };

  if (!messages?.length) {
    return res.status(400).json({ error: "messages required" });
  }

  const system = `You are a warm, deeply empathetic human listener on "Listener".
You are not a therapist and you do not diagnose.
You respond with 100% empathy: validate feelings, stay present, ask gentle questions when helpful, never lecture.
Keep replies short to medium, natural, and kind.
If the person seems in immediate danger, gently encourage reaching local emergency help.
${visitorName ? `Their name is ${visitorName} — use it sparingly and warmly.` : ""}`;

  try {
    let reply = "";

    if (provider === "groq") {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: system }, ...messages],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const data = await r.json();
      reply = data.choices?.[0]?.message?.content || "";
    } else if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "system", content: system }, ...messages],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const data = await r.json();
      reply = data.choices?.[0]?.message?.content || "";
    } else if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        }
      );
      const data = await r.json();
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (!reply) return res.status(502).json({ error: "Empty AI reply" });
    return res.status(200).json({ reply: reply.trim() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "AI request failed" });
  }
}

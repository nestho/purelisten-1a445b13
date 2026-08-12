import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Forwards a visitor message to the operator Telegram chat.
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !chatId) {
    return res.status(500).json({ error: "Telegram not configured" });
  }

  const { sessionId, messageId, content, isNewSession } = req.body as {
    sessionId?: string;
    messageId?: string;
    content?: string;
    isNewSession?: boolean;
  };

  if (!sessionId || !content || typeof content !== "string") {
    return res.status(400).json({ error: "sessionId and content required" });
  }

  const text = content.trim().slice(0, 4000);
  if (!text) return res.status(400).json({ error: "Empty message" });

  const shortId = sessionId.slice(0, 8);
  const header = isNewSession
    ? `🆕 New talk session\n#${shortId}\n\n`
    : `#${shortId}\n`;
  const body = `${header}👤 Visitor:\n${text}\n\n↳ Reply to this message to answer on the website.`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: body,
        disable_web_page_preview: true,
      }),
    });

    const tgData = (await tgRes.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!tgData.ok) {
      return res.status(502).json({ error: tgData.description || "Telegram error" });
    }

    const telegramMessageId = tgData.result?.message_id;

    // Store telegram_message_id for reply threading
    if (telegramMessageId && messageId && supabaseUrl && serviceKey) {
      await fetch(`${supabaseUrl}/rest/v1/chat_messages?id=eq.${messageId}`, {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ telegram_message_id: telegramMessageId }),
      });
    }

    return res.status(200).json({ ok: true, telegramMessageId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to notify Telegram" });
  }
}

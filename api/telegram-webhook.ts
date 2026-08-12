import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Telegram webhook: when you reply to a bot message, push the reply into the chat session.
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowedChat = process.env.TELEGRAM_CHAT_ID;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Not configured" });
  }

  const update = req.body as {
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
      reply_to_message?: { message_id: number; text?: string };
    };
  };

  const msg = update.message;
  if (!msg?.text) {
    return res.status(200).json({ ok: true });
  }

  // Only accept messages from the operator chat
  if (allowedChat && String(msg.chat.id) !== String(allowedChat)) {
    return res.status(200).json({ ok: true });
  }

  const replyText = msg.text.trim();
  if (!replyText || replyText.startsWith("/")) {
    return res.status(200).json({ ok: true });
  }

  let sessionId: string | null = null;

  // Prefer reply-to → look up telegram_message_id
  if (msg.reply_to_message?.message_id) {
    const lookup = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?telegram_message_id=eq.${msg.reply_to_message.message_id}&select=session_id&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    const rows = (await lookup.json()) as { session_id: string }[];
    if (rows?.[0]?.session_id) sessionId = rows[0].session_id;
  }

  // Fallback: parse #xxxxxxxx from reply_to text or message text
  if (!sessionId) {
    const source = msg.reply_to_message?.text || replyText;
    const match = source.match(/#([a-f0-9]{8})/i);
    if (match) {
      const short = match[1].toLowerCase();
      const lookup = await fetch(
        `${supabaseUrl}/rest/v1/chat_sessions?id=like.${short}*&status=eq.open&select=id&order=created_at.desc&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const rows = (await lookup.json()) as { id: string }[];
      if (rows?.[0]?.id) sessionId = rows[0].id;
    }
  }

  if (!sessionId) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: msg.chat.id,
        text: "Could not find the chat session. Reply directly to a visitor message (swipe/reply).",
      }),
    });
    return res.status(200).json({ ok: true });
  }

  // Insert operator message
  await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      session_id: sessionId,
      role: "operator",
      content: replyText.slice(0, 4000),
    }),
  });

  return res.status(200).json({ ok: true });
}

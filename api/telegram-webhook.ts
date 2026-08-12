import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Telegram webhook.
 * You can just TYPE a reply in Telegram — it goes to the latest active open session.
 * Optional: reply-to a specific message still works if you want to target an older chat.
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

  if (allowedChat && String(msg.chat.id) !== String(allowedChat)) {
    return res.status(200).json({ ok: true });
  }

  const replyText = msg.text.trim();
  if (!replyText) {
    return res.status(200).json({ ok: true });
  }

  // Commands
  if (replyText.startsWith("/")) {
    if (replyText === "/active" || replyText.startsWith("/active")) {
      const active = await getActiveSession(supabaseUrl, serviceKey);
      await sendTg(
        token,
        msg.chat.id,
        active
          ? `Active session: #${active.id.slice(0, 8)}\nUpdated: ${active.updated_at}`
          : "No open session right now."
      );
    }
    return res.status(200).json({ ok: true });
  }

  let sessionId: string | null = null;

  // Optional: if you reply-to a specific Telegram message, use that session
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

  // Default: latest open session (most recent visitor activity)
  if (!sessionId) {
    const active = await getActiveSession(supabaseUrl, serviceKey);
    if (active) sessionId = active.id;
  }

  if (!sessionId) {
    await sendTg(
      token,
      msg.chat.id,
      "No open visitor chat right now. When someone writes on the website, just type here to answer."
    );
    return res.status(200).json({ ok: true });
  }

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

  // Confirm lightly (optional short ack — comment out if too noisy)
  // await sendTg(token, msg.chat.id, `✓ sent to #${sessionId.slice(0, 8)}`);

  return res.status(200).json({ ok: true });
}

async function getActiveSession(
  supabaseUrl: string,
  serviceKey: string
): Promise<{ id: string; updated_at: string } | null> {
  const lookup = await fetch(
    `${supabaseUrl}/rest/v1/chat_sessions?status=eq.open&select=id,updated_at&order=updated_at.desc&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  const rows = (await lookup.json()) as { id: string; updated_at: string }[];
  return rows?.[0] ?? null;
}

async function sendTg(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

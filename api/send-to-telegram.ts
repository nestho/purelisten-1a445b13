import type { VercelRequest, VercelResponse } from "@vercel/node";

type Body = {
  sessionId?: string;
  messageId?: string;
  content?: string;
  isNewSession?: boolean;
  mediaType?: string | null;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  mediaName?: string | null;
  visitorName?: string | null;
  ip?: string | null;
  country?: string | null;
  userAgent?: string | null;
};

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

  const body = req.body as Body;
  const {
    sessionId,
    messageId,
    content,
    isNewSession,
    mediaType,
    mediaUrl,
    mediaName,
    visitorName,
    ip,
    country,
    userAgent,
  } = body;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }

  const text = (content || "").trim().slice(0, 4000);
  if (!text && !mediaUrl) {
    return res.status(400).json({ error: "content or media required" });
  }

  if (supabaseUrl && serviceKey) {
    await fetch(`${supabaseUrl}/rest/v1/chat_sessions?id=eq.${sessionId}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ updated_at: new Date().toISOString(), status: "open" }),
    });
  }

  const shortId = sessionId.slice(0, 8);
  const nameLine = visitorName ? `Name: ${visitorName}` : "Name: (not given)";
  const metaBlock = isNewSession
    ? [
        "🆕 New conversation",
        `#${shortId}`,
        nameLine,
        ip ? `IP: ${ip}` : null,
        country ? `Country: ${country}` : null,
        userAgent ? `Device: ${userAgent.slice(0, 120)}` : null,
        "",
      ]
        .filter(Boolean)
        .join("\n")
    : `💬 #${shortId}${visitorName ? ` · ${visitorName}` : ""}`;

  const caption =
    `${metaBlock}\n👤 ${text || "(media)"}\n\n✍️ Type to reply — goes to them automatically.`.slice(
      0,
      1024
    );

  try {
    let tgData: { ok: boolean; result?: { message_id: number }; description?: string };

    if (mediaUrl && mediaType === "image") {
      tgData = await tgApi(token, "sendPhoto", { chat_id: chatId, photo: mediaUrl, caption });
    } else if (mediaUrl && (mediaType === "voice" || mediaType === "audio")) {
      const method = mediaType === "voice" ? "sendVoice" : "sendAudio";
      const field = mediaType === "voice" ? "voice" : "audio";
      tgData = await tgApi(token, method, { chat_id: chatId, [field]: mediaUrl, caption });
    } else if (mediaUrl && mediaType === "video") {
      tgData = await tgApi(token, "sendVideo", { chat_id: chatId, video: mediaUrl, caption });
    } else if (mediaUrl && mediaType !== "link") {
      tgData = await tgApi(token, "sendDocument", {
        chat_id: chatId,
        document: mediaUrl,
        caption: caption + (mediaName ? `\n📎 ${mediaName}` : ""),
      });
    } else {
      const full =
        mediaType === "link" && mediaUrl
          ? `${caption}\n🔗 ${mediaUrl}`
          : caption;
      tgData = await tgApi(token, "sendMessage", {
        chat_id: chatId,
        text: full.slice(0, 4000),
        disable_web_page_preview: false,
      });
    }

    if (!tgData.ok && mediaUrl) {
      tgData = await tgApi(token, "sendMessage", {
        chat_id: chatId,
        text: `${caption}\n🔗 ${mediaUrl}`.slice(0, 4000),
      });
    }

    if (!tgData.ok) {
      return res.status(502).json({ error: tgData.description || "Telegram error" });
    }

    const telegramMessageId = tgData.result?.message_id;
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

async function tgApi(token: string, method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await r.json()) as {
    ok: boolean;
    result?: { message_id: number };
    description?: string;
  };
}

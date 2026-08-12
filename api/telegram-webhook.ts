import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Receives any Telegram message type from the operator and posts it into the active web session.
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
    message?: TelegramMessage;
  };

  const msg = update.message;
  if (!msg) return res.status(200).json({ ok: true });

  if (allowedChat && String(msg.chat.id) !== String(allowedChat)) {
    return res.status(200).json({ ok: true });
  }

  if (msg.text?.startsWith("/")) {
    if (msg.text.startsWith("/active")) {
      const active = await getActiveSession(supabaseUrl, serviceKey);
      await sendTg(
        token,
        msg.chat.id,
        active
          ? `Active session: #${active.id.slice(0, 8)}`
          : "No open session."
      );
    }
    return res.status(200).json({ ok: true });
  }

  const sessionId = await resolveSessionId(msg, supabaseUrl, serviceKey);
  if (!sessionId) {
    await sendTg(
      token,
      msg.chat.id,
      "No open visitor chat. When someone writes on the site, just send text/photo/voice here."
    );
    return res.status(200).json({ ok: true });
  }

  const parsed = await parseIncomingMedia(msg, token);
  if (!parsed) {
    return res.status(200).json({ ok: true });
  }

  let mediaUrl: string | null = parsed.mediaUrl;
  // Re-host Telegram files on Supabase Storage so the website can play them reliably
  if (parsed.fileId && parsed.mediaType !== "text" && parsed.mediaType !== "link") {
    const hosted = await mirrorTelegramFile(
      token,
      parsed.fileId,
      parsed.mediaType,
      parsed.mediaName,
      supabaseUrl,
      serviceKey
    );
    if (hosted) mediaUrl = hosted;
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
      content: parsed.content,
      media_type: parsed.mediaType,
      media_url: mediaUrl,
      media_mime: parsed.mediaMime,
      media_name: parsed.mediaName,
    }),
  });

  return res.status(200).json({ ok: true });
}

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  reply_to_message?: { message_id: number; text?: string };
  photo?: { file_id: string; width: number }[];
  voice?: { file_id: string; mime_type?: string };
  audio?: { file_id: string; mime_type?: string; file_name?: string };
  video?: { file_id: string; mime_type?: string; file_name?: string };
  document?: { file_id: string; mime_type?: string; file_name?: string };
  sticker?: { file_id: string; file_size?: number };
  animation?: { file_id: string; mime_type?: string };
};

async function resolveSessionId(
  msg: TelegramMessage,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
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
    if (rows?.[0]?.session_id) return rows[0].session_id;
  }

  const active = await getActiveSession(supabaseUrl, serviceKey);
  return active?.id ?? null;
}

async function getActiveSession(supabaseUrl: string, serviceKey: string) {
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

async function parseIncomingMedia(
  msg: TelegramMessage,
  _token: string
): Promise<{
  content: string | null;
  mediaType: string;
  mediaUrl: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  fileId: string | null;
} | null> {
  const caption = msg.caption || null;

  if (msg.photo?.length) {
    const best = msg.photo[msg.photo.length - 1];
    return {
      content: caption,
      mediaType: "image",
      mediaUrl: null,
      mediaMime: "image/jpeg",
      mediaName: "photo.jpg",
      fileId: best.file_id,
    };
  }
  if (msg.voice) {
    return {
      content: caption,
      mediaType: "voice",
      mediaUrl: null,
      mediaMime: msg.voice.mime_type || "audio/ogg",
      mediaName: "voice.ogg",
      fileId: msg.voice.file_id,
    };
  }
  if (msg.audio) {
    return {
      content: caption,
      mediaType: "audio",
      mediaUrl: null,
      mediaMime: msg.audio.mime_type || "audio/mpeg",
      mediaName: msg.audio.file_name || "audio",
      fileId: msg.audio.file_id,
    };
  }
  if (msg.video || msg.animation) {
    const v = msg.video || msg.animation!;
    return {
      content: caption,
      mediaType: "video",
      mediaUrl: null,
      mediaMime: v.mime_type || "video/mp4",
      mediaName: ("file_name" in v && v.file_name) || "video.mp4",
      fileId: v.file_id,
    };
  }
  if (msg.document) {
    return {
      content: caption,
      mediaType: "file",
      mediaUrl: null,
      mediaMime: msg.document.mime_type || "application/octet-stream",
      mediaName: msg.document.file_name || "file",
      fileId: msg.document.file_id,
    };
  }
  if (msg.sticker) {
    return {
      content: caption || "🎟️",
      mediaType: "image",
      mediaUrl: null,
      mediaMime: "image/webp",
      mediaName: "sticker.webp",
      fileId: msg.sticker.file_id,
    };
  }
  if (msg.text) {
    const isLink = /^https?:\/\/\S+$/i.test(msg.text.trim());
    return {
      content: msg.text.trim().slice(0, 4000),
      mediaType: isLink ? "link" : "text",
      mediaUrl: isLink ? msg.text.trim() : null,
      mediaMime: null,
      mediaName: null,
      fileId: null,
    };
  }
  return null;
}

async function mirrorTelegramFile(
  token: string,
  fileId: string,
  mediaType: string,
  mediaName: string | null,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const pathRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const pathData = (await pathRes.json()) as {
      ok: boolean;
      result?: { file_path: string };
    };
    if (!pathData.ok || !pathData.result?.file_path) return null;

    const filePath = pathData.result.file_path;
    const fileRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${filePath}`
    );
    if (!fileRes.ok) return null;
    const buf = Buffer.from(await fileRes.arrayBuffer());

    const ext = filePath.split(".").pop() || "bin";
    const objectName = `operator/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType =
      fileRes.headers.get("content-type") ||
      (mediaType === "image"
        ? "image/jpeg"
        : mediaType === "voice"
          ? "audio/ogg"
          : mediaType === "video"
            ? "video/mp4"
            : "application/octet-stream");

    const upload = await fetch(
      `${supabaseUrl}/storage/v1/object/chat-media/${objectName}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: buf,
      }
    );

    if (!upload.ok) {
      console.error("storage upload failed", await upload.text());
      return null;
    }

    return `${supabaseUrl}/storage/v1/object/public/chat-media/${objectName}`;
  } catch (e) {
    console.error("mirrorTelegramFile", e);
    return null;
  }
}

async function sendTg(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

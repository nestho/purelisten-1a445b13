import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Send,
  Loader2,
  Paperclip,
  Mic,
  FileText,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import VoicePlayer from "@/components/VoicePlayer";

type Msg = {
  id: string;
  role: "visitor" | "operator" | "system";
  content: string | null;
  media_type?: string | null;
  media_url?: string | null;
  media_mime?: string | null;
  media_name?: string | null;
  created_at: string;
};

function getVisitorKey() {
  const key = "listener_visitor_key";
  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}

function detectMediaType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) {
    if (
      file.type.includes("ogg") ||
      file.type.includes("webm") ||
      file.name.startsWith("voice")
    ) {
      return "voice";
    }
    return "audio";
  }
  return "file";
}

const MediaBubble = ({ m, outgoing }: { m: Msg; outgoing: boolean }) => {
  if (!m.media_url && !m.content) return null;

  const isVoice = m.media_type === "voice" || m.media_type === "audio";

  return (
    <div className="space-y-2">
      {m.media_type === "image" && m.media_url && (
        <a href={m.media_url} target="_blank" rel="noreferrer" className="block">
          <img
            src={m.media_url}
            alt={m.media_name || "image"}
            className="max-h-64 rounded-xl object-cover max-w-full shadow-soft"
            loading="lazy"
          />
        </a>
      )}

      {isVoice && m.media_url && (
        <VoicePlayer src={m.media_url} variant={outgoing ? "outgoing" : "incoming"} />
      )}

      {m.media_type === "video" && m.media_url && (
        <video
          controls
          src={m.media_url}
          className="max-h-64 rounded-xl max-w-full bg-black/40"
          playsInline
        />
      )}

      {m.media_type === "file" && m.media_url && (
        <a
          href={m.media_url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
            outgoing ? "bg-white/15" : "bg-muted/80"
          }`}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{m.media_name || "File"}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60 ml-auto" />
        </a>
      )}

      {m.media_type === "link" && m.media_url && (
        <a
          href={m.media_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 underline underline-offset-2 break-all text-sm opacity-95"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {m.content && m.content !== m.media_url ? m.content : m.media_url}
        </a>
      )}

      {m.content && m.media_type !== "link" && (
        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
      )}
      {m.content && m.media_type === "text" && !m.media_url && (
        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
      )}
      {!m.media_type && m.content && (
        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
      )}
    </div>
  );
};

const ChatPanel = ({
  mode,
  onClose,
}: {
  mode: "talk" | "listen";
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const isNewSession = useRef(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      try {
        const visitorKey = getVisitorKey();
        const { data: session, error: sErr } = await supabase
          .from("chat_sessions" as never)
          .insert({
            visitor_key: visitorKey,
            mode,
            status: "open",
          } as never)
          .select("id")
          .single();

        if (sErr) throw sErr;
        const sid = (session as { id: string }).id;
        if (cancelled) return;
        setSessionId(sid);

        const welcome =
          mode === "talk"
            ? t(
                "chat.welcomeTalk",
                "You're connected. Send text, voice, photos, or video — a real person replies here."
              )
            : t(
                "chat.welcomeListen",
                "Thanks for being willing to listen. You can message the host with any media."
              );

        setMessages([
          {
            id: "system-welcome",
            role: "system",
            content: welcome,
            created_at: new Date().toISOString(),
          },
        ]);

        channel = supabase
          .channel(`session-${sid}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "chat_messages",
              filter: `session_id=eq.${sid}`,
            },
            (payload) => {
              const row = payload.new as Msg;
              setMessages((prev) => {
                if (prev.some((m) => m.id === row.id)) return prev;
                return [...prev, row];
              });
            }
          )
          .subscribe();

        setReady(true);
      } catch (e) {
        console.error(e);
        setError(t("chat.initError", "Could not start chat. Check database setup."));
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      mediaRecorderRef.current?.stop();
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    };
  }, [mode, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `visitor/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const sendPayload = async (opts: { text?: string; file?: File }) => {
    if (!sessionId || sending) return;
    const text = (opts.text || "").trim().slice(0, 4000);
    if (!text && !opts.file) return;

    setSending(true);
    setError(null);

    try {
      let media_url: string | null = null;
      let media_type: string | null = text && !opts.file ? "text" : null;
      let media_mime: string | null = null;
      let media_name: string | null = null;

      if (opts.file) {
        media_type = detectMediaType(opts.file);
        media_mime = opts.file.type || null;
        media_name = opts.file.name;
        media_url = await uploadFile(opts.file);
      } else if (text && /^https?:\/\/\S+$/i.test(text)) {
        media_type = "link";
        media_url = text;
      }

      const { data, error: mErr } = await supabase
        .from("chat_messages" as never)
        .insert({
          session_id: sessionId,
          role: "visitor",
          content: text || null,
          media_type,
          media_url,
          media_mime,
          media_name,
        } as never)
        .select("id")
        .single();

      if (mErr) throw mErr;
      const messageId = (data as { id: string }).id;

      setMessages((prev) => {
        if (prev.some((m) => m.id === messageId)) return prev;
        return [
          ...prev,
          {
            id: messageId,
            role: "visitor",
            content: text || null,
            media_type,
            media_url,
            media_mime,
            media_name,
            created_at: new Date().toISOString(),
          },
        ];
      });

      const notifyNew = isNewSession.current;
      isNewSession.current = false;

      await fetch("/api/send-to-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messageId,
          content: text,
          isNewSession: notifyNew,
          mediaType: media_type,
          mediaUrl: media_url,
          mediaMime: media_mime,
          mediaName: media_name,
        }),
      });

      setInput("");
    } catch (e) {
      console.error(e);
      setError(t("chat.sendError", "Could not send. Try again."));
    } finally {
      setSending(false);
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      setRecordSecs(0);
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        await sendPayload({ file });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = window.setInterval(
        () => setRecordSecs((s) => s + 1),
        1000
      );
    } catch {
      setError(t("chat.micError", "Microphone permission denied."));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-md p-0 sm:p-6">
      <div className="w-full sm:max-w-md h-[94svh] sm:h-[min(720px,92vh)] rounded-t-[1.75rem] sm:rounded-[1.75rem] bg-[#12141a]/95 border border-white/8 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3.5 border-b border-white/6 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-warm shadow-glow">
              <span className="text-sm font-semibold text-white">L</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-hope ring-2 ring-[#12141a]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white/95">
                {mode === "talk"
                  ? t("chat.titleTalk", "Talk — someone is listening")
                  : t("chat.titleListen", "Listen mode")}
              </p>
              <p className="text-[11px] text-white/45 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-hope animate-pulse" />
                {t("chat.subtitle", "Live · private · human")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-2.5 scroll-smooth">
          {messages.map((m) => {
            if (m.role === "system") {
              return (
                <div key={m.id} className="flex justify-center py-2">
                  <p className="text-[11px] text-white/40 text-center max-w-[85%] leading-relaxed px-3">
                    {m.content}
                  </p>
                </div>
              );
            }
            const outgoing = m.role === "visitor";
            return (
              <div
                key={m.id}
                className={`flex ${outgoing ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                    outgoing
                      ? "bg-gradient-to-br from-[#f4865a] to-[#e86b3a] text-white rounded-br-md"
                      : "bg-[#1c1f28] text-white/90 border border-white/6 rounded-bl-md"
                  }`}
                >
                  <MediaBubble m={m} outgoing={outgoing} />
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-4 text-[11px] text-red-400 text-center pb-1">{error}</p>
        )}

        {/* Recording banner */}
        {recording && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-full bg-red-500/15 border border-red-500/25 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-300 tabular-nums">
              Recording {Math.floor(recordSecs / 60)}:
              {(recordSecs % 60).toString().padStart(2, "0")}
            </span>
            <span className="text-[11px] text-white/40 ml-auto">Tap mic to send</span>
          </div>
        )}

        {/* Composer */}
        <form
          className="p-3 pt-2 border-t border-white/6 flex gap-1.5 items-center bg-[#0e1015]/80"
          onSubmit={(e) => {
            e.preventDefault();
            void sendPayload({ text: input });
          }}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void sendPayload({ text: input, file: f });
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={!ready || sending}
            onClick={() => fileRef.current?.click()}
            className="h-10 w-10 rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/8 transition disabled:opacity-40"
            aria-label="Attach"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            disabled={!ready || sending}
            onClick={() => void toggleRecord()}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition disabled:opacity-40 ${
              recording
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                : "text-white/45 hover:text-white hover:bg-white/8"
            }`}
            aria-label="Voice"
          >
            <Mic className={`h-4.5 w-4.5 ${recording ? "animate-pulse" : ""}`} />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder", "Type a message…")}
            disabled={!ready || sending}
            maxLength={4000}
            className="flex-1 h-11 rounded-full bg-white/6 border-white/8 text-white placeholder:text-white/30 focus-visible:ring-primary/40"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!ready || sending || !input.trim()}
            className="h-10 w-10 rounded-full bg-gradient-warm border-0 shadow-soft disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;

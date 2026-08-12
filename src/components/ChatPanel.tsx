import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  Loader2,
  Paperclip,
  Mic,
  FileText,
  ExternalLink,
  Heart,
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

type Meta = {
  ip: string | null;
  country: string | null;
  userAgent: string | null;
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

const fieldClass =
  "w-full rounded-2xl border border-white/15 bg-[#1a1d26] px-4 text-[16px] leading-normal text-[#f3f0ea] placeholder:text-white/35 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/25 caret-[#f4865a] disabled:opacity-50";

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
            className="max-h-64 rounded-xl object-cover max-w-full"
            loading="lazy"
          />
        </a>
      )}
      {isVoice && m.media_url && (
        <VoicePlayer src={m.media_url} variant={outgoing ? "outgoing" : "incoming"} />
      )}
      {m.media_type === "video" && m.media_url && (
        <video controls src={m.media_url} className="max-h-64 rounded-xl max-w-full" playsInline />
      )}
      {m.media_type === "file" && m.media_url && (
        <a
          href={m.media_url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
            outgoing ? "bg-white/15" : "bg-white/5"
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
          className="inline-flex items-center gap-1.5 underline underline-offset-2 break-all text-sm"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {m.content && m.content !== m.media_url ? m.content : m.media_url}
        </a>
      )}
      {m.content && m.media_type !== "link" && (
        <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{m.content}</p>
      )}
      {(!m.media_type || m.media_type === "text") && m.content && !m.media_url && (
        <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{m.content}</p>
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
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<"name" | "chat">("name");
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [meta, setMeta] = useState<Meta>({ ip: null, country: null, userAgent: null });
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const isNewSession = useRef(true);
  const visitorNameRef = useRef("");

  useEffect(() => {
    fetch("/api/session-meta")
      .then((r) => r.json())
      .then((d) =>
        setMeta({
          ip: d.ip || null,
          country: d.country || null,
          userAgent: d.userAgent || navigator.userAgent,
        })
      )
      .catch(() =>
        setMeta({
          ip: null,
          country: null,
          userAgent: navigator.userAgent,
        })
      );
  }, []);

  const startChat = async (displayName: string) => {
    const clean = displayName.trim().slice(0, 40);
    if (!clean || starting) return;
    visitorNameRef.current = clean;
    setError(null);
    setStarting(true);

    try {
      const visitorKey = getVisitorKey();
      const { data: session, error: sErr } = await supabase
        .from("chat_sessions" as never)
        .insert({
          visitor_key: visitorKey,
          mode,
          status: "open",
          visitor_name: clean,
          ip: meta.ip,
          country: meta.country,
          user_agent: meta.userAgent || navigator.userAgent,
        } as never)
        .select("id")
        .single();

      if (sErr) throw sErr;
      const sid = (session as { id: string }).id;
      setSessionId(sid);
      setStep("chat");

      const welcome =
        i18n.language === "fa"
          ? `${clean} عزیز، خوش اومدی. هرچی روی قلبته، اینجا می‌تونی بگی. من اینجام و با دقت گوش می‌دم.`
          : `Welcome, ${clean}. Whatever is on your heart — you can say it here. I'm listening, without judgment.`;

      setMessages([
        {
          id: "system-welcome",
          role: "system",
          content: welcome,
          created_at: new Date().toISOString(),
        },
      ]);

      const channel = supabase
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
      (window as unknown as { __listenerChannel?: ReturnType<typeof supabase.channel> }).__listenerChannel =
        channel;
    } catch (e) {
      console.error(e);
      setError(t("chat.initError", "Could not start. Please try again."));
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      const ch = (window as unknown as { __listenerChannel?: ReturnType<typeof supabase.channel> })
        .__listenerChannel;
      if (ch) supabase.removeChannel(ch);
      mediaRecorderRef.current?.stop();
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    };
  }, []);

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
          visitorName: visitorNameRef.current,
          ip: meta.ip,
          country: meta.country,
          userAgent: meta.userAgent,
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
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await sendPayload({ file });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = window.setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch {
      setError(t("chat.micError", "Microphone permission denied."));
    }
  };

  if (step === "name") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-4 sm:p-6">
        <div className="w-full sm:max-w-md rounded-[1.75rem] bg-[#14161e] border border-white/10 shadow-2xl p-7 sm:p-8 space-y-6">
          <div className="flex justify-end -mt-1 -mr-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4865a]/15 ring-1 ring-[#f4865a]/35">
              <Heart className="h-6 w-6 text-[#f4865a]" />
            </div>
            <h2 className="font-serif text-[1.75rem] sm:text-[2rem] text-[#f5f2ec] leading-snug tracking-tight">
              {t("chat.askNameTitle", "Before we begin…")}
            </h2>
            <p className="text-[15px] text-white/60 leading-relaxed max-w-sm mx-auto">
              {t(
                "chat.askNameBody",
                "What should we call you? Just a first name is enough. This space is private — no judgment, only listening."
              )}
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void startChat(name);
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("chat.namePlaceholder", "Your name")}
              maxLength={40}
              autoFocus
              autoComplete="given-name"
              spellCheck={false}
              className={`${fieldClass} h-14 text-center text-[17px] font-medium`}
              style={{
                WebkitTextFillColor: "#f3f0ea",
                color: "#f3f0ea",
                backgroundColor: "#1a1d26",
              }}
            />
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <button
              type="submit"
              disabled={!name.trim() || starting}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#f4865a] to-[#e86b3a] text-white text-[16px] font-semibold shadow-lg shadow-[#e86b3a]/25 hover:opacity-95 disabled:opacity-40 transition"
            >
              {starting ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  …
                </span>
              ) : (
                t("chat.enterChat", "I'm ready to talk")
              )}
            </button>
            <p className="text-[12px] text-white/40 text-center leading-relaxed px-2">
              {t(
                "chat.namePrivacy",
                "We only use your name to speak to you kindly. You can share as much or as little as you want."
              )}
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-6">
      <div className="w-full sm:max-w-md h-[94svh] sm:h-[min(720px,92vh)] rounded-t-[1.75rem] sm:rounded-[1.75rem] bg-[#12141a] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3.5 border-b border-white/8 bg-[#161922]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f4865a] to-[#e86b3a]">
              <Heart className="h-4 w-4 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#6bcf8e] ring-2 ring-[#12141a]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[15px] text-[#f5f2ec] truncate">
                {visitorNameRef.current
                  ? t("chat.helloName", "Hi, {{name}}", { name: visitorNameRef.current })
                  : t("chat.titleTalk", "Someone is listening")}
              </p>
              <p className="text-[12px] text-white/50 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6bcf8e] animate-pulse" />
                {t("chat.subtitle", "Live · private · human")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
          {messages.map((m) => {
            if (m.role === "system") {
              return (
                <div key={m.id} className="flex justify-center py-3 px-3">
                  <p className="text-[13px] text-white/50 text-center max-w-[92%] leading-relaxed font-serif italic">
                    {m.content}
                  </p>
                </div>
              );
            }
            const outgoing = m.role === "visitor";
            return (
              <div key={m.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[84%] rounded-2xl px-4 py-2.5 ${
                    outgoing
                      ? "bg-gradient-to-br from-[#f4865a] to-[#e05a2e] text-white rounded-br-md"
                      : "bg-[#1c1f28] text-[#f0ede6] border border-white/10 rounded-bl-md"
                  }`}
                >
                  <MediaBubble m={m} outgoing={outgoing} />
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 text-sm text-red-400 text-center pb-1">{error}</p>}

        {recording && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-300 tabular-nums">
              {Math.floor(recordSecs / 60)}:{(recordSecs % 60).toString().padStart(2, "0")}
            </span>
            <span className="text-xs text-white/45 ml-auto">Tap mic to send</span>
          </div>
        )}

        <form
          className="p-3 pt-2 border-t border-white/8 flex gap-1.5 items-center bg-[#0e1015]"
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
            className="h-11 w-11 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 disabled:opacity-40"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!ready || sending}
            onClick={() => void toggleRecord()}
            className={`h-11 w-11 rounded-full flex items-center justify-center ${
              recording
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                : "text-white/55 hover:text-white hover:bg-white/10"
            }`}
          >
            <Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder", "Share what's on your mind…")}
            disabled={!ready || sending}
            maxLength={4000}
            className={`${fieldClass} flex-1 h-12 px-4 text-[15px]`}
            style={{
              WebkitTextFillColor: "#f3f0ea",
              color: "#f3f0ea",
              backgroundColor: "#1a1d26",
            }}
          />
          <button
            type="submit"
            disabled={!ready || sending || !input.trim()}
            className="h-11 w-11 rounded-full flex items-center justify-center bg-gradient-to-br from-[#f4865a] to-[#e86b3a] text-white disabled:opacity-40 shadow-md shadow-[#e86b3a]/20"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;

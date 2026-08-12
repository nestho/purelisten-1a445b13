import { useEffect, useRef, useState } from "react";
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
  "w-full rounded-full border border-black/[0.06] bg-[#f5f5f7] px-4 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none transition focus:border-black/10 focus:ring-2 focus:ring-black/5 caret-[#1d1d1f] disabled:opacity-50";

const MediaBubble = ({ m, outgoing }: { m: Msg; outgoing: boolean }) => {
  if (!m.media_url && !m.content) return null;

  const isVoice = m.media_type === "voice" || m.media_type === "audio";

  return (
    <div className="space-y-2">
      {m.media_type === "image" && m.media_url && (
        <a href={m.media_url} target="_blank" rel="noreferrer" className="block -mx-1">
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
            outgoing ? "bg-white/20" : "bg-black/[0.04]"
          }`}
        >
          <FileText className="h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">{m.media_name || "File"}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-50 ml-auto" />
        </a>
      )}

      {m.media_type === "link" && m.media_url && (
        <a
          href={m.media_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 underline underline-offset-2 break-all text-[14px] opacity-90"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {m.content && m.content !== m.media_url ? m.content : m.media_url}
        </a>
      )}

      {/* Single text render only — never duplicate */}
      {m.content && m.media_type !== "link" && (
        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45]">{m.content}</p>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const isNewSession = useRef(true);
  const visitorNameRef = useRef("");
  const seenIds = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (step === "name") {
      const tmr = window.setTimeout(() => nameRef.current?.focus(), 80);
      return () => clearTimeout(tmr);
    }
    if (step === "chat" && ready) {
      const tmr = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(tmr);
    }
  }, [step, ready]);

  const addMessage = (row: Msg) => {
    if (seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);
    setMessages((prev) => {
      if (prev.some((m) => m.id === row.id)) return prev;
      return [...prev, row];
    });
  };

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

      seenIds.current.add("system-welcome");
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
            addMessage(payload.new as Msg);
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

    // Clear input immediately for calm UX; refocus after
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());

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

      // Optimistic once — realtime deduped by seenIds
      addMessage({
        id: messageId,
        role: "visitor",
        content: text || null,
        media_type,
        media_url,
        media_mime,
        media_name,
        created_at: new Date().toISOString(),
      });

      const notifyNew = isNewSession.current;
      isNewSession.current = false;

      void fetch("/api/send-to-telegram", {
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
    } catch (e) {
      console.error(e);
      setError(t("chat.sendError", "Could not send. Try again."));
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
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

  // ——— Name ———
  if (step === "name") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xl p-4 sm:p-6">
        <div className="w-full sm:max-w-[400px] rounded-[24px] bg-white shadow-2xl shadow-black/20 p-8 space-y-7">
          <div className="flex justify-end -mt-2 -mr-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-black/[0.05] hover:text-[#1d1d1f] transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f7]">
              <span className="text-xl">💬</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
              {t("chat.askNameTitle", "Before we begin…")}
            </h2>
            <p className="text-[15px] text-[#6e6e73] leading-relaxed max-w-[300px] mx-auto">
              {t(
                "chat.askNameBody",
                "What should we call you? Just a first name is enough. This space is private — no judgment, only listening."
              )}
            </p>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void startChat(name);
            }}
          >
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("chat.namePlaceholder", "Your name")}
              maxLength={40}
              autoComplete="given-name"
              spellCheck={false}
              className={`${fieldClass} h-12 text-center text-[16px] font-medium`}
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              type="submit"
              disabled={!name.trim() || starting}
              className="w-full h-12 rounded-full bg-[#1d1d1f] text-white text-[15px] font-medium hover:bg-black disabled:opacity-30 transition active:scale-[0.99]"
            >
              {starting ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
              ) : (
                t("chat.enterChat", "I'm ready to talk")
              )}
            </button>
            <p className="text-[12px] text-[#86868b] text-center leading-relaxed pt-1">
              {t(
                "chat.namePrivacy",
                "We only use your name to speak to you kindly."
              )}
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ——— Chat ———
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xl p-0 sm:p-6">
      <div className="w-full sm:max-w-[400px] h-[94svh] sm:h-[min(680px,90vh)] rounded-t-[24px] sm:rounded-[24px] bg-white shadow-2xl shadow-black/20 flex flex-col overflow-hidden">
        {/* Header — Apple minimal */}
        <header className="flex items-center justify-between px-4 h-[56px] border-b border-black/[0.06] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f]">
              <span className="text-white text-sm">✦</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#34c759] ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[14px] text-[#1d1d1f] truncate leading-tight">
                {visitorNameRef.current
                  ? t("chat.helloName", "Hi, {{name}}", { name: visitorNameRef.current })
                  : t("chat.titleTalk", "Listener")}
              </p>
              <p className="text-[11px] text-[#86868b] leading-tight">
                {t("chat.subtitle", "Private · live · human")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-black/[0.05] hover:text-[#1d1d1f] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-[#fbfbfd]">
          {messages.map((m) => {
            if (m.role === "system") {
              return (
                <div key={m.id} className="flex justify-center py-4 px-2">
                  <p className="text-[13px] text-[#86868b] text-center max-w-[90%] leading-relaxed">
                    {m.content}
                  </p>
                </div>
              );
            }
            const outgoing = m.role === "visitor";
            return (
              <div key={m.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-[18px] px-3.5 py-2 ${
                    outgoing
                      ? "bg-[#1d1d1f] text-white rounded-br-[6px]"
                      : "bg-white text-[#1d1d1f] border border-black/[0.06] rounded-bl-[6px] shadow-sm shadow-black/[0.03]"
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
          <p className="px-4 text-[12px] text-red-500 text-center py-1">{error}</p>
        )}

        {recording && (
          <div className="mx-4 mb-1 flex items-center gap-2 rounded-full bg-red-50 border border-red-100 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[12px] text-red-600 tabular-nums font-medium">
              {Math.floor(recordSecs / 60)}:{(recordSecs % 60).toString().padStart(2, "0")}
            </span>
            <span className="text-[11px] text-[#86868b] ml-auto">Tap mic to send</span>
          </div>
        )}

        {/* Composer */}
        <form
          className="px-3 py-3 border-t border-black/[0.06] flex gap-1.5 items-center bg-white shrink-0"
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
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#86868b] hover:bg-black/[0.04] hover:text-[#1d1d1f] disabled:opacity-30 transition"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!ready || sending}
            onClick={() => void toggleRecord()}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition ${
              recording
                ? "bg-red-500 text-white"
                : "text-[#86868b] hover:bg-black/[0.04] hover:text-[#1d1d1f]"
            }`}
          >
            <Mic className={`h-4 w-4 ${recording ? "animate-pulse" : ""}`} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder", "Type a message…")}
            disabled={!ready || sending}
            maxLength={4000}
            className={`${fieldClass} flex-1 h-10`}
          />
          <button
            type="submit"
            disabled={!ready || sending || !input.trim()}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-[#1d1d1f] text-white disabled:opacity-20 transition active:scale-95"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;

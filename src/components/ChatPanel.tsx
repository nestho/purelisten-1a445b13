import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2, Paperclip, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

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
    return file.type.includes("ogg") || file.name.includes("voice") ? "voice" : "audio";
  }
  return "file";
}

const MediaBubble = ({ m }: { m: Msg }) => {
  if (!m.media_url && !m.content) return null;

  return (
    <div className="space-y-2">
      {m.media_type === "image" && m.media_url && (
        <a href={m.media_url} target="_blank" rel="noreferrer">
          <img
            src={m.media_url}
            alt={m.media_name || "image"}
            className="max-h-56 rounded-xl object-cover max-w-full"
          />
        </a>
      )}
      {(m.media_type === "voice" || m.media_type === "audio") && m.media_url && (
        <audio controls src={m.media_url} className="w-full max-w-[240px]" />
      )}
      {m.media_type === "video" && m.media_url && (
        <video controls src={m.media_url} className="max-h-56 rounded-xl max-w-full" />
      )}
      {m.media_type === "file" && m.media_url && (
        <a
          href={m.media_url}
          target="_blank"
          rel="noreferrer"
          className="underline text-sm break-all"
        >
          📎 {m.media_name || "Download file"}
        </a>
      )}
      {m.media_type === "link" && m.media_url && (
        <a href={m.media_url} target="_blank" rel="noreferrer" className="underline break-all">
          {m.media_url}
        </a>
      )}
      {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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

  const sendPayload = async (opts: {
    text?: string;
    file?: File;
  }) => {
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
        if (!text && /^https?:\/\//i.test(opts.file.name)) {
          media_type = "link";
        }
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
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await sendPayload({ file });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError(t("chat.micError", "Microphone permission denied."));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md p-0 sm:p-4">
      <div className="w-full sm:max-w-lg h-[92svh] sm:h-[min(680px,90vh)] glass-card rounded-t-3xl sm:rounded-3xl shadow-card flex flex-col overflow-hidden border border-border/60">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="live-dot" aria-hidden />
            <div>
              <p className="font-semibold text-sm">
                {mode === "talk"
                  ? t("chat.titleTalk", "Talk — someone is listening")
                  : t("chat.titleListen", "Listen mode")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("chat.subtitle", "Text · voice · photo · video")}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "visitor" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "visitor"
                    ? "bg-gradient-warm text-primary-foreground rounded-br-md"
                    : m.role === "system"
                      ? "bg-muted/60 text-muted-foreground text-center w-full max-w-full"
                      : "bg-card border border-border/60 text-foreground rounded-bl-md"
                }`}
              >
                {m.role === "system" ? m.content : <MediaBubble m={m} />}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 text-xs text-destructive text-center pb-1">{error}</p>}

        <form
          className="p-3 border-t border-border/50 flex gap-2 items-center"
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!ready || sending}
            onClick={() => fileRef.current?.click()}
            aria-label="Attach"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={recording ? "default" : "ghost"}
            size="icon"
            disabled={!ready || sending}
            onClick={() => void toggleRecord()}
            aria-label="Voice"
          >
            <Mic className={`h-4 w-4 ${recording ? "animate-pulse" : ""}`} />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder", "Message or paste a link…")}
            disabled={!ready || sending}
            maxLength={4000}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!ready || sending || !input.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;

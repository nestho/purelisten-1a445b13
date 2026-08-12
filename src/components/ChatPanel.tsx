import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

type Msg = {
  id: string;
  role: "visitor" | "operator" | "system";
  content: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);
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
                "You're connected. Write what you need to share — a real person will listen and reply here."
              )
            : t(
                "chat.welcomeListen",
                "Thanks for being willing to listen. When someone needs you, we'll guide you here. For now you can still chat with the host."
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
        setError(
          t(
            "chat.initError",
            "Could not start chat. Check that the database tables are set up."
          )
        );
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [mode, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!sessionId || !input.trim() || sending) return;
    const text = input.trim().slice(0, 4000);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const { data, error: mErr } = await supabase
        .from("chat_messages" as never)
        .insert({
          session_id: sessionId,
          role: "visitor",
          content: text,
        } as never)
        .select("id")
        .single();

      if (mErr) throw mErr;
      const messageId = (data as { id: string }).id;

      // Optimistic UI (realtime may also fire)
      setMessages((prev) => {
        if (prev.some((m) => m.id === messageId)) return prev;
        return [
          ...prev,
          {
            id: messageId,
            role: "visitor",
            content: text,
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
        }),
      });
    } catch (e) {
      console.error(e);
      setError(t("chat.sendError", "Message could not be sent. Try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md p-0 sm:p-4">
      <div className="w-full sm:max-w-lg h-[92svh] sm:h-[min(640px,90vh)] glass-card rounded-t-3xl sm:rounded-3xl shadow-card flex flex-col overflow-hidden border border-border/60">
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
                {t("chat.subtitle", "Private · live · human")}
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
              className={`flex ${
                m.role === "visitor" ? "justify-end" : "justify-start"
              }`}
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
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-4 text-xs text-destructive text-center pb-1">{error}</p>
        )}

        <form
          className="p-3 border-t border-border/50 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder", "Type a message…")}
            disabled={!ready || sending}
            maxLength={4000}
            className="flex-1"
            autoFocus
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

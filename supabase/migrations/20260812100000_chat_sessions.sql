-- Chat sessions + messages for Talk → Telegram bridge

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  mode TEXT NOT NULL DEFAULT 'talk' CHECK (mode IN ('talk', 'listen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('visitor', 'operator', 'system')),
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
  telegram_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor ON public.chat_sessions(visitor_key);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tg ON public.chat_messages(telegram_message_id) WHERE telegram_message_id IS NOT NULL;

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors can create sessions and insert their own messages
CREATE POLICY "Anyone can create sessions"
ON public.chat_sessions FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can read sessions"
ON public.chat_sessions FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update session status"
ON public.chat_sessions FOR UPDATE TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can insert messages"
ON public.chat_messages FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can read messages"
ON public.chat_messages FOR SELECT TO anon, authenticated
USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

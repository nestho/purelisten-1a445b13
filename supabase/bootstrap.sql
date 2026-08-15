-- Listener production bootstrap (run once in Supabase SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- Leads (optional waitlist / contact)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_method_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit leads" ON public.leads;
CREATE POLICY "Anyone can submit leads"
  ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique
  ON public.leads (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_unique
  ON public.leads (phone) WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.leads;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;

-- Chat sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  mode TEXT NOT NULL DEFAULT 'talk' CHECK (mode IN ('talk', 'listen')),
  visitor_name TEXT,
  ip TEXT,
  country TEXT,
  user_agent TEXT,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('visitor', 'operator', 'system')),
  content TEXT,
  media_type TEXT,
  media_url TEXT,
  media_mime TEXT,
  media_name TEXT,
  telegram_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_content_or_media;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_content_or_media CHECK (
    (content IS NOT NULL AND char_length(content) > 0)
    OR media_url IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor ON public.chat_sessions(visitor_key);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tg ON public.chat_messages(telegram_message_id)
  WHERE telegram_message_id IS NOT NULL;

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can update session status" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can read messages" ON public.chat_messages;

CREATE POLICY "Anyone can create sessions"
  ON public.chat_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read sessions"
  ON public.chat_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update session status"
  ON public.chat_sessions FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert messages"
  ON public.chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read messages"
  ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);

-- Realtime (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage bucket for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload chat-media" ON storage.objects;

CREATE POLICY "Public read chat-media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chat-media');

CREATE POLICY "Anyone can upload chat-media"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-media');

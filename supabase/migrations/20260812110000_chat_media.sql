-- Media support for chat messages
ALTER TABLE public.chat_messages
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS media_type TEXT
    CHECK (media_type IS NULL OR media_type IN ('text','image','voice','audio','video','file','link')),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_mime TEXT,
  ADD COLUMN IF NOT EXISTS media_name TEXT;

-- Allow empty text if media is present
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_content_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_content_or_media CHECK (
    (content IS NOT NULL AND char_length(content) > 0)
    OR media_url IS NOT NULL
  );

-- Storage bucket (run in dashboard if this fails: Storage → New bucket → chat-media, public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read chat-media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-media');

CREATE POLICY "Anyone can upload chat-media"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'chat-media');

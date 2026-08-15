# Production setup guide

## 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run [`supabase/bootstrap.sql`](../supabase/bootstrap.sql).
3. **Storage** → ensure bucket `chat-media` exists and is **public**.
4. **Database → Replication** → enable Realtime for `chat_messages` if not already.
5. Copy from **Settings → API**:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - Project ref → `VITE_SUPABASE_PROJECT_ID`

## 2. Telegram bot

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token.
2. Message your bot once from your personal account.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and find your `chat.id`.
4. Set:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

## 3. Vercel

1. Import `nestho/purelisten-1a445b13`.
2. Add environment variables (Production + Preview as needed):

| Variable | Client | Server |
|----------|--------|--------|
| `VITE_SUPABASE_URL` | ✓ | |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✓ | |
| `VITE_SUPABASE_PROJECT_ID` | ✓ | |
| `SUPABASE_URL` | | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | | ✓ |
| `TELEGRAM_BOT_TOKEN` | | ✓ |
| `TELEGRAM_CHAT_ID` | | ✓ |
| `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | | optional |
| `AI_PROVIDER` | | optional (`groq` \| `openai` \| `gemini`) |

3. Deploy.
4. Set webhook **once** (replace domain and token):

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_DOMAIN/api/telegram-webhook
```

5. Confirm:

```text
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

## 4. Smoke test

1. Open the live site → **I Need to Talk** → enter a name.
2. Send text and a voice note.
3. Confirm Telegram notification includes name / meta.
4. Type a reply in Telegram (no “reply-to” needed).
5. Confirm the reply appears in the web chat.

## 5. Optional AI

Add one provider key and call `POST /api/ai-reply` with conversation history. Wire Telegram `/ai` later if desired.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Chat won’t start | Tables + RLS from bootstrap SQL |
| Media fails | `chat-media` bucket public + policies |
| No Telegram messages | Env vars + redeploy + bot token |
| Telegram reply not on web | Webhook URL + `TELEGRAM_CHAT_ID` matches your chat |
| Wrong language | Clear `listener_lang_override` in localStorage |

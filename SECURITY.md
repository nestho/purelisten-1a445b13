# Security Policy

## Reporting a vulnerability

If you find a security issue in Listener, please open a private report with the maintainer (GitHub Security Advisories if enabled, or contact the repo owner). Do not post secrets or exploit details in public issues.

## Secrets

Never commit:

- `.env`
- Supabase **service_role** key
- Telegram **bot token**
- AI API keys (OpenAI / Groq / Gemini)

Use Vercel Environment Variables (or your host’s secret store) for production.

If a secret was exposed:

1. **Rotate** it immediately (Telegram BotFather `/revoke`, Supabase dashboard → new keys, AI provider dashboard).
2. Remove the secret from git history if it was committed.
3. Redeploy with the new values.

## Product boundaries

Listener is a **peer listening** tool, not clinical care. Operators should not present themselves as licensed therapists unless they are and the product is legally set up for that. Encourage emergency services for acute risk.

## Recommended hardening

- Keep RLS enabled on all public tables
- Restrict Storage policies to the `chat-media` bucket only
- Add rate limiting on `/api/send-to-telegram` and chat inserts as traffic grows
- Verify Telegram webhook updates against a secret path or bot identity

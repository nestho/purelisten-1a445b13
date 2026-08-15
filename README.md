<div align="center">

# Listener

**A free, anonymous space for empathetic listening.**

Share what’s on your mind. A real person listens — without judgment.

[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Telegram](https://img.shields.io/badge/Operator-Telegram-26A5E4?logo=telegram&logoColor=white)](https://telegram.org)

</div>

---

## Why Listener exists

Sometimes people don’t need advice. They need someone who **hears** them.

Listener is a calm web app where visitors can talk anonymously — text, voice, photos, video — and a human operator answers in real time through Telegram. Optional AI empathy replies can assist when you’re away.

> This is **not** therapy, crisis counseling, or a medical service.  
> If someone is in immediate danger, they should contact local emergency services.

---

## Features

| Area | What you get |
|------|----------------|
| **Talk** | Warm name step → live chat with media (text, voice, image, video, files, links) |
| **Listen** | Path for people willing to hold space (MVP routes to host) |
| **Telegram bridge** | Visitor messages land in your Telegram; plain replies go back to the site |
| **Realtime** | Supabase Realtime keeps the chat in sync |
| **i18n** | English + Persian (geo / timezone aware) and more locales |
| **Breathing** | Optional calm breathing exercise on the landing page |
| **AI-ready** | `/api/ai-reply` for Groq / OpenAI / Gemini (empathy system prompt) |

---

## Stack

- **Frontend:** Vite · React 18 · TypeScript · Tailwind · shadcn/ui · i18next  
- **Backend data:** Supabase (Postgres · RLS · Storage · Realtime)  
- **Serverless:** Vercel API routes (`/api/*`)  
- **Operator channel:** Telegram Bot API  

---

## Quick start

### 1. Clone & install

```bash
git clone https://github.com/nestho/purelisten-1a445b13.git
cd purelisten-1a445b13
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Fill in values (see [docs/SETUP.md](docs/SETUP.md)). **Never commit `.env`.**

### 3. Database

In the Supabase SQL Editor, run the consolidated script:

[`supabase/bootstrap.sql`](supabase/bootstrap.sql)

Create a **public** Storage bucket named `chat-media` if the script doesn’t create it.

### 4. Local dev

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:8080`).

### 5. Production (Vercel)

1. Import the GitHub repo in Vercel  
2. Add all env vars from `.env.example`  
3. Deploy  
4. Set Telegram webhook **once**:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/api/telegram-webhook
```

Full checklist: [docs/SETUP.md](docs/SETUP.md).

---

## How the chat works

```text
Visitor (web) ──► Supabase (messages + media)
                      │
                      ▼
              /api/send-to-telegram
                      │
                      ▼
              Your Telegram chat
                      │
              (you type a reply)
                      │
                      ▼
              /api/telegram-webhook
                      │
                      ▼
              Supabase Realtime ──► Visitor sees it live
```

- First visitor message includes **name, IP, country, user-agent**  
- You do **not** need to “reply-to” in Telegram — plain text/media goes to the **active** session  

---

## Project structure

```text
api/                 Vercel serverless (Telegram + AI + session meta)
src/
  components/        UI (ChatPanel, Hero, VoicePlayer, …)
  i18n/              Locales
  integrations/      Supabase client
  pages/             Routes
supabase/
  bootstrap.sql      One-shot production schema
  migrations/        Incremental SQL history
docs/SETUP.md        Deploy & ops guide
```

---

## Security notes

- Only the **anon** key belongs in the browser (`VITE_*`)  
- `SUPABASE_SERVICE_ROLE_KEY` and `TELEGRAM_BOT_TOKEN` are **server-only**  
- If a secret was ever committed or pasted in chat, **rotate it** (BotFather revoke, Supabase new keys)  
- See [SECURITY.md](SECURITY.md)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Roadmap ideas

- Multi-session Telegram switcher (`/list`, `/join <id>`)  
- Peer-to-peer listen matching  
- Operator dashboard  
- Rate limits & abuse controls  
- Crisis resource links by country  

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built with care for people who need to be heard.

</div>

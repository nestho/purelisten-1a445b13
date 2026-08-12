/**
 * Iran → Persian (fa), everyone else → English (en).
 * Manual override in localStorage always wins.
 * Uses timezone + browser language + multiple geo APIs (ipapi often blocked in IR).
 */

const STORAGE_KEY = "listener_lang_override";

export function getStoredLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredLanguage(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

async function fetchCountryCode(): Promise<string | null> {
  const endpoints = [
    async () => {
      const r = await fetch("https://api.country.is/", { signal: AbortSignal.timeout(2500) });
      if (!r.ok) return null;
      const d = (await r.json()) as { country?: string };
      return d.country ?? null;
    },
    async () => {
      const r = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(2500) });
      if (!r.ok) return null;
      const d = (await r.json()) as { country_code?: string };
      return d.country_code ?? null;
    },
    async () => {
      const r = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(2500) });
      if (!r.ok) return null;
      const d = (await r.json()) as { country_code?: string };
      return d.country_code ?? null;
    },
  ];

  for (const fn of endpoints) {
    try {
      const code = await fn();
      if (code) return code.toUpperCase();
    } catch {
      // try next
    }
  }
  return null;
}

export async function detectDefaultLanguage(): Promise<string> {
  const stored = getStoredLanguage();
  if (stored && ["en", "fa", "ar", "ja", "fr", "de"].includes(stored)) {
    return stored;
  }

  // Browser language
  try {
    const langs = [
      navigator.language,
      ...(navigator.languages || []),
    ].map((l) => l.toLowerCase());
    if (langs.some((l) => l.startsWith("fa") || l.includes("persian") || l.includes("farsi"))) {
      return "fa";
    }
  } catch {
    // ignore
  }

  // Timezone (very reliable for users physically in Iran)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Tehran") return "fa";
  } catch {
    // ignore
  }

  const country = await fetchCountryCode();
  if (country === "IR") return "fa";

  return "en";
}

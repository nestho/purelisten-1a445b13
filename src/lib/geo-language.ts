/**
 * Geo-based default language:
 * - Iran (IR) → Persian (fa)
 * - Everywhere else → English (en)
 * Manual choice in localStorage always wins.
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

export async function detectDefaultLanguage(): Promise<"en" | "fa"> {
  const stored = getStoredLanguage();
  if (stored === "en" || stored === "fa" || stored === "ar" || stored === "ja" || stored === "fr" || stored === "de") {
    // If user previously chose any language, keep it
    return stored === "fa" ? "fa" : (stored as "en");
  }

  // Soft timezone hint (Asia/Tehran)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Tehran") return "fa";
  } catch {
    // ignore
  }

  // IP geo (best-effort, free endpoint)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { country_code?: string };
      if (data.country_code === "IR") return "fa";
    }
  } catch {
    // offline / blocked — fall through to en
  }

  return "en";
}

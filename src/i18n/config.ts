import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fa from "./locales/fa.json";
import ar from "./locales/ar.json";
import ja from "./locales/ja.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";

const resources = {
  en: { translation: en },
  fa: { translation: fa },
  ar: { translation: ar },
  ja: { translation: ja },
  fr: { translation: fr },
  de: { translation: de },
};

const RTL = new Set(["fa", "ar"]);

export function applyDocumentDirection(lng: string) {
  const dir = RTL.has(lng) ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", applyDocumentDirection);

export default i18n;

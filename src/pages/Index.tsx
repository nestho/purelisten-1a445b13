import { useEffect } from "react";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import BreathingWidget from "@/components/BreathingWidget";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LivePresence from "@/components/LivePresence";
import useScrollReveal from "@/hooks/use-scroll-reveal";
import { useTranslation } from "react-i18next";
import { detectDefaultLanguage } from "@/lib/geo-language";
import { applyDocumentDirection } from "@/i18n/config";

const Index = () => {
  const { t, i18n } = useTranslation();
  useScrollReveal();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lng = await detectDefaultLanguage();
      if (cancelled) return;
      // Only apply geo default if user hasn't manually chosen something else this session
      // detectDefaultLanguage already respects localStorage override
      if (i18n.language !== lng) {
        await i18n.changeLanguage(lng);
      }
      applyDocumentDirection(lng);
    })();
    return () => {
      cancelled = true;
    };
  }, [i18n]);

  return (
    <main className="min-h-screen">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <HeroSection />

      <div className="reveal">
        <LivePresence />
      </div>

      <div className="reveal">
        <HowItWorks />
      </div>

      <div className="reveal">
        <BreathingWidget />
      </div>

      <div className="reveal">
        <Features />
      </div>

      <footer className="py-12 px-4 border-t border-border bg-muted/20">
        <div className="container mx-auto text-center space-y-2">
          <p className="font-serif text-lg">
            {t("footer.tagline", "You never have to carry it alone.")}
          </p>
          <p className="text-muted-foreground text-sm">{t("footer.copyright")}</p>
        </div>
      </footer>
    </main>
  );
};

export default Index;

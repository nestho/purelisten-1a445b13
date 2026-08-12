import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ear, MessageCircleHeart, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/hero-listening.jpg";
import AmbientBackground from "@/components/AmbientBackground";
import ComfortTicker from "@/components/ComfortTicker";
import ChatPanel from "@/components/ChatPanel";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();
  const [chatMode, setChatMode] = useState<"talk" | "listen" | null>(null);

  return (
    <>
      <section className="relative min-h-[100svh] flex items-center justify-center bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <img src={heroImage} alt="" className="w-full h-full object-cover" loading="eager" />
        </div>

        <AmbientBackground />

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full shadow-soft animate-fade-in">
              <span className="live-dot" aria-hidden />
              <p className="text-sm font-semibold text-foreground/85">{t("hero.badge")}</p>
            </div>

            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight animate-fade-in"
              style={{ animationDelay: "80ms" }}
            >
              {t("hero.title")}
              <br />
              <span className="text-gradient-warm">{t("hero.titleHighlight")}</span>
            </h1>

            <p
              className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in"
              style={{ animationDelay: "160ms" }}
            >
              {t("hero.subtitle")}
            </p>

            <div className="animate-fade-in" style={{ animationDelay: "220ms" }}>
              <ComfortTicker />
            </div>

            <div
              className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2 animate-fade-in"
              style={{ animationDelay: "280ms" }}
            >
              <Button
                variant="hero"
                size="lg"
                className="w-full sm:w-auto min-w-[220px] hover-lift"
                onClick={() => setChatMode("talk")}
              >
                <MessageCircleHeart className="w-5 h-5" />
                {t("hero.talkButton")}
              </Button>

              <Button
                variant="calm"
                size="lg"
                className="w-full sm:w-auto min-w-[220px] hover-lift"
                onClick={() => setChatMode("listen")}
              >
                <Ear className="w-5 h-5" />
                {t("hero.listenButton")}
              </Button>
            </div>

            <p
              className="text-sm text-muted-foreground pt-4 flex items-center justify-center gap-2 animate-fade-in"
              style={{ animationDelay: "360ms" }}
            >
              <ShieldCheck className="w-4 h-4 text-hope" aria-hidden />
              {t("hero.footer")}
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent" />
      </section>

      {chatMode && <ChatPanel mode={chatMode} onClose={() => setChatMode(null)} />}
    </>
  );
};

export default HeroSection;

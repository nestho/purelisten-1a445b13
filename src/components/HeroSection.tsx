import { Button } from "@/components/ui/button";
import { Ear, MessageCircleHeart, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/hero-listening.jpg";
import LeadCapture from "@/components/LeadCapture";
import AmbientBackground from "@/components/AmbientBackground";
import ComfortTicker from "@/components/ComfortTicker";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <img
          src={heroImage}
          alt="Two people sharing a calm, empathetic conversation"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      <AmbientBackground />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 glass-card px-5 py-2.5 rounded-full shadow-soft animate-fade-in">
            <span className="inline-flex h-2 w-2 rounded-full bg-hope animate-pulse-soft" aria-hidden />
            <p className="text-sm font-semibold text-foreground/80">{t('hero.badge')}</p>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] animate-fade-in">
            {t('hero.title')}
            <br />
            <span className="text-gradient-warm">{t('hero.titleHighlight')}</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in">
            {t('hero.subtitle')}
          </p>

          <ComfortTicker />

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 mb-12">
            <Button variant="hero" size="lg" className="w-full sm:w-auto min-w-[240px] hover-lift">
              <MessageCircleHeart className="w-5 h-5" />
              {t('hero.talkButton')}
            </Button>

            <Button variant="calm" size="lg" className="w-full sm:w-auto min-w-[240px] hover-lift">
              <Ear className="w-5 h-5" />
              {t('hero.listenButton')}
            </Button>
          </div>

          <LeadCapture />

          <p className="text-sm text-muted-foreground pt-8 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" aria-hidden />
            {t('hero.footer')}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;

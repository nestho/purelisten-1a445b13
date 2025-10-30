import { Button } from "@/components/ui/button";
import { Ear, MessageCircleHeart } from "lucide-react";
import heroImage from "@/assets/hero-listening.jpg";
import LeadCapture from "@/components/LeadCapture";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <img 
          src={heroImage} 
          alt="Empathetic connection" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block mb-4">
            <div className="bg-card/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-card">
              <p className="text-primary font-semibold">{t('hero.badge')}</p>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            {t('hero.title')}
            <br />
            {t('hero.titleHighlight').split(' ')[0] === 'is' ? 'is ' : ''}<span className="bg-gradient-warm bg-clip-text text-transparent">{t('hero.titleHighlight')}</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 mb-12">
            <Button 
              variant="hero" 
              size="lg"
              className="w-full sm:w-auto min-w-[240px]"
            >
              <MessageCircleHeart className="w-5 h-5" />
              {t('hero.talkButton')}
            </Button>
            
            <Button 
              variant="calm" 
              size="lg"
              className="w-full sm:w-auto min-w-[240px]"
            >
              <Ear className="w-5 h-5" />
              {t('hero.listenButton')}
            </Button>
          </div>

          <LeadCapture />
          
          <p className="text-sm text-muted-foreground pt-8">
            {t('hero.footer')}
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
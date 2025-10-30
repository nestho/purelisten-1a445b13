import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  
  return (
    <main className="min-h-screen">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <HeroSection />
      <HowItWorks />
      <Features />
      
      <footer className="py-12 px-4 border-t border-border bg-muted/20">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
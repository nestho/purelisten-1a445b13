import { Card } from "@/components/ui/card";
import { MessageSquare, HeartHandshake, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: MessageSquare,
      titleKey: "howItWorks.steps.share.title",
      descriptionKey: "howItWorks.steps.share.description",
      gradient: "from-primary/10 to-primary/5"
    },
    {
      icon: HeartHandshake,
      titleKey: "howItWorks.steps.connect.title",
      descriptionKey: "howItWorks.steps.connect.description",
      gradient: "from-secondary/10 to-secondary/5"
    },
    {
      icon: Sparkles,
      titleKey: "howItWorks.steps.choose.title",
      descriptionKey: "howItWorks.steps.choose.description",
      gradient: "from-accent/20 to-accent/5"
    }
  ];
  
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            {t('howItWorks.title')} <span className="bg-gradient-warm bg-clip-text text-transparent">{t('howItWorks.titleHighlight')}</span> {t('howItWorks.titleEnd')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className={`relative p-8 hover:shadow-card transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br ${step.gradient}`}
            >
              <div className="absolute top-6 right-6 text-6xl font-bold text-muted/10">
                {index + 1}
              </div>
              
              <div className="relative space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center shadow-soft">
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                
                <h3 className="text-2xl font-semibold">
                  {t(step.titleKey)}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {t(step.descriptionKey)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
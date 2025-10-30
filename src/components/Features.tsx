import { Card } from "@/components/ui/card";
import { Shield, Clock, Users, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Shield,
      titleKey: "features.items.private.title",
      descriptionKey: "features.items.private.description"
    },
    {
      icon: Clock,
      titleKey: "features.items.available.title",
      descriptionKey: "features.items.available.description"
    },
    {
      icon: Users,
      titleKey: "features.items.real.title",
      descriptionKey: "features.items.real.description"
    },
    {
      icon: Heart,
      titleKey: "features.items.compassionate.title",
      descriptionKey: "features.items.compassionate.description"
    }
  ];
  
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            {t('features.title')} <span className="bg-gradient-calm bg-clip-text text-transparent">{t('features.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-card transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-calm flex items-center justify-center shadow-soft">
                  <feature.icon className="w-6 h-6 text-secondary-foreground" />
                </div>
                
                <h3 className="text-xl font-semibold">
                  {t(feature.titleKey)}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
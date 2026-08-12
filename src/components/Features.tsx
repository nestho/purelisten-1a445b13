import { Card } from "@/components/ui/card";
import { Shield, Clock, Users, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Shield,
      titleKey: "features.items.private.title",
      descriptionKey: "features.items.private.description",
    },
    {
      icon: Clock,
      titleKey: "features.items.available.title",
      descriptionKey: "features.items.available.description",
    },
    {
      icon: Users,
      titleKey: "features.items.real.title",
      descriptionKey: "features.items.real.description",
    },
    {
      icon: Heart,
      titleKey: "features.items.compassionate.title",
      descriptionKey: "features.items.compassionate.description",
    },
  ];

  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-14 space-y-3">
          <h2 className="text-3xl md:text-5xl font-bold">
            {t("features.title")}{" "}
            <span className="bg-gradient-calm bg-clip-text text-transparent">
              {t("features.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 glass-card hover:shadow-glow transition-all duration-400 hover:-translate-y-1.5 group"
            >
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-calm flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-5 h-5 text-secondary-foreground" />
                </div>

                <h3 className="text-lg font-semibold">{t(feature.titleKey)}</h3>

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

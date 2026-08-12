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
    },
    {
      icon: HeartHandshake,
      titleKey: "howItWorks.steps.connect.title",
      descriptionKey: "howItWorks.steps.connect.description",
    },
    {
      icon: Sparkles,
      titleKey: "howItWorks.steps.choose.title",
      descriptionKey: "howItWorks.steps.choose.description",
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-14 space-y-3">
          <h2 className="text-3xl md:text-5xl font-bold">
            {t("howItWorks.title")}{" "}
            <span className="text-gradient-warm">{t("howItWorks.titleHighlight")}</span>{" "}
            {t("howItWorks.titleEnd")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="relative p-7 glass-card hover:shadow-glow transition-all duration-500 hover:-translate-y-2 group"
            >
              <div className="absolute top-5 right-5 text-5xl font-bold text-foreground/[0.04] group-hover:text-primary/10 transition-colors">
                {index + 1}
              </div>

              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-warm flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                <h3 className="text-xl font-semibold">{t(step.titleKey)}</h3>

                <p className="text-muted-foreground leading-relaxed text-sm">
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

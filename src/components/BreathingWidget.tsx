import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type Phase = "inhale" | "hold" | "exhale";

const SEQUENCE: { phase: Phase; seconds: number }[] = [
  { phase: "inhale", seconds: 4 },
  { phase: "hold", seconds: 7 },
  { phase: "exhale", seconds: 8 },
];

const BreathingWidget = () => {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [remaining, setRemaining] = useState(SEQUENCE[0].seconds);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        stepRef.current = (stepRef.current + 1) % SEQUENCE.length;
        setStep(stepRef.current);
        return SEQUENCE[stepRef.current].seconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const current = SEQUENCE[step];
  const labels: Record<Phase, string> = {
    inhale: t("breathe.inhale", "Breathe in"),
    hold: t("breathe.hold", "Hold"),
    exhale: t("breathe.exhale", "Breathe out"),
  };

  const scale = !running
    ? "scale-90"
    : current.phase === "exhale"
      ? "scale-75"
      : "scale-110";
  const duration = !running
    ? "duration-700"
    : current.phase === "inhale"
      ? "duration-[4000ms]"
      : current.phase === "hold"
        ? "duration-1000"
        : "duration-[8000ms]";

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      <div className="container mx-auto max-w-3xl text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            {t("breathe.title", "Feeling overwhelmed?")}{" "}
            <span className="text-gradient-warm">{t("breathe.titleHighlight", "Breathe with us")}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {t("breathe.subtitle", "One minute of slow breathing can soften a hard moment. Follow the circle — nothing else to do.")}
          </p>
        </div>

        <div className="relative flex items-center justify-center h-72">
          <div className="absolute h-56 w-56 rounded-full bg-gradient-glow blur-2xl animate-pulse-soft motion-reduce:animate-none" aria-hidden />
          <div
            className={`relative flex h-48 w-48 items-center justify-center rounded-full bg-gradient-calm shadow-glow transition-transform ease-in-out motion-reduce:transform-none ${scale} ${duration}`}
          >
            <div className="text-center text-secondary-foreground">
              <p className="text-xl font-serif">{running ? labels[current.phase] : t("breathe.ready", "Ready?")}</p>
              {running && <p className="text-4xl font-bold tabular-nums">{remaining}</p>}
            </div>
          </div>
        </div>

        <Button
          variant={running ? "outline" : "default"}
          size="lg"
          onClick={() => {
            if (running) {
              setRunning(false);
              stepRef.current = 0;
              setStep(0);
              setRemaining(SEQUENCE[0].seconds);
            } else {
              setRunning(true);
            }
          }}
        >
          {running ? t("breathe.stop", "Stop") : t("breathe.start", "Start breathing")}
        </Button>
      </div>
    </section>
  );
};

export default BreathingWidget;

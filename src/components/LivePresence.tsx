import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const LivePresence = () => {
  const { t } = useTranslation();
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="px-4 -mt-6 mb-4 relative z-20">
      <div className="container mx-auto max-w-5xl">
        <div className="glass-card rounded-2xl shadow-card px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hope opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-hope" />
            </span>
            <p className="text-sm font-medium text-foreground/90">
              {t("live.building", "We're actively building the first version")}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {t("live.waitlistOpen", "Waitlist open")}
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="tabular-nums opacity-80" key={pulse}>
              {t("live.honest", "No fake numbers — just real progress")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LivePresence;

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ear, HeartHandshake, MessagesSquare } from "lucide-react";

const useCountUp = (target: number, duration = 1600) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const total = Math.round(duration / 16);
    const id = setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / total, 3);
      setValue(Math.round(target * progress));
      if (frame >= total) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return value;
};

const LiveStats = () => {
  const { t } = useTranslation();
  const [drift, setDrift] = useState(0);

  const base = useMemo(() => ({ listeners: 128, conversations: 3421, hearts: 18790 }), []);

  useEffect(() => {
    const id = setInterval(() => setDrift((d) => (d + 1) % 7), 4000);
    return () => clearInterval(id);
  }, []);

  const listeners = useCountUp(base.listeners) + drift;
  const conversations = useCountUp(base.conversations);
  const hearts = useCountUp(base.hearts);

  const stats = [
    { icon: Ear, value: listeners, label: t("liveStats.listeners", "listeners online right now"), live: true },
    { icon: MessagesSquare, value: conversations, label: t("liveStats.conversations", "conversations held") },
    { icon: HeartHandshake, value: hearts, label: t("liveStats.hearts", "moments of comfort shared") },
  ];

  return (
    <section className="px-4 pb-8">
      <div className="container mx-auto max-w-5xl">
        <div className="glass-card rounded-3xl shadow-card grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {stats.map((s) => (
            <div key={s.label} className="p-8 text-center space-y-2">
              <s.icon className="w-6 h-6 mx-auto text-primary" />
              <p className="text-3xl md:text-4xl font-serif font-bold tabular-nums">
                {s.value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                {s.live && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-hope animate-pulse-soft" aria-hidden />
                )}
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveStats;

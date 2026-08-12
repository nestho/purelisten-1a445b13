import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const LivePresence = () => {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("get_waitlist_count");
        if (!cancelled && !error && typeof data === "number") {
          setCount(data);
        }
      } catch {
        // RPC may not exist yet — silent fail, UI still works
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="px-4 -mt-4 mb-6 relative z-20">
      <div className="container mx-auto max-w-5xl">
        <div className="glass-card rounded-2xl shadow-card px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="live-dot" aria-hidden />
            <p className="text-sm font-medium text-foreground/90">
              {t("live.building", "We're actively building the first version")}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {t("live.waitlistOpen", "Waitlist open")}
            </span>

            {count !== null && count > 0 && (
              <>
                <span className="hidden sm:inline text-border">·</span>
                <span className="tabular-nums text-foreground/80 font-medium">
                  {t("live.count", "{{count}} people waiting", { count })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LivePresence;

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const KEYS = [
  "comfort.messages.0",
  "comfort.messages.1",
  "comfort.messages.2",
  "comfort.messages.3",
  "comfort.messages.4",
];

const FALLBACKS = [
  "You are not too much. You are not too late.",
  "This feeling is heavy, but it is not permanent.",
  "You don't have to face everything alone.",
  "You don't need the right words. Just start.",
  "Being here, reading this, is already a step forward.",
];

const ComfortTicker = () => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % KEYS.length);
        setVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[3.5rem] flex items-center justify-center" aria-live="polite">
      <p
        className={`text-lg md:text-xl font-serif italic text-muted-foreground transition-all duration-500 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        “{t(KEYS[index], FALLBACKS[index])}”
      </p>
    </div>
  );
};

export default ComfortTicker;

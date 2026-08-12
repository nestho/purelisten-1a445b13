import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function barsFromSeed(seed: string, count = 32) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const n = (h % 1000) / 1000;
    // smoother RN-like envelope
    const envelope = Math.sin((i / count) * Math.PI) * 0.35 + 0.65;
    out.push((0.18 + n * 0.82) * envelope);
  }
  return out;
}

const VoicePlayer = ({
  src,
  variant = "incoming",
}: {
  src: string;
  variant?: "incoming" | "outgoing";
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const bars = useMemo(() => barsFromSeed(src), [src]);
  const outgoing = variant === "outgoing";

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onMeta = () => setDuration(audio.duration || 0);
    const onTime = () => {
      setCurrent(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const seek = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  return (
    <div
      className={`flex items-center gap-2.5 min-w-[210px] max-w-[270px] select-none ${
        outgoing ? "text-white" : "text-foreground"
      }`}
    >
      <button
        type="button"
        onClick={() => void toggle()}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
          outgoing
            ? "bg-white/20 hover:bg-white/30 text-white shadow-inner"
            : "bg-primary/15 hover:bg-primary/25 text-primary"
        }`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing && (
          <span
            className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
              outgoing ? "bg-white" : "bg-primary"
            }`}
          />
        )}
        {playing ? (
          <Pause className="h-[18px] w-[18px] fill-current relative" />
        ) : (
          <Play className="h-[18px] w-[18px] fill-current relative ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 pt-0.5">
        <button
          type="button"
          className="flex items-center gap-[2.5px] h-9 w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
          }}
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <span
                key={i}
                className={`w-[3px] rounded-full transition-all duration-100 ${
                  filled
                    ? outgoing
                      ? "bg-white"
                      : "bg-primary"
                    : outgoing
                      ? "bg-white/25"
                      : "bg-white/15"
                }`}
                style={{
                  height: `${Math.max(4, Math.round(h * 32))}px`,
                  transform: playing && filled ? `scaleY(${1 + (i % 3) * 0.06})` : undefined,
                }}
              />
            );
          })}
        </button>
        <div
          className={`text-[10px] tabular-nums tracking-wide mt-0.5 ${
            outgoing ? "text-white/65" : "text-white/40"
          }`}
        >
          {playing || current > 0 ? formatTime(current) : formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;

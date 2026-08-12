import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Deterministic soft waveform from url string */
function barsFromSeed(seed: string, count = 28) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const n = (h % 1000) / 1000;
    out.push(0.22 + n * 0.78);
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
      className={`flex items-center gap-3 min-w-[200px] max-w-[260px] select-none ${
        outgoing ? "text-primary-foreground" : "text-foreground"
      }`}
    >
      <button
        type="button"
        onClick={() => void toggle()}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
          outgoing
            ? "bg-white/25 hover:bg-white/35 text-white"
            : "bg-primary/20 hover:bg-primary/30 text-primary"
        }`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          className="flex items-end gap-[3px] h-8 w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            seek(ratio);
          }}
          aria-label="Seek"
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  filled
                    ? outgoing
                      ? "bg-white"
                      : "bg-primary"
                    : outgoing
                      ? "bg-white/30"
                      : "bg-foreground/20"
                } ${playing && filled ? "animate-pulse" : ""}`}
                style={{
                  height: `${Math.round(h * 100)}%`,
                  minHeight: 4,
                }}
              />
            );
          })}
        </button>
        <div
          className={`mt-1 text-[10px] tabular-nums tracking-wide ${
            outgoing ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {formatTime(current)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;

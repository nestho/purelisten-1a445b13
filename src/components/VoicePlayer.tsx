import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function barsFromSeed(seed: string, count = 28) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const n = (h % 1000) / 1000;
    const envelope = Math.sin((i / count) * Math.PI) * 0.35 + 0.65;
    out.push((0.2 + n * 0.8) * envelope);
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
    <div className="flex items-center gap-2.5 min-w-[200px] max-w-[250px] select-none">
      <button
        type="button"
        onClick={() => void toggle()}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
          outgoing
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-[#1d1d1f] text-white hover:bg-black"
        }`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          className="flex items-center gap-[2px] h-7 w-full cursor-pointer"
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
                className={`w-[2.5px] rounded-full transition-colors ${
                  filled
                    ? outgoing
                      ? "bg-white"
                      : "bg-[#1d1d1f]"
                    : outgoing
                      ? "bg-white/30"
                      : "bg-black/15"
                }`}
                style={{ height: `${Math.max(3, Math.round(h * 26))}px` }}
              />
            );
          })}
        </button>
        <div
          className={`text-[10px] tabular-nums mt-0.5 ${
            outgoing ? "text-white/60" : "text-[#86868b]"
          }`}
        >
          {playing || current > 0 ? formatTime(current) : formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;

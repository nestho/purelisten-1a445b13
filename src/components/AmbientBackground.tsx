const AmbientBackground = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-gradient-warm opacity-25 blur-3xl animate-float-slow motion-reduce:animate-none" />
    <div className="absolute top-1/4 -right-40 h-[38rem] w-[38rem] rounded-full bg-gradient-calm opacity-20 blur-3xl animate-float-slower motion-reduce:animate-none" />
    <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-gradient-glow opacity-80 blur-2xl animate-glow-breathe motion-reduce:animate-none" />

    <div className="absolute top-[18%] left-[12%] h-2.5 w-2.5 rounded-full bg-primary/50 animate-drift motion-reduce:animate-none" />
    <div className="absolute top-[42%] right-[18%] h-2 w-2 rounded-full bg-secondary/45 animate-float-slower motion-reduce:animate-none" />
    <div className="absolute bottom-[28%] left-[38%] h-3 w-3 rounded-full bg-hope/35 animate-pulse-soft motion-reduce:animate-none" />
    <div className="absolute top-[65%] right-[30%] h-1.5 w-1.5 rounded-full bg-primary-glow/40 animate-drift motion-reduce:animate-none" style={{ animationDelay: "1.2s" }} />
  </div>
);

export default AmbientBackground;

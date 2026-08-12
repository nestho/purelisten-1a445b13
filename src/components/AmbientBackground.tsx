const AmbientBackground = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-gradient-warm opacity-30 blur-3xl animate-float-slow motion-reduce:animate-none" />
    <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-gradient-calm opacity-30 blur-3xl animate-float-slower motion-reduce:animate-none" />
    <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-gradient-glow opacity-70 blur-2xl animate-pulse-soft motion-reduce:animate-none" />
    {/* Soft floating orbs for a living feel */}
    <div className="absolute top-[20%] left-[15%] h-3 w-3 rounded-full bg-primary/40 animate-float-slow motion-reduce:animate-none" />
    <div className="absolute top-[55%] right-[20%] h-2 w-2 rounded-full bg-secondary/50 animate-float-slower motion-reduce:animate-none" />
    <div className="absolute bottom-[25%] left-[40%] h-2.5 w-2.5 rounded-full bg-hope/40 animate-pulse-soft motion-reduce:animate-none" />
  </div>
);

export default AmbientBackground;

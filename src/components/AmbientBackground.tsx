const AmbientBackground = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-gradient-warm opacity-25 blur-3xl animate-float-slow motion-reduce:animate-none" />
    <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-gradient-calm opacity-25 blur-3xl animate-float-slower motion-reduce:animate-none" />
    <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-gradient-glow opacity-60 blur-2xl animate-pulse-soft motion-reduce:animate-none" />
  </div>
);

export default AmbientBackground;

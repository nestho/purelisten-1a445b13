import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";

const Index = () => {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <HowItWorks />
      <Features />
      
      <footer className="py-12 px-4 border-t border-border bg-muted/20">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © 2025 Listener. A space for empathetic listening and human connection.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
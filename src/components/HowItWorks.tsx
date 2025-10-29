import { Card } from "@/components/ui/card";
import { MessageSquare, HeartHandshake, Sparkles } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Share Your Thoughts",
    description: "Express what's on your mind in a safe, judgment-free space. Your feelings are valid and heard.",
    gradient: "from-primary/10 to-primary/5"
  },
  {
    icon: HeartHandshake,
    title: "Connect with Empathy",
    description: "Be matched with someone who's here to listen with compassion and understanding.",
    gradient: "from-secondary/10 to-secondary/5"
  },
  {
    icon: Sparkles,
    title: "Choose Your Path",
    description: "Decide if you want supportive responses or just a caring presence to listen.",
    gradient: "from-accent/20 to-accent/5"
  }
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            How <span className="bg-gradient-warm bg-clip-text text-transparent">Listener</span> Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A simple, compassionate approach to human connection
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className={`relative p-8 hover:shadow-card transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br ${step.gradient}`}
            >
              <div className="absolute top-6 right-6 text-6xl font-bold text-muted/10">
                {index + 1}
              </div>
              
              <div className="relative space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center shadow-soft">
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                
                <h3 className="text-2xl font-semibold">
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
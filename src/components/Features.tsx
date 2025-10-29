import { Card } from "@/components/ui/card";
import { Shield, Clock, Users, Heart } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Private & Anonymous",
    description: "Your conversations are confidential. Share freely without worrying about judgment."
  },
  {
    icon: Clock,
    title: "Available 24/7",
    description: "Whenever you need support, there's someone ready to listen with empathy."
  },
  {
    icon: Users,
    title: "Real Human Connection",
    description: "Connect with real people who understand the power of empathetic listening."
  },
  {
    icon: Heart,
    title: "Compassionate Space",
    description: "A warm, welcoming environment where your emotions are valued and respected."
  }
];

const Features = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Why Choose <span className="bg-gradient-calm bg-clip-text text-transparent">Listener</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built on the foundation of empathy and human connection
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-card transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-calm flex items-center justify-center shadow-soft">
                  <feature.icon className="w-6 h-6 text-secondary-foreground" />
                </div>
                
                <h3 className="text-xl font-semibold">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
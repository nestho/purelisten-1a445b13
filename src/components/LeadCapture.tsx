import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const leadSchema = z.object({
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal("")),
}).refine(
  (data) => data.email || data.phone,
  { message: "Please provide at least an email or phone number" }
);

const LeadCapture = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = leadSchema.safeParse({ 
      email: email || undefined, 
      phone: phone || undefined 
    });

    if (!validation.success) {
      toast({
        title: t('leadCapture.errorTitle'),
        description: t('leadCapture.validationError'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("leads")
        .insert([{ 
          email: email || null, 
          phone: phone || null 
        }]);

      if (error) throw error;

      setIsSuccess(true);
      setEmail("");
      setPhone("");
      
      toast({
        title: t('leadCapture.successTitle'),
        description: t('leadCapture.successMessage'),
      });

      // Reset success state after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: t('leadCapture.errorTitle'),
        description: t('leadCapture.errorMessage'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="p-8 bg-card/80 backdrop-blur-sm shadow-card max-w-md mx-auto">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-warm flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="text-2xl font-semibold">{t('leadCapture.successTitle')}</h3>
          <p className="text-muted-foreground">
            {t('leadCapture.successMessage')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 bg-card/80 backdrop-blur-sm shadow-card max-w-md mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-warm flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{t('leadCapture.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('leadCapture.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('leadCapture.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                maxLength={255}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="tel"
                placeholder={t('leadCapture.phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                maxLength={20}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            className="w-full" 
            disabled={isSubmitting || (!email && !phone)}
          >
            {isSubmitting ? t('leadCapture.submittingButton') : t('leadCapture.submitButton')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('leadCapture.privacyNote')}
          </p>
        </form>
      </div>
    </Card>
  );
};

export default LeadCapture;
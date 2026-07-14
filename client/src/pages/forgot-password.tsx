import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/context/language-context";
import { useBranding } from "@/context/branding-context";

export default function ForgotPassword() {
  const { brandLogo, brandLogoAlt } = useBranding();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const text = {
    sentTitle: isEnglish ? "Email sent!" : "Το email στάλθηκε!",
    sentDescription: isEnglish
      ? "Check your inbox for password reset instructions"
      : "Ελέγξτε το inbox σας για οδηγίες επαναφοράς κωδικού",
    errorTitle: isEnglish ? "Error" : "Σφάλμα",
    requestError: isEnglish ? "Failed to send reset email" : "Αποτυχία αποστολής email επαναφοράς",
    enterEmail: isEnglish ? "Please enter your email" : "Παρακαλώ εισάγετε το email σας",
    checkEmail: isEnglish ? "CHECK YOUR EMAIL" : "ΕΛΕΓΞΤΕ ΤΟ EMAIL ΣΑΣ",
    spamHint: isEnglish
      ? "Check your spam folder too if you don't see the email."
      : "Ελέγξτε και το φάκελο spam αν δεν βλέπετε το email.",
    backToLogin: isEnglish ? "Back to Sign In" : "Επιστροφή στη Σύνδεση",
    title: isEnglish ? "FORGOT PASSWORD?" : "ΞΕΧΑΣΕΣ ΤΟΝ ΚΩΔΙΚΟ;",
    subtitle: isEnglish ? "We'll send you reset instructions" : "Θα σου στείλουμε οδηγίες επαναφοράς",
    emailPlaceholder: isEnglish ? "your_email@example.com" : "το_email_σου@example.com",
    sending: isEnglish ? "Sending..." : "Αποστολή...",
    submit: isEnglish ? "SEND INSTRUCTIONS" : "ΑΠΟΣΤΟΛΗ ΟΔΗΓΙΩΝ",
  };

  const forgotPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Request failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: text.sentTitle,
        description: text.sentDescription,
      });
    },
    onError: (error: Error) => {
      toast({
        title: text.errorTitle,
        description: error.message || text.requestError,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: text.errorTitle,
        description: text.enterEmail,
        variant: "destructive",
      });
      return;
    }
    
    forgotPasswordMutation.mutate();
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 bg-leather">
        <Card className="max-w-md w-full metal-gradient border-steel shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-32 h-32 mx-auto mb-6">
              <img 
                src={brandLogo}
                alt={brandLogoAlt}
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            
            <div className="mb-6">
              <div className="w-16 h-16 whiskey-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-black" size={32} />
              </div>
              <h2 className="font-oswald text-2xl font-bold text-whiskey mb-2">
                {text.checkEmail}
              </h2>
              <p className="text-gray-400 mb-4">
                {isEnglish ? (
                  <>
                    If <strong className="text-white">{email}</strong> is registered, you will receive password reset instructions.
                  </>
                ) : (
                  <>
                    Αν το email <strong className="text-white">{email}</strong> είναι εγγεγραμμένο, θα λάβετε οδηγίες για επαναφορά του κωδικού σας.
                  </>
                )}
              </p>
              <p className="text-sm text-gray-500">
                {text.spamHint}
              </p>
            </div>

            <Link href="/">
              <Button className="w-full whiskey-gradient text-black font-semibold">
                {text.backToLogin}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 bg-leather">
      <Card className="max-w-md w-full metal-gradient border-steel shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4">
              <img 
                src={brandLogo}
                alt={brandLogoAlt}
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <h2 className="font-oswald text-3xl font-bold text-whiskey mb-2">
              {text.title}
            </h2>
            <p className="text-gray-400">{text.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-whiskey font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={text.emailPlaceholder}
                  className="pl-10 bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className="w-full whiskey-gradient hover:opacity-90 text-black font-bold py-3 px-4 transition-all duration-200 shine-effect"
            >
              {forgotPasswordMutation.isPending ? text.sending : text.submit}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-whiskey hover:underline flex items-center justify-center">
              <ArrowLeft size={16} className="mr-1" />
              {text.backToLogin}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


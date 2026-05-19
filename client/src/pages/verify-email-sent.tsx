import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/context/language-context";
import { brandLogo, brandLogoAlt } from "@/lib/branding";

export default function VerifyEmailSent() {
  const { isEnglish } = useLanguage();

  const instructions = isEnglish
    ? [
        "Check your email inbox",
        "Open the verification email",
        "Click the verification link",
        "You will be redirected to the sign-in page automatically",
      ]
    : [
        "Ελέγξτε το inbox του email σας",
        "Ανοίξτε το email επιβεβαίωσης",
        "Κάντε κλικ στον σύνδεσμο επιβεβαίωσης",
        "Θα μεταφερθείτε αυτόματα στη σελίδα σύνδεσης",
      ];

  const text = {
    title: isEnglish ? "CHECK YOUR EMAIL" : "ΕΛΕΓΞΤΕ ΤΟ EMAIL ΣΑΣ",
    subtitle: isEnglish
      ? "We sent you an email with a verification link."
      : "Σας στείλαμε ένα email με έναν σύνδεσμο επιβεβαίωσης.",
    details: isEnglish
      ? "Click the link in the email to verify your account."
      : "Κάντε κλικ στον σύνδεσμο στο email για να επιβεβαιώσετε τον λογαριασμό σας.",
    instructions: isEnglish ? "Instructions:" : "📋 Οδηγίες:",
    help: isEnglish
      ? "Didn't receive the email? Check your spam folder or request a new verification email."
      : "Δεν λάβατε email; Ελέγξτε το φάκελο spam ή προσπαθήστε να ζητήσετε νέο email επιβεβαίωσης.",
    backToLogin: isEnglish ? "Back to Sign In" : "Επιστροφή στη Σύνδεση",
    registerAgain: isEnglish ? "Register Again" : "Νέα Εγγραφή",
  };

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
            <div className="w-16 h-16 whiskey-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Mail className="text-black" size={32} />
            </div>
            <h2 className="font-oswald text-2xl font-bold text-whiskey mb-2">
              {text.title}
            </h2>
            <p className="text-gray-400 mb-4">
              {text.subtitle}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {text.details}
            </p>
            
            <div className="text-left bg-charcoal/50 border border-steel rounded-lg p-4 mb-4">
              <p className="text-white text-sm font-semibold mb-2">{text.instructions}</p>
              <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
                {instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ol>
            </div>
            
            <p className="text-xs text-gray-500">
              {text.help}
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full whiskey-gradient text-black font-semibold">
                {text.backToLogin}
              </Button>
            </Link>
            
            <Link href="/register" className="block">
              <Button 
                variant="outline" 
                className="w-full bg-steel text-white border-steel hover:bg-iron"
              >
                <ArrowLeft size={16} className="mr-2" />
                {text.registerAgain}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



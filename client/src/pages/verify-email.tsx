import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { useBranding } from "@/context/branding-context";

export default function VerifyEmail() {
  const { brandLogo, brandLogoAlt } = useBranding();
  const [, params] = useRoute("/verify-email/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const token = params?.token;

  const text = {
    invalidLink: isEnglish
      ? "Invalid verification link. Please request a new verification email."
      : "Μη έγκυρο link επιβεβαίωσης. Παρακαλώ ζητήστε νέο email επιβεβαίωσης.",
    successMessage: isEnglish ? "Your email was verified successfully!" : "Το email σας επιβεβαιώθηκε επιτυχώς!",
    successToastTitle: isEnglish ? "Success!" : "Επιτυχία! 🎉",
    successToastDescription: isEnglish ? "Your email has been verified" : "Το email σας επιβεβαιώθηκε",
    errorMessage: isEnglish ? "Email verification failed" : "Αποτυχία επιβεβαίωσης email",
    errorToastTitle: isEnglish ? "Error" : "Σφάλμα",
    errorToastDescription: isEnglish ? "Verification failed" : "Αποτυχία επιβεβαίωσης",
    catchMessage: isEnglish ? "Email verification failed. Please try again." : "Αποτυχία επιβεβαίωσης email. Παρακαλώ προσπαθήστε ξανά.",
    loadingTitle: isEnglish ? "VERIFYING EMAIL..." : "ΕΠΙΒΕΒΑΙΩΣΗ EMAIL...",
    loadingSubtitle: isEnglish ? "Please wait..." : "Παρακαλώ περιμένετε...",
    successTitle: isEnglish ? "VERIFICATION SUCCESSFUL!" : "ΕΠΙΤΥΧΗΣ ΕΠΙΒΕΒΑΙΩΣΗ!",
    redirecting: isEnglish ? "You will be redirected to sign in automatically..." : "Θα μεταφερθείτε στη σελίδα σύνδεσης αυτόματα...",
    failureTitle: isEnglish ? "VERIFICATION FAILED" : "ΑΠΟΤΥΧΙΑ ΕΠΙΒΕΒΑΙΩΣΗΣ",
    expiredHint: isEnglish ? "The link may have expired or already been used." : "Το link μπορεί να έχει λήξει ή να έχει ήδη χρησιμοποιηθεί.",
    loginNow: isEnglish ? "Sign In Now" : "Σύνδεση Τώρα",
    newRegistration: isEnglish ? "Create New Account" : "Νέα Εγγραφή",
    backToLogin: isEnglish ? "Back to Sign In" : "Επιστροφή στη Σύνδεση",
  };

  useEffect(() => {
    if (!token || token === "null" || token === "undefined") {
      setStatus("error");
      setMessage(text.invalidLink);
      return;
    }

    // Verify the email
    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email/${token}`, {
          method: "GET",
          credentials: "include",
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setStatus("success");
          setMessage(data.message || text.successMessage);
          toast({
            title: text.successToastTitle,
            description: text.successToastDescription,
          });
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            setLocation("/");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || text.errorMessage);
          toast({
            title: text.errorToastTitle,
            description: data.message || text.errorToastDescription,
            variant: "destructive",
          });
        }
      } catch (error) {
        setStatus("error");
        setMessage(text.catchMessage);
        toast({
          title: text.errorToastTitle,
          description: text.errorMessage,
          variant: "destructive",
        });
      }
    };

    verifyEmail();
  }, [
    token,
    setLocation,
    text.invalidLink,
    text.successMessage,
    text.successToastTitle,
    text.successToastDescription,
    text.errorMessage,
    text.errorToastTitle,
    text.errorToastDescription,
    text.catchMessage,
    toast,
  ]);

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
          
          {status === "loading" && (
            <div className="mb-6">
              <div className="w-16 h-16 whiskey-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Loader2 className="text-black animate-spin" size={32} />
              </div>
              <h2 className="font-oswald text-2xl font-bold text-whiskey mb-2">
                {text.loadingTitle}
              </h2>
              <p className="text-gray-400">
                {text.loadingSubtitle}
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="mb-6">
              <div className="w-16 h-16 whiskey-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-black" size={32} />
              </div>
              <h2 className="font-oswald text-2xl font-bold text-whiskey mb-2">
                {text.successTitle}
              </h2>
              <p className="text-gray-400 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500">
                {text.redirecting}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="text-white" size={32} />
              </div>
              <h2 className="font-oswald text-2xl font-bold text-red-400 mb-2">
                {text.failureTitle}
              </h2>
              <p className="text-gray-400 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {text.expiredHint}
              </p>
            </div>
          )}

          {status === "success" ? (
            <Button 
              onClick={() => setLocation("/")}
              className="w-full whiskey-gradient text-black font-semibold"
            >
              {text.loginNow}
            </Button>
          ) : status === "error" ? (
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation("/register")}
                className="w-full whiskey-gradient text-black font-semibold"
              >
                {text.newRegistration}
              </Button>
              <Button 
                onClick={() => setLocation("/")}
                variant="outline" 
                className="w-full bg-steel text-white border-steel hover:bg-iron"
              >
                {text.backToLogin}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}


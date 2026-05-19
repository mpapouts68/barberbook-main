import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/context/language-context";
import { brandLogo, brandLogoAlt } from "@/lib/branding";

export default function ResetPassword() {
  const [, params] = useRoute("/reset-password/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = params?.token;

  const text = {
    errorTitle: isEnglish ? "Error" : "Σφάλμα",
    invalidLink: isEnglish ? "Invalid reset link" : "Μη έγκυρο link επαναφοράς",
    successToastTitle: isEnglish ? "Success!" : "Επιτυχία! 🎉",
    successToastDescription: isEnglish ? "Your password was changed successfully" : "Ο κωδικός σας άλλαξε επιτυχώς",
    resetFailedTitle: isEnglish ? "Reset failed" : "Αποτυχία Επαναφοράς",
    retry: isEnglish ? "Please try again" : "Παρακαλώ προσπαθήστε ξανά",
    fillAllFields: isEnglish ? "Please fill in all fields" : "Παρακαλώ συμπληρώστε όλα τα πεδία",
    passwordsMismatch: isEnglish ? "Passwords do not match" : "Οι κωδικοί δεν ταιριάζουν",
    passwordTooShort: isEnglish ? "Password must be at least 8 characters" : "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες",
    successTitle: isEnglish ? "PASSWORD RESET SUCCESSFUL!" : "ΕΠΙΤΥΧΗΣ ΕΠΑΝΑΦΟΡΑ!",
    successDescription: isEnglish
      ? "Your password has been changed successfully. You can now sign in with your new password."
      : "Ο κωδικός σας άλλαξε επιτυχώς. Μπορείτε τώρα να συνδεθείτε με τον νέο σας κωδικό.",
    redirecting: isEnglish ? "You will be redirected to sign in automatically..." : "Θα μεταφερθείτε στη σελίδα σύνδεσης αυτόματα...",
    loginNow: isEnglish ? "Sign In Now" : "Σύνδεση Τώρα",
    title: isEnglish ? "NEW PASSWORD" : "ΝΕΟΣ ΚΩΔΙΚΟΣ",
    subtitle: isEnglish ? "Create a strong new password" : "Δημιούργησε έναν ισχυρό νέο κωδικό",
    newPassword: isEnglish ? "New password" : "Νέος Κωδικός",
    passwordPlaceholder: isEnglish ? "At least 8 characters" : "Τουλάχιστον 8 χαρακτήρες",
    passwordHint: isEnglish
      ? "Use at least 8 characters with uppercase, lowercase, and numbers"
      : "Χρησιμοποιήστε τουλάχιστον 8 χαρακτήρες με κεφαλαία, πεζά και αριθμούς",
    confirmPassword: isEnglish ? "Confirm password" : "Επιβεβαίωση Κωδικού",
    confirmPlaceholder: isEnglish ? "Repeat password" : "Επανάληψη κωδικού",
    passwordsMatchLabel: isEnglish ? "Passwords match" : "Οι κωδικοί ταιριάζουν",
    resetting: isEnglish ? "Resetting..." : "Επαναφορά...",
    submit: isEnglish ? "RESET PASSWORD" : "ΕΠΑΝΑΦΟΡΑ ΚΩΔΙΚΟΥ",
  };

  useEffect(() => {
    if (!token) {
      toast({
        title: text.errorTitle,
        description: text.invalidLink,
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [token, setLocation, text.errorTitle, text.invalidLink, toast]);

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Reset failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: text.successToastTitle,
        description: text.successToastDescription,
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: text.resetFailedTitle,
        description: error.message || text.retry,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: text.errorTitle,
        description: text.fillAllFields,
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: text.errorTitle,
        description: text.passwordsMismatch,
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: text.errorTitle,
        description: text.passwordTooShort,
        variant: "destructive",
      });
      return;
    }
    
    resetPasswordMutation.mutate();
  };

  if (success) {
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
                <CheckCircle2 className="text-black" size={32} />
              </div>
              <h2 className="font-oswald text-2xl font-bold text-whiskey mb-2">
                {text.successTitle}
              </h2>
              <p className="text-gray-400 mb-4">
                {text.successDescription}
              </p>
              <p className="text-sm text-gray-500">
                {text.redirecting}
              </p>
            </div>

            <Button 
              onClick={() => setLocation("/")}
              className="w-full whiskey-gradient text-black font-semibold"
            >
              {text.loginNow}
            </Button>
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
            {/* New Password */}
            <div>
              <Label htmlFor="password" className="text-whiskey font-semibold">
                {text.newPassword}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={text.passwordPlaceholder}
                  className="pl-10 pr-10 bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-whiskey transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {text.passwordHint}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-whiskey font-semibold">
                {text.confirmPassword}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={text.confirmPlaceholder}
                  className="pl-10 pr-10 bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-whiskey transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-400 mt-1 flex items-center">
                  <CheckCircle2 size={14} className="mr-1" /> {text.passwordsMatchLabel}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="w-full whiskey-gradient hover:opacity-90 text-black font-bold py-3 px-4 transition-all duration-200 shine-effect"
            >
              {resetPasswordMutation.isPending ? text.resetting : text.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



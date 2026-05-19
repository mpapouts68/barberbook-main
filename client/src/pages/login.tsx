import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLanguage } from "@/context/language-context";
import { brandFullName, brandLogo, brandLogoAlt } from "@/lib/branding";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const text = {
    successTitle: isEnglish ? "Login successful" : "Επιτυχής Σύνδεση",
    errorTitle: isEnglish ? "Login failed" : "Αποτυχία Σύνδεσης",
    retry: isEnglish ? "Please try again" : "Παρακαλώ προσπαθήστε ξανά",
    validationTitle: isEnglish ? "Error" : "Σφάλμα",
    validationMessage: isEnglish ? "Please fill in all fields" : "Παρακαλώ συμπληρώστε όλα τα πεδία",
    title: isEnglish ? "WELCOME" : "ΚΑΛΏΣ ΉΡΘΕΣ",
    subtitle: isEnglish ? `Sign in to ${brandFullName}` : `Συνδεθείτε στο ${brandFullName}`,
    emailPlaceholder: isEnglish ? "your_email@example.com" : "το_email_σου@example.com",
    passwordLabel: isEnglish ? "Password" : "Κωδικός",
    forgotPassword: isEnglish ? "Forgot password?" : "Ξέχασες τον κωδικό;",
    submitting: isEnglish ? "Signing in..." : "Σύνδεση...",
    submit: isEnglish ? "SIGN IN" : "ΣΥΝΔΕΣΗ",
    divider: isEnglish ? "Or continue with" : "Ή συνεχίστε με",
    google: isEnglish ? "Continue with Google" : "Συνέχεια με Google",
    facebook: isEnglish ? "Continue with Facebook" : "Συνέχεια με Facebook",
    noAccount: isEnglish ? "Don't have an account?" : "Δεν έχεις λογαριασμό?",
    register: isEnglish ? "Register" : "Εγγραφή",
    terms: isEnglish
      ? `By signing in, you agree to the ${brandFullName} service terms`
      : `Συνδεόμενοι, συμφωνείτε με τους όρους υπηρεσίας του ${brandFullName}`,
  };

  // Check if OAuth is configured (public endpoint, no auth needed)
  const { data: oauthConfig } = useQuery({
    queryKey: ["/api/oauth/status"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/oauth/status");
        if (response.ok) {
          return response.json();
        }
        return { googleEnabled: false, facebookEnabled: false };
      } catch {
        return { googleEnabled: false, facebookEnabled: false };
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: text.successTitle,
        description: isEnglish ? `Welcome, ${data.user.firstName}!` : `Καλώς ήρθες, ${data.user.firstName}!`,
      });
      // Force a page refresh to update auth state
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      toast({
        title: text.errorTitle,
        description: error.message || text.retry,
        variant: "destructive",
      });
    }
  });

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleFacebookLogin = () => {
    window.location.href = "/api/auth/facebook";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: text.validationTitle,
        description: text.validationMessage,
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 bg-leather">
      <Card className="max-w-md w-full metal-gradient border-steel shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-40 h-40 mx-auto mb-6">
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
            {/* Email Field */}
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

            {/* Password Field */}
            <div>
              <Label htmlFor="password" className="text-whiskey font-semibold">
                {text.passwordLabel}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-whiskey hover:underline">
                {text.forgotPassword}
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full whiskey-gradient hover:opacity-90 text-black font-bold py-3 px-4 transition-all duration-200 shine-effect"
            >
              {loginMutation.isPending ? text.submitting : text.submit}
            </Button>
          </form>

          {/* Divider - Only show if OAuth is enabled */}
          {(oauthConfig?.googleEnabled || oauthConfig?.facebookEnabled) && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-charcoal px-2 text-gray-400">{text.divider}</span>
              </div>
            </div>
          )}

          {/* Social Login Buttons - Only show if enabled */}
          {(oauthConfig?.googleEnabled || oauthConfig?.facebookEnabled) && (
            <div className="space-y-3">
              {oauthConfig?.googleEnabled && (
                <Button
                  onClick={handleGoogleLogin}
                  type="button"
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 transition-all duration-200"
                  variant="outline"
                >
                  <FaGoogle className="mr-3 text-lg" />
                  {text.google}
                </Button>
              )}

              {oauthConfig?.facebookEnabled && (
                <Button
                  onClick={handleFacebookLogin}
                  type="button"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 transition-all duration-200"
                >
                  <FaFacebook className="mr-3 text-lg" />
                  {text.facebook}
                </Button>
              )}
            </div>
          )}

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              {text.noAccount}{" "}
              <Link href="/register" className="text-whiskey hover:underline font-semibold">
                {text.register}
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              {text.terms}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/context/language-context";
import { brandFullName, brandLogo, brandLogoAlt } from "@/lib/branding";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthday: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: "" });

  const strengthMessages = isEnglish
    ? ["Very weak", "Weak", "Fair", "Good", "Very good", "Excellent"]
    : ["Πολύ αδύναμος", "Αδύναμος", "Μέτριος", "Καλός", "Πολύ καλός", "Άριστος"];

  const text = {
    title: isEnglish ? "REGISTER" : "ΕΓΓΡΑΦΗ",
    subtitle: isEnglish ? `Join ${brandFullName}` : `Γίνε μέλος του ${brandFullName}`,
    firstName: isEnglish ? "First name *" : "Όνομα *",
    firstNamePlaceholder: isEnglish ? "Your first name" : "Το όνομά σου",
    lastName: isEnglish ? "Last name" : "Επώνυμο",
    lastNamePlaceholder: isEnglish ? "Your last name (optional)" : "Το επώνυμό σου (προαιρετικό)",
    emailPlaceholder: isEnglish ? "your_email@example.com" : "το_email_σου@example.com",
    password: isEnglish ? "Password *" : "Κωδικός *",
    passwordPlaceholder: isEnglish ? "At least 8 characters" : "Τουλάχιστον 8 χαρακτήρες",
    passwordStrength: isEnglish ? "Password strength:" : "Ισχύς κωδικού:",
    passwordHint: isEnglish
      ? "Use at least 8 characters with uppercase, lowercase, and numbers"
      : "Χρησιμοποιήστε τουλάχιστον 8 χαρακτήρες με κεφαλαία, πεζά και αριθμούς",
    confirmPassword: isEnglish ? "Confirm password *" : "Επιβεβαίωση Κωδικού *",
    confirmPasswordPlaceholder: isEnglish ? "Repeat password" : "Επανάληψη κωδικού",
    passwordsMatch: isEnglish ? "Passwords match" : "Οι κωδικοί ταιριάζουν",
    birthday: isEnglish ? "Date of birth" : "Ημερομηνία Γεννήσεως",
    birthdayHint: isEnglish
      ? "Optional - used for birthday offers (e.g. 15-03-1990)"
      : "Προαιρετικό - για ειδικές προσφορές γενεθλίων (π.χ. 15-03-1990)",
    submitting: isEnglish ? "Registering..." : "Εγγραφή...",
    submit: isEnglish ? "REGISTER" : "ΕΓΓΡΑΦΗ",
    haveAccount: isEnglish ? "Already have an account?" : "Έχεις ήδη λογαριασμό?",
    login: isEnglish ? "Sign in" : "Σύνδεση",
    terms: isEnglish
      ? "By registering, you agree to our terms and conditions"
      : "Εγγραφόμενος, συμφωνείς με τους όρους και τις προϋποθέσεις μας",
    successTitle: isEnglish ? "Registration successful!" : "Επιτυχής Εγγραφή! 🎉",
    successDescription: isEnglish ? "Check your email to verify your account" : "Ελέγξτε το email σας για επιβεβαίωση",
    errorTitle: isEnglish ? "Registration failed" : "Αποτυχία Εγγραφής",
    retry: isEnglish ? "Please try again" : "Παρακαλώ προσπαθήστε ξανά",
    validationTitle: isEnglish ? "Error" : "Σφάλμα",
    requiredFields: isEnglish ? "Please fill in all required fields" : "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία",
    passwordsMismatch: isEnglish ? "Passwords do not match" : "Οι κωδικοί δεν ταιριάζουν",
    passwordTooShort: isEnglish ? "Password must be at least 8 characters" : "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες",
  };

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    setPasswordStrength({ score, message: strengthMessages[score] || "" });
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    checkPasswordStrength(value);
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: text.successTitle,
        description: text.successDescription,
      });
      setLocation("/verify-email-sent");
    },
    onError: (error: Error) => {
      toast({
        title: text.errorTitle,
        description: error.message || text.retry,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: text.validationTitle,
        description: text.requiredFields,
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: text.validationTitle,
        description: text.passwordsMismatch,
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password.length < 8) {
      toast({
        title: text.validationTitle,
        description: text.passwordTooShort,
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate();
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 0) return "";
    if (passwordStrength.score <= 2) return "bg-red-500";
    if (passwordStrength.score === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

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
            {/* First Name */}
            <div>
              <Label htmlFor="firstName" className="text-whiskey font-semibold">
                {text.firstName}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder={text.firstNamePlaceholder}
                  className="pl-10 bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey"
                  required
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="lastName" className="text-whiskey font-semibold">
                {text.lastName}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder={text.lastNamePlaceholder}
                  className="pl-10 bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-whiskey font-semibold">
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={text.emailPlaceholder}
                  className="pl-10 bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-whiskey font-semibold">
                {text.password}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
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
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">{text.passwordStrength}</span>
                    <span className={passwordStrength.score <= 2 ? "text-red-400" : passwordStrength.score === 3 ? "text-yellow-400" : "text-green-400"}>
                      {passwordStrength.message}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
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
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder={text.confirmPasswordPlaceholder}
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
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-xs text-green-400 mt-1 flex items-center">
                  <CheckCircle2 size={14} className="mr-1" /> {text.passwordsMatch}
                </p>
              )}
            </div>

            {/* Birthday */}
            <div>
              <Label htmlFor="birthday" className="text-whiskey font-semibold">
                {text.birthday}
              </Label>
              <Input
                id="birthday"
                type="text"
                value={formData.birthday}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                  // Format as DD-MM-YYYY
                  if (value.length > 2) value = value.slice(0, 2) + '-' + value.slice(2);
                  if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5, 9);
                  setFormData({ ...formData, birthday: value });
                }}
                placeholder="DD-MM-YYYY"
                className="bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey"
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                {text.birthdayHint}
              </p>
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full whiskey-gradient hover:opacity-90 text-black font-bold py-3 px-4 transition-all duration-200 shine-effect"
            >
              {registerMutation.isPending ? text.submitting : text.submit}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              {text.haveAccount}{" "}
              <Link href="/" className="text-whiskey hover:underline font-semibold">
                {text.login}
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


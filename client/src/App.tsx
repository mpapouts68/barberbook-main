import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import SplashScreen from "@/pages/splash-screen";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import VerifyEmailSent from "@/pages/verify-email-sent";
import Dashboard from "@/pages/dashboard";
import Booking from "@/pages/booking";
import Appointments from "@/pages/appointments";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import TVDisplay from "@/pages/tv-display";
import Navbar from "@/components/navbar";
import NotFound from "@/pages/not-found";
import { initializePushNotifications } from "@/services/fcm";
import { LanguageProvider, useLanguage } from "@/context/language-context";
import { BrandingProvider } from "@/context/branding-context";
import PublicHeader from "@/components/public-header";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isEnglish } = useLanguage();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="text-center">
          <div className="w-16 h-16 whiskey-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">✂️</span>
          </div>
          <p className="text-gray-400">{isEnglish ? "Loading..." : "Φόρτωση..."}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const isPublicAuthRoute =
    location === "/" ||
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location === "/verify-email-sent" ||
    location === "/booking" ||
    location.startsWith("/reset-password/") ||
    location.startsWith("/verify-email/");

  // All hooks are called here, no conditional returns before this point
  useEffect(() => {
    if (!isLoading && user && (location === "/" || location === "/login")) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, location, setLocation]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!isLoading && user) {
      initializePushNotifications().catch(err => {
        console.error('Failed to initialize push notifications:', err);
      });
    }
  }, [user, isLoading]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Now we can do conditional rendering after all hooks have been called
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="min-h-screen bg-leather">
      {user && <Navbar />}
      {!user && isPublicAuthRoute && <PublicHeader />}
      
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route path="/verify-email/:token" component={VerifyEmail} />
        <Route path="/verify-email-sent" component={VerifyEmailSent} />
        
        {/* Protected Routes - /dashboard and /dashboard/ (trailing slash from OAuth redirect) */}
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        
        <Route path="/booking" component={Booking} />
        
        <Route path="/appointments">
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        </Route>
        
        <Route path="/admin">
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        </Route>
        
        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>
        
        {/* TV Display - no authentication required for display screens */}
        <Route path="/tv-display" component={TVDisplay} />
        
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <BrandingProvider>
            <AuthProvider>
              <Toaster />
              <AppContent />
            </AuthProvider>
          </BrandingProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
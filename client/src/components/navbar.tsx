import { Button } from "@/components/ui/button";
import { Menu, Shield } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "@/components/NotificationBell";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/language-switcher";
import { useLanguage } from "@/context/language-context";
import { brandLogoAlt, brandLogoLandscape } from "@/lib/branding";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isEnglish } = useLanguage();

  const text = {
    home: isEnglish ? "Home" : "Αρχική",
    appointments: isEnglish ? "My Appointments" : "Τα Ραντεβού μου",
    booking: isEnglish ? "Book Appointment" : "Κλείσε Ραντεβού",
    userFallback: isEnglish ? "User" : "Χρήστης",
    logout: isEnglish ? "Logout" : "Έξοδος",
  };

  return (
    <nav className="glass-effect border-b border-steel sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center">
            <img
              src={brandLogoLandscape}
              alt={brandLogoAlt}
              className="h-10 w-auto max-w-[180px] object-contain"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className={`text-gray-300 hover:text-whiskey transition-colors ${
                  location === "/dashboard" ? "text-whiskey" : ""
                }`}
              >
                {text.home}
              </Button>
            </Link>
            <Link href="/appointments">
              <Button
                variant="ghost"
                className={`text-gray-300 hover:text-whiskey transition-colors ${
                  location === "/appointments" ? "text-whiskey" : ""
                }`}
              >
                {text.appointments}
              </Button>
            </Link>
            <Link href="/booking">
              <Button
                variant="ghost"
                className={`text-gray-300 hover:text-whiskey transition-colors ${
                  location === "/booking" ? "text-whiskey" : ""
                }`}
              >
                {text.booking}
              </Button>
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  className={`text-gray-300 hover:text-whiskey transition-colors ${
                    location === "/admin" ? "text-whiskey" : ""
                  }`}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Διαχείριση
                </Button>
              </Link>
            )}

            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <NotificationBell />
              <Link href="/profile">
                <Button
                  variant="ghost"
                  className={`text-gray-300 hover:text-whiskey transition-colors ${
                    location === "/profile" ? "text-whiskey" : ""
                  }`}
                >
                  {user?.firstName || text.userFallback}
                </Button>
              </Link>
              <Button
                onClick={logout}
                variant="ghost"
                className="text-gray-300 hover:text-whiskey"
              >
                {text.logout}
              </Button>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <NotificationBell />
            <Button 
              variant="ghost" 
              className="text-whiskey"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px] bg-slate border-steel">
          <SheetHeader>
            <SheetTitle className="text-whiskey flex items-center">
              <img
                src={brandLogoLandscape}
                alt={brandLogoAlt}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 flex flex-col space-y-4">
            <div className="border-b border-steel pb-4">
              <LanguageSwitcher />
            </div>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                className={`w-full justify-start text-gray-300 hover:text-whiskey transition-colors ${
                  location === "/dashboard" ? "text-whiskey" : ""
                }`}
              >
                {text.home}
              </Button>
            </Link>
            <Link href="/appointments" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                className={`w-full justify-start text-gray-300 hover:text-whiskey transition-colors ${
                  location === "/appointments" ? "text-whiskey" : ""
                }`}
              >
                {text.appointments}
              </Button>
            </Link>
            <Link href="/booking" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                className={`w-full justify-start text-gray-300 hover:text-whiskey transition-colors ${
                  location === "/booking" ? "text-whiskey" : ""
                }`}
              >
                {text.booking}
              </Button>
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-gray-300 hover:text-whiskey transition-colors ${
                    location === "/admin" ? "text-whiskey" : ""
                  }`}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Διαχείριση
                </Button>
              </Link>
            )}
            
            <div className="border-t border-steel pt-4 mt-4 space-y-3">
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-gray-300 hover:text-whiskey transition-colors ${
                    location === "/profile" ? "text-whiskey" : ""
                  }`}
                >
                  {user?.firstName || text.userFallback}
                </Button>
              </Link>
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-whiskey"
              >
                {text.logout}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

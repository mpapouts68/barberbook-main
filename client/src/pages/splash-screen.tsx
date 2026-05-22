import { useEffect, useState } from "react";
import SocialContactBadges from "@/components/SocialContactBadges";
import { brandLogo, brandLogoAlt, brandName, brandTagline } from "@/lib/branding";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Allow fade out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-charcoal transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-center">
        {/* Logo with animation */}
        <div className="w-48 h-48 mx-auto mb-8 relative">
          <div className="absolute inset-0 whiskey-gradient rounded-full opacity-20 animate-ping"></div>
          <div className="relative z-10 w-48 h-48 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <img 
              src={brandLogo} 
              alt={brandLogoAlt}
              className="w-44 h-44 object-contain rounded-full"
            />
          </div>
        </div>
        
        {/* Brand name */}
        <h1 className="font-oswald text-4xl font-bold text-whiskey mb-2 animate-pulse-whiskey">
          {brandName}
        </h1>
        <p className="text-gray-400 font-light tracking-[0.35em] uppercase">{brandTagline}</p>

        <SocialContactBadges className="mt-6" />

        {/* Loading indicator */}
        <div className="mt-8 w-16 h-1 whiskey-gradient mx-auto rounded-full animate-pulse-whiskey"></div>
      </div>
    </div>
  );
}

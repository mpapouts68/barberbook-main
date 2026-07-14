import { useEffect, useState } from "react";
import SocialContactBadges from "@/components/SocialContactBadges";
import { useBranding } from "@/context/branding-context";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { brandLogo, brandLogoLandscape, brandLogoAlt, brandName, brandTagline } = useBranding();
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
      <div className="text-center px-6 max-w-lg mx-auto">
        <img
          src={brandLogoLandscape}
          alt={brandLogoAlt}
          className="h-24 sm:h-32 md:h-40 w-auto max-w-[min(100%,24rem)] mx-auto mb-8 object-contain"
        />

        <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 mx-auto mb-8 relative">
          <div className="absolute inset-0 whiskey-gradient rounded-full opacity-20 animate-ping"></div>
          <div className="relative z-10 w-full h-full rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <img
              src={brandLogo}
              alt={brandLogoAlt}
              className="w-[92%] h-[92%] object-contain rounded-full"
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

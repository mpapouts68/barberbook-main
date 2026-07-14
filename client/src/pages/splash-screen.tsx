import { useEffect, useState } from "react";
import SocialContactBadges from "@/components/SocialContactBadges";
import { useBranding } from "@/context/branding-context";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { brandLogoLandscape, brandLogoAlt, brandName, brandTagline } = useBranding();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-charcoal transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-center px-6 max-w-xl mx-auto">
        <img
          src={brandLogoLandscape}
          alt={brandLogoAlt}
          className="login-brand-hero mx-auto mb-8"
        />

        <h1 className="font-oswald text-4xl font-bold text-whiskey mb-2 animate-pulse-whiskey">
          {brandName}
        </h1>
        <p className="text-gray-400 font-light tracking-[0.35em] uppercase">{brandTagline}</p>

        <SocialContactBadges className="mt-6" />

        <div className="mt-8 w-16 h-1 whiskey-gradient mx-auto rounded-full animate-pulse-whiskey"></div>
      </div>
    </div>
  );
}

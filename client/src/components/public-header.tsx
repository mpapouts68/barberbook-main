import { Link } from "wouter";
import LanguageSwitcher from "@/components/language-switcher";
import { brandLogoAlt, brandLogoLandscape } from "@/lib/branding";

export default function PublicHeader() {
  return (
    <nav className="glass-effect border-b border-steel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <img
              src={brandLogoLandscape}
              alt={brandLogoAlt}
              className="h-10 w-auto max-w-[180px] object-contain"
            />
          </Link>

          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}

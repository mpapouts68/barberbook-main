import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_BRANDING,
  getBrandingBusinessName,
  getBrandingFullName,
  getBrandingLogoAlt,
  getBrandingTagline,
  mergeBranding,
  type BrandingSettings,
  type LandingSlotKey,
} from "@shared/brandingDefaults";
import { useLanguage } from "@/context/language-context";
import {
  defaultLandingImages,
  resolveLandingImage,
  resolveLogoLandscapeUrl,
  resolveLogoUrl,
} from "@/lib/branding";

function darkenHex(hex: string, amount = 0.2): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const r = Math.max(0, Math.round(parseInt(normalized.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(normalized.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(normalized.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Apply full shop palette to CSS variables — drives almost all UI colors. */
export function applyBrandingTheme(b: BrandingSettings) {
  const root = document.documentElement;

  root.style.setProperty("--brand-primary", b.primaryColor);
  root.style.setProperty("--brand-primary-dark", darkenHex(b.primaryColor));
  root.style.setProperty("--brand-primary-foreground", b.primaryForegroundColor);
  root.style.setProperty("--brand-secondary", b.secondaryColor);
  root.style.setProperty("--brand-accent", b.accentColor);

  root.style.setProperty("--header-bg", b.secondaryColor);
  root.style.setProperty("--header-border", b.primaryColor);

  root.style.setProperty("--charcoal", b.backgroundColor);
  root.style.setProperty("--slate", b.cardColor);
  root.style.setProperty("--steel", b.surfaceColor);
  root.style.setProperty("--iron", b.borderColor);
  root.style.setProperty("--whiskey", b.textHighlightColor);
  root.style.setProperty("--bourbon", b.textMutedColor);

  root.style.setProperty("--text-primary", b.textPrimaryColor);
  root.style.setProperty("--text-muted", b.textMutedColor);
  root.style.setProperty("--text-subtle", b.textSubtleColor);

  root.style.setProperty("--destructive", b.destructiveColor);
  root.style.setProperty("--success", b.successColor);
  root.style.setProperty("--warning", b.warningColor);
  root.style.setProperty("--overlay", b.overlayColor);

  root.style.setProperty("--background", b.backgroundColor);
  root.style.setProperty("--foreground", b.textPrimaryColor);
  root.style.setProperty("--card", b.cardColor);
  root.style.setProperty("--card-foreground", b.textPrimaryColor);
  root.style.setProperty("--popover", b.cardColor);
  root.style.setProperty("--popover-foreground", b.textPrimaryColor);
  root.style.setProperty("--primary", b.primaryColor);
  root.style.setProperty("--primary-foreground", b.primaryForegroundColor);
  root.style.setProperty("--secondary", b.surfaceColor);
  root.style.setProperty("--secondary-foreground", b.textPrimaryColor);
  root.style.setProperty("--muted", b.surfaceColor);
  root.style.setProperty("--muted-foreground", b.textMutedColor);
  root.style.setProperty("--accent", b.accentColor);
  root.style.setProperty("--accent-foreground", b.textPrimaryColor);
  root.style.setProperty("--destructive-foreground", b.textPrimaryColor);
  root.style.setProperty("--border", b.borderColor);
  root.style.setProperty("--input", b.inputBackgroundColor);
  root.style.setProperty("--ring", b.accentColor);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", b.backgroundColor);
  }
}

interface BrandingContextValue {
  branding: BrandingSettings;
  isLoading: boolean;
  brandName: string;
  brandTagline: string;
  brandFullName: string;
  brandLogo: string;
  brandLogoLandscape: string;
  brandLogoAlt: string;
  landingImage: (slot: LandingSlotKey) => string;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { isEnglish } = useLanguage();
  const { data, isLoading } = useQuery<BrandingSettings>({
    queryKey: ["/api/branding"],
    staleTime: 5 * 60 * 1000,
  });

  const branding = useMemo(() => mergeBranding(data), [data]);

  useEffect(() => {
    applyBrandingTheme(branding);
  }, [branding]);

  useEffect(() => {
    const title = getBrandingFullName(branding, isEnglish);
    if (title) {
      document.title = title;
    }
  }, [branding, isEnglish]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      isLoading,
      brandName: getBrandingBusinessName(branding, isEnglish),
      brandTagline: getBrandingTagline(branding, isEnglish),
      brandFullName: getBrandingFullName(branding, isEnglish),
      brandLogo: resolveLogoUrl(branding),
      brandLogoLandscape: resolveLogoLandscapeUrl(branding),
      brandLogoAlt: getBrandingLogoAlt(branding, isEnglish),
      landingImage: (slot: LandingSlotKey) => resolveLandingImage(slot, branding),
    }),
    [branding, isEnglish, isLoading],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

function fallbackIsEnglish(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.lang === "en";
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    const fallback = mergeBranding(DEFAULT_BRANDING);
    const isEnglish = fallbackIsEnglish();
    return {
      branding: fallback,
      isLoading: false,
      brandName: getBrandingBusinessName(fallback, isEnglish),
      brandTagline: getBrandingTagline(fallback, isEnglish),
      brandFullName: getBrandingFullName(fallback, isEnglish),
      brandLogo: resolveLogoUrl(fallback),
      brandLogoLandscape: resolveLogoLandscapeUrl(fallback),
      brandLogoAlt: getBrandingLogoAlt(fallback, isEnglish),
      landingImage: (slot) => defaultLandingImages[slot],
    };
  }
  return ctx;
}

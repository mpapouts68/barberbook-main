import brandLogoImage from "@assets/barberbook.png";
import bannerImg from "@assets/BANNER.png";
import bookAppointmentImg from "@assets/APPOINTMENT2.png";
import myAppointmentsImg from "@assets/MYAPPOINTMENTS.png";
import namedayImg from "@assets/EORTOLOGIO.png";
import profileImg from "@assets/SETTINGS.png";
import recentActivityImg from "@assets/PROSFATA.png";
import shopGalleryImg from "@assets/shop.jpg";
import bookingImg from "@assets/APPOINTMENT.png";
import {
  DEFAULT_BRANDING,
  brandingFullName,
  type BrandingSettings,
  type LandingSlotKey,
} from "@shared/brandingDefaults";

export const brandName = DEFAULT_BRANDING.businessName;
export const brandTagline = DEFAULT_BRANDING.tagline;
export const brandFullName = brandingFullName(brandName, brandTagline);
export const brandLogo = brandLogoImage;
export const brandLogoLandscape = brandLogoImage;
export const brandLogoAlt = `${brandName} logo`;

export const defaultLandingImages: Record<LandingSlotKey, string> = {
  banner: bannerImg,
  bookAppointment: bookAppointmentImg,
  myAppointments: myAppointmentsImg,
  nameday: namedayImg,
  profile: profileImg,
  recentActivity: recentActivityImg,
  shopGallery: shopGalleryImg,
  booking: bookingImg,
};

export { DEFAULT_BRANDING, brandingFullName };
export type { BrandingSettings, LandingSlotKey };

function parsePhoneList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function mapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Public contact on splash / login — configure via VITE_CONTACT_* in .env */
export const contactLinks = {
  instagram: (import.meta.env.VITE_CONTACT_INSTAGRAM as string | undefined) || "",
  facebook: (import.meta.env.VITE_CONTACT_FACEBOOK as string | undefined) || "",
  email: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || "",
  phones: (() => {
    const list = parsePhoneList(import.meta.env.VITE_CONTACT_PHONES as string | undefined);
    if (list.length > 0) return list;
    const single = (import.meta.env.VITE_CONTACT_PHONE as string | undefined)?.trim();
    if (single) return [single];
    return [] as string[];
  })(),
  address: (import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || "",
  mapsUrl: (() => {
    const custom = import.meta.env.VITE_CONTACT_MAPS as string | undefined;
    if (custom) return custom;
    const address = (import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || "";
    return address ? mapsSearchUrl(address) : "";
  })(),
};

export function resolveLandingImage(
  slot: LandingSlotKey,
  branding?: BrandingSettings | null,
): string {
  const custom = branding?.landingImages?.[slot];
  if (custom) return custom;
  return defaultLandingImages[slot];
}

export function resolveLogoUrl(branding?: BrandingSettings | null): string {
  return branding?.logoUrl || brandLogo;
}

export function resolveLogoLandscapeUrl(branding?: BrandingSettings | null): string {
  return branding?.logoLandscapeUrl || branding?.logoUrl || brandLogoLandscape;
}

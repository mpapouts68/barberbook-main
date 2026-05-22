import brandLogoRound from "@brand-assets/peqi_logo_round.PNG";
import brandLogoLandscapeImage from "@brand-assets/PEQI_LOGO_Landscape.png";

export const brandName = "PEQI";
export const brandTagline = "Haircut Studio";
export const brandFullName = `${brandName} ${brandTagline}`;
export const brandLogo = brandLogoRound;
export const brandLogoLandscape = brandLogoLandscapeImage;
export const brandLogoAlt = `${brandName} logo`;

/** Public contact badges on login — override via VITE_CONTACT_* in .env */
export const contactLinks = {
  instagram:
    (import.meta.env.VITE_CONTACT_INSTAGRAM as string | undefined) ||
    "https://www.instagram.com/peqihaircutstudio",
  facebook:
    (import.meta.env.VITE_CONTACT_FACEBOOK as string | undefined) ||
    "https://www.facebook.com/peqihaircutstudio",
  phone: (import.meta.env.VITE_CONTACT_PHONE as string | undefined) || "",
  address: (import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || "",
  mapsUrl: (import.meta.env.VITE_CONTACT_MAPS as string | undefined) || "",
};

import brandLogoRound from "@brand-assets/peqi_logo_round.PNG";
import brandLogoLandscapeImage from "@brand-assets/PEQI_LOGO_Landscape.png";

export const brandName = "PEQI";
export const brandTagline = "Haircut Studio";
export const brandFullName = `${brandName} ${brandTagline}`;
export const brandLogo = brandLogoRound;
export const brandLogoLandscape = brandLogoLandscapeImage;
export const brandLogoAlt = `${brandName} logo`;

export const defaultContactAddress = "Sanoudaki 9, Limenas Chersonisou, Greece";

const defaultPhones = ["+302897023232", "+306944054270", "+306944959485"];

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

/** Public contact on splash / login — override via VITE_CONTACT_* in .env */
export const contactLinks = {
  instagram:
    (import.meta.env.VITE_CONTACT_INSTAGRAM as string | undefined) ||
    "https://www.instagram.com/peqi_haircut_studio?igsh=MTcwaWV4YjZ0cWNpaw%3D%3D&utm_source=qr",
  facebook:
    (import.meta.env.VITE_CONTACT_FACEBOOK as string | undefined) ||
    "https://www.facebook.com/share/1CqjMj33v4/?mibextid=wwXIfr",
  email:
    (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || "peqibarber@yahoo.com",
  phones: (() => {
    const list = parsePhoneList(import.meta.env.VITE_CONTACT_PHONES as string | undefined);
    if (list.length > 0) return list;
    const single = (import.meta.env.VITE_CONTACT_PHONE as string | undefined)?.trim();
    if (single) return [single];
    return defaultPhones;
  })(),
  address:
    (import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || defaultContactAddress,
  mapsUrl:
    (import.meta.env.VITE_CONTACT_MAPS as string | undefined) ||
    mapsSearchUrl(
      (import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || defaultContactAddress,
    ),
};

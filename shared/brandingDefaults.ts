/** White-label branding defaults — BarberBook product identity. */

export const LANDING_SLOTS = [
  { key: "banner", labelEn: "Hero banner", labelEl: "Κύρια εικόνα" },
  { key: "bookAppointment", labelEn: "Book appointment card", labelEl: "Κάρτα κράτησης" },
  { key: "myAppointments", labelEn: "My appointments card", labelEl: "Κάρτα ραντεβού" },
  { key: "nameday", labelEn: "Name day card", labelEl: "Κάρτα εορτολογίου" },
  { key: "profile", labelEn: "Profile card", labelEl: "Κάρτα προφίλ" },
  { key: "recentActivity", labelEn: "Recent activity", labelEl: "Πρόσφατη δραστηριότητα" },
  { key: "shopGallery", labelEn: "Shop gallery background", labelEl: "Φόντο gallery" },
  { key: "booking", labelEn: "Guest booking hero", labelEl: "Κράτηση επισκέπτη" },
] as const;

export type LandingSlotKey = (typeof LANDING_SLOTS)[number]["key"];

export type LandingImagesMap = Partial<Record<LandingSlotKey, string | null>>;

/** Every color token a shop can customize (layout/spacing excluded). */
export interface BrandingColorPalette {
  primaryColor: string;
  primaryForegroundColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  surfaceColor: string;
  borderColor: string;
  inputBackgroundColor: string;
  textPrimaryColor: string;
  textMutedColor: string;
  textSubtleColor: string;
  textHighlightColor: string;
  destructiveColor: string;
  successColor: string;
  warningColor: string;
  overlayColor: string;
}

export interface BrandingSettings extends BrandingColorPalette {
  /** Greek (primary) business name */
  businessName: string;
  /** English business name — falls back to businessName when empty */
  businessNameEn: string | null;
  /** Greek (primary) tagline */
  tagline: string;
  /** English tagline — falls back to tagline when empty */
  taglineEn: string | null;
  logoUrl: string | null;
  logoLandscapeUrl: string | null;
  landingImages: LandingImagesMap;
}

export const DEFAULT_BRANDING_COLORS: BrandingColorPalette = {
  primaryColor: "#C62828",
  primaryForegroundColor: "#000000",
  secondaryColor: "#1A237E",
  accentColor: "#1565C0",
  backgroundColor: "#0a0a0a",
  cardColor: "#121212",
  surfaceColor: "#1c1c1c",
  borderColor: "#333333",
  inputBackgroundColor: "#0d0d0d",
  textPrimaryColor: "#fafafa",
  textMutedColor: "#a3a3a3",
  textSubtleColor: "#737373",
  textHighlightColor: "#ffffff",
  destructiveColor: "#ef4444",
  successColor: "#22c55e",
  warningColor: "#eab308",
  overlayColor: "rgba(0,0,0,0.82)",
};

export const BRANDING_COLOR_GROUPS = [
  {
    title: "Brand",
    titleEl: "Ταυτότητα",
    fields: [
      { key: "primaryColor", label: "Primary", labelEl: "Κύριο", hint: "Buttons, header stripe, CTAs", hintEl: "Κουμπιά, λωρίδα header, CTAs" },
      { key: "primaryForegroundColor", label: "On primary", labelEl: "Πάνω στο κύριο", hint: "Text on primary buttons", hintEl: "Κείμενο σε κύρια κουμπιά" },
      { key: "secondaryColor", label: "Secondary", labelEl: "Δευτερεύον", hint: "Header background", hintEl: "Φόντο header" },
      { key: "accentColor", label: "Accent", labelEl: "Τονισμός", hint: "Active links, highlights", hintEl: "Ενεργοί σύνδεσμοι, τονισμοί" },
    ],
  },
  {
    title: "Surfaces",
    titleEl: "Επιφάνειες",
    fields: [
      { key: "backgroundColor", label: "Page background", labelEl: "Φόντο σελίδας", hint: "Main app background", hintEl: "Κύριο φόντο εφαρμογής" },
      { key: "cardColor", label: "Cards", labelEl: "Κάρτες", hint: "Cards, panels, dialogs", hintEl: "Κάρτες, πάνελ, παράθυρα" },
      { key: "surfaceColor", label: "Surface", labelEl: "Επιφάνεια", hint: "Secondary buttons, inputs hover", hintEl: "Δευτερεύοντα κουμπιά, hover inputs" },
      { key: "borderColor", label: "Borders", labelEl: "Περιγράμματα", hint: "Borders & dividers", hintEl: "Περιγράμματα & διαχωριστικά" },
      { key: "inputBackgroundColor", label: "Inputs", labelEl: "Πεδία", hint: "Form fields", hintEl: "Πεδία φόρμας" },
      { key: "overlayColor", label: "Overlay", labelEl: "Επικάλυψη", hint: "Modal backdrop (rgba)", hintEl: "Φόντο modal (rgba)" },
    ],
  },
  {
    title: "Text",
    titleEl: "Κείμενο",
    fields: [
      { key: "textPrimaryColor", label: "Primary text", labelEl: "Κύριο κείμενο", hint: "Main body text", hintEl: "Κύριο κείμενο" },
      { key: "textMutedColor", label: "Muted text", labelEl: "Αχνό κείμενο", hint: "Descriptions, labels", hintEl: "Περιγραφές, ετικέτες" },
      { key: "textSubtleColor", label: "Subtle text", labelEl: "Διακριτικό κείμενο", hint: "Hints, placeholders", hintEl: "Υποδείξεις, placeholders" },
      { key: "textHighlightColor", label: "Highlight", labelEl: "Τονισμένο", hint: "Headings, emphasis", hintEl: "Τίτλοι, έμφαση" },
    ],
  },
  {
    title: "Status",
    titleEl: "Κατάσταση",
    fields: [
      { key: "destructiveColor", label: "Error / delete", labelEl: "Σφάλμα / διαγραφή", hint: "Errors, destructive actions", hintEl: "Σφάλματα, καταστροφικές ενέργειες" },
      { key: "successColor", label: "Success", labelEl: "Επιτυχία", hint: "Confirmed, completed", hintEl: "Επιβεβαιωμένο, ολοκληρωμένο" },
      { key: "warningColor", label: "Warning", labelEl: "Προειδοποίηση", hint: "Alerts, pending", hintEl: "Ειδοποιήσεις, εκκρεμεί" },
    ],
  },
] as const;

export type BrandingColorKey = keyof BrandingColorPalette;

export const DEFAULT_BRANDING: BrandingSettings = {
  businessName: "BarberBook",
  businessNameEn: "BarberBook",
  tagline: "Κλείσε το κούρεμά σου",
  taglineEn: "Book Your Cut",
  logoUrl: "/branding/barberbook-logo.png",
  logoLandscapeUrl: "/branding/barberbook-logo.png",
  ...DEFAULT_BRANDING_COLORS,
  landingImages: {},
};

export function parseLandingImages(raw: string | null | undefined): LandingImagesMap {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as LandingImagesMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function pickColor(
  stored: Partial<BrandingColorPalette> | null | undefined,
  key: BrandingColorKey,
): string {
  const value = stored?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return DEFAULT_BRANDING_COLORS[key];
}

export function mergeBranding(
  stored: Partial<BrandingSettings> | null | undefined,
): BrandingSettings {
  const landing = {
    ...DEFAULT_BRANDING.landingImages,
    ...(stored?.landingImages ?? {}),
  };

  const colors = Object.fromEntries(
    (Object.keys(DEFAULT_BRANDING_COLORS) as BrandingColorKey[]).map((key) => [
      key,
      pickColor(stored, key),
    ]),
  ) as BrandingColorPalette;

  return {
    businessName: stored?.businessName?.trim() || DEFAULT_BRANDING.businessName,
    businessNameEn: stored?.businessNameEn?.trim() || null,
    tagline: stored?.tagline?.trim() || DEFAULT_BRANDING.tagline,
    taglineEn: stored?.taglineEn?.trim() || null,
    logoUrl: stored?.logoUrl?.trim() || DEFAULT_BRANDING.logoUrl,
    logoLandscapeUrl: stored?.logoLandscapeUrl?.trim() || DEFAULT_BRANDING.logoLandscapeUrl,
    ...colors,
    landingImages: landing,
  };
}

export function brandingFullName(businessName: string, tagline: string): string {
  const name = businessName.trim();
  const tag = tagline.trim();
  if (!tag) return name;
  if (name.toLowerCase().includes(tag.toLowerCase())) return name;
  return `${name} — ${tag}`;
}

/** Localized business name (Greek primary + optional English). */
export function getBrandingBusinessName(
  branding: Pick<BrandingSettings, "businessName" | "businessNameEn">,
  isEnglish: boolean,
): string {
  if (isEnglish && branding.businessNameEn?.trim()) {
    return branding.businessNameEn.trim();
  }
  return branding.businessName;
}

/** Localized tagline (Greek primary + optional English). */
export function getBrandingTagline(
  branding: Pick<BrandingSettings, "tagline" | "taglineEn">,
  isEnglish: boolean,
): string {
  if (isEnglish && branding.taglineEn?.trim()) {
    return branding.taglineEn.trim();
  }
  return branding.tagline;
}

export function getBrandingFullName(branding: BrandingSettings, isEnglish: boolean): string {
  return brandingFullName(
    getBrandingBusinessName(branding, isEnglish),
    getBrandingTagline(branding, isEnglish),
  );
}

export function getBrandingLogoAlt(branding: BrandingSettings, isEnglish: boolean): string {
  const name = getBrandingBusinessName(branding, isEnglish);
  return isEnglish ? `${name} logo` : `Λογότυπο ${name}`;
}

export function brandingColorsFromForm(
  form: Record<string, string>,
): BrandingColorPalette {
  return Object.fromEntries(
    (Object.keys(DEFAULT_BRANDING_COLORS) as BrandingColorKey[]).map((key) => [
      key,
      form[key]?.trim() || DEFAULT_BRANDING_COLORS[key],
    ]),
  ) as BrandingColorPalette;
}

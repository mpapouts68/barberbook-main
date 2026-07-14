import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import {
  BRANDING_COLOR_GROUPS,
  DEFAULT_BRANDING_COLORS,
  LANDING_SLOTS,
  getBrandingBusinessName,
  getBrandingTagline,
  mergeBranding,
  type BrandingColorKey,
  type BrandingSettings,
} from "@shared/brandingDefaults";
import { applyBrandingTheme, useBranding } from "@/context/branding-context";
import { useLanguage } from "@/context/language-context";
import { ImageIcon, Palette, RotateCcw, Upload } from "lucide-react";

type BrandingForm = {
  businessName: string;
  businessNameEn: string;
  tagline: string;
  taglineEn: string;
} & Record<BrandingColorKey, string>;

function brandingToForm(b: BrandingSettings): BrandingForm {
  return {
    businessName: b.businessName,
    businessNameEn: b.businessNameEn ?? "",
    tagline: b.tagline,
    taglineEn: b.taglineEn ?? "",
    ...Object.fromEntries(
      (Object.keys(DEFAULT_BRANDING_COLORS) as BrandingColorKey[]).map((key) => [key, b[key]]),
    ),
  } as BrandingForm;
}

function ColorField({
  label,
  hint,
  value,
  onChange,
  allowTextOnly,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  allowTextOnly?: boolean;
}) {
  const isHex = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <div className="space-y-1">
      <Label className="text-whiskey text-xs">{label}</Label>
      <p className="text-gray-500 text-[10px] leading-tight">{hint}</p>
      <div className="flex gap-2 items-center">
        {!allowTextOnly && (
          <input
            type="color"
            value={isHex ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 rounded cursor-pointer border border-steel bg-transparent shrink-0"
          />
        )}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-charcoal border-steel text-white text-xs"
        />
      </div>
    </div>
  );
}

export default function BrandingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { branding, landingImage } = useBranding();
  const { isEnglish } = useLanguage();

  const text = {
    pageTitle: isEnglish ? "Branding" : "Ταυτότητα",
    pageDesc: isEnglish
      ? "Almost every color in the app is configurable here (layout spacing is fixed). Changes preview live — click Save to keep them."
      : "Σχεδόν κάθε χρώμα στην εφαρμογή ρυθμίζεται εδώ (τα περιθώρια παραμένουν σταθερά). Η προεπισκόπηση είναι ζωντανή — πάτησε Αποθήκευση για να κρατήσεις τις αλλαγές.",
    identity: isEnglish ? "Identity" : "Ταυτότητα",
    businessNameEl: isEnglish ? "Business name (Greek)" : "Επωνυμία (Ελληνικά)",
    businessNameEn: isEnglish ? "Business name (English)" : "Επωνυμία (Αγγλικά)",
    taglineEl: isEnglish ? "Tagline (Greek)" : "Σλόγκαν (Ελληνικά)",
    taglineEn: isEnglish ? "Tagline (English)" : "Σλόγκαν (Αγγλικά)",
    taglinePlaceholder: isEnglish ? "Book Your Cut" : "Κλείσε το κούρεμά σου",
    colorPalette: isEnglish ? "Color palette" : "Παλέτα χρωμάτων",
    resetColors: isEnglish ? "Reset colors to BarberBook defaults" : "Επαναφορά χρωμάτων στα προεπιλεγμένα",
    livePreview: isEnglish ? "Live UI preview" : "Ζωντανή προεπισκόπηση",
    primaryBody: isEnglish ? "Primary body text" : "Κύριο κείμενο",
    mutedDesc: isEnglish ? "Muted description text" : "Αχνή περιγραφή",
    subtleHint: isEnglish ? "Subtle hint text" : "Διακριτική υπόδειξη",
    cardHeading: isEnglish ? "Card heading" : "Τίτλος κάρτας",
    cardContent: isEnglish ? "Card content on branded surface" : "Περιεχόμενο κάρτας",
    primaryBtn: isEnglish ? "Primary button" : "Κύριο κουμπί",
    secondaryBtn: isEnglish ? "Secondary" : "Δευτερεύον",
    success: isEnglish ? "Success" : "Επιτυχία",
    error: isEnglish ? "Error" : "Σφάλμα",
    inputPlaceholder: isEnglish ? "Input placeholder" : "Placeholder πεδίου",
    save: isEnglish ? "Save branding" : "Αποθήκευση ταυτότητας",
    savedTitle: isEnglish ? "Branding saved" : "Η ταυτότητα αποθηκεύτηκε",
    savedDesc: isEnglish ? "Your shop colors and identity are live." : "Τα χρώματα και η ταυτότητα του καταστήματός σου είναι ενεργά.",
    errorTitle: isEnglish ? "Error" : "Σφάλμα",
    logoUploaded: isEnglish ? "Logo uploaded" : "Το λογότυπο ανέβηκε",
    imageUploaded: isEnglish ? "Image uploaded" : "Η εικόνα ανέβηκε",
    uploadFailed: isEnglish ? "Upload failed" : "Η μεταφόρτωση απέτυχε",
    resetImage: isEnglish ? "Reset to default image" : "Επαναφορά στην προεπιλογή",
    logos: isEnglish ? "Logos" : "Λογότυπα",
    squareLogo: isEnglish ? "Square / round logo" : "Τετράγωνο / στρογγυλό λογότυπο",
    landscapeLogo: isEnglish ? "Landscape header logo" : "Οριζόντιο λογότυπο header",
    upload: isEnglish ? "Upload" : "Μεταφόρτωση",
    landingImages: isEnglish ? "Landing page images (8)" : "Εικόνες αρχικής (8)",
    replace: isEnglish ? "Replace" : "Αντικατάσταση",
    resetDefault: isEnglish ? "Reset to default" : "Επαναφορά προεπιλογής",
  };

  const [form, setForm] = useState<BrandingForm>(() => brandingToForm(branding));

  const { data: serverBranding } = useQuery<BrandingSettings>({
    queryKey: ["/api/branding"],
  });

  const current = serverBranding ?? branding;

  useEffect(() => {
    if (serverBranding) {
      setForm(brandingToForm(serverBranding));
    }
  }, [serverBranding]);

  const previewBranding = useMemo(
    () =>
      mergeBranding({
        ...current,
        ...form,
        businessNameEn: form.businessNameEn.trim() || null,
        taglineEn: form.taglineEn.trim() || null,
      }),
    [current, form],
  );

  const previewName = getBrandingBusinessName(previewBranding, isEnglish);
  const previewTagline = getBrandingTagline(previewBranding, isEnglish);

  useEffect(() => {
    applyBrandingTheme(previewBranding);
  }, [previewBranding]);

  const setColor = (key: BrandingColorKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateBranding({
        ...form,
        businessNameEn: form.businessNameEn.trim() || null,
        taglineEn: form.taglineEn.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({ title: text.savedTitle, description: text.savedDesc });
    },
    onError: (error: Error) => {
      toast({ title: text.errorTitle, description: error.message, variant: "destructive" });
    },
  });

  const resetColors = () => {
    setForm((f) => ({
      ...f,
      ...DEFAULT_BRANDING_COLORS,
    }));
  };

  const logoMutation = useMutation({
    mutationFn: ({ file, variant }: { file: File; variant: "round" | "landscape" }) =>
      api.uploadBrandingLogo(file, variant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({ title: text.logoUploaded });
    },
    onError: (error: Error) => {
      toast({ title: text.uploadFailed, description: error.message, variant: "destructive" });
    },
  });

  const landingMutation = useMutation({
    mutationFn: ({ slot, file }: { slot: string; file: File }) =>
      api.uploadBrandingLanding(slot, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({ title: text.imageUploaded });
    },
    onError: (error: Error) => {
      toast({ title: text.uploadFailed, description: error.message, variant: "destructive" });
    },
  });

  const clearLandingMutation = useMutation({
    mutationFn: (slot: string) => api.clearBrandingLanding(slot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({ title: text.resetImage });
    },
  });

  const handleLogoUpload = (variant: "round" | "landscape") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) logoMutation.mutate({ file, variant });
    e.target.value = "";
  };

  const handleLandingUpload = (slot: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) landingMutation.mutate({ slot, file });
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="w-6 h-6 text-whiskey" />
        <div>
          <h2 className="text-2xl font-bold text-whiskey">{text.pageTitle}</h2>
          <p className="text-gray-400 text-sm">{text.pageDesc}</p>
        </div>
      </div>

      <Card className="metal-gradient border-steel">
        <CardHeader>
          <CardTitle className="text-whiskey">{text.identity}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-whiskey">{text.businessNameEl}</Label>
              <Input
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                className="bg-charcoal border-steel text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-whiskey">{text.businessNameEn}</Label>
              <Input
                value={form.businessNameEn}
                onChange={(e) => setForm((f) => ({ ...f, businessNameEn: e.target.value }))}
                className="bg-charcoal border-steel text-white"
                placeholder="BarberBook"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-whiskey">{text.taglineEl}</Label>
              <Input
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                className="bg-charcoal border-steel text-white"
                placeholder={text.taglinePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-whiskey">{text.taglineEn}</Label>
              <Input
                value={form.taglineEn}
                onChange={(e) => setForm((f) => ({ ...f, taglineEn: e.target.value }))}
                className="bg-charcoal border-steel text-white"
                placeholder="Book Your Cut"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="metal-gradient border-steel">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-whiskey">{text.colorPalette}</CardTitle>
          <Button type="button" variant="outline" size="sm" className="border-steel text-whiskey" onClick={resetColors}>
            {text.resetColors}
          </Button>
        </CardHeader>
        <CardContent className="space-y-8">
          {BRANDING_COLOR_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-whiskey font-semibold text-sm uppercase tracking-wide">
                {isEnglish ? group.title : group.titleEl}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.fields.map((field) => (
                  <ColorField
                    key={field.key}
                    label={isEnglish ? field.label : field.labelEl}
                    hint={isEnglish ? field.hint : field.hintEl}
                    value={form[field.key]}
                    onChange={(v) => setColor(field.key, v)}
                    allowTextOnly={field.key === "overlayColor"}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <Label className="text-whiskey text-xs">{text.livePreview}</Label>
            <div
              className="rounded-lg overflow-hidden border border-steel"
              style={{ background: form.backgroundColor }}
            >
              <div
                className="h-12 flex items-center px-4 gap-3"
                style={{
                  background: `linear-gradient(135deg, ${form.secondaryColor} 0%, ${form.primaryColor}33 100%)`,
                  borderBottom: `3px solid ${form.primaryColor}`,
                }}
              >
                <span className="font-oswald font-semibold" style={{ color: form.textHighlightColor }}>
                  {previewName}
                </span>
                <span className="text-sm" style={{ color: form.accentColor }}>
                  {previewTagline}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <p style={{ color: form.textPrimaryColor }}>{text.primaryBody}</p>
                <p className="text-sm" style={{ color: form.textMutedColor }}>
                  {text.mutedDesc}
                </p>
                <p className="text-xs" style={{ color: form.textSubtleColor }}>
                  {text.subtleHint}
                </p>
                <div
                  className="rounded-md p-3 border"
                  style={{
                    background: form.cardColor,
                    borderColor: form.borderColor,
                  }}
                >
                  <p style={{ color: form.textHighlightColor }}>{text.cardHeading}</p>
                  <p className="text-sm mt-1" style={{ color: form.textMutedColor }}>
                    {text.cardContent}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span
                      className="px-3 py-1 rounded text-sm font-semibold"
                      style={{
                        background: `linear-gradient(135deg, ${form.primaryColor}, ${form.primaryColor}cc)`,
                        color: form.primaryForegroundColor,
                      }}
                    >
                      {text.primaryBtn}
                    </span>
                    <span
                      className="px-3 py-1 rounded text-sm border"
                      style={{
                        background: form.surfaceColor,
                        borderColor: form.borderColor,
                        color: form.textPrimaryColor,
                      }}
                    >
                      {text.secondaryBtn}
                    </span>
                    <span className="text-sm" style={{ color: form.successColor }}>
                      {text.success}
                    </span>
                    <span className="text-sm" style={{ color: form.destructiveColor }}>
                      {text.error}
                    </span>
                  </div>
                </div>
                <input
                  readOnly
                  placeholder={text.inputPlaceholder}
                  className="w-full rounded-md px-3 py-2 text-sm border"
                  style={{
                    background: form.inputBackgroundColor,
                    borderColor: form.borderColor,
                    color: form.textPrimaryColor,
                  }}
                />
              </div>
            </div>
          </div>

          <Button
            className="whiskey-gradient hover:opacity-90 font-semibold"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {text.save}
          </Button>
        </CardContent>
      </Card>

      <Card className="metal-gradient border-steel">
        <CardHeader>
          <CardTitle className="text-whiskey">{text.logos}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 text-center">
            <p className="text-gray-400 text-sm">{text.squareLogo}</p>
            <img
              src={current.logoUrl || "/branding/default-logo.png"}
              alt="Logo"
              className="w-32 h-32 object-contain mx-auto rounded-lg bg-slate/20 p-2"
            />
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload("round")} />
              <Button variant="outline" className="border-steel text-whiskey" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {text.upload}
                </span>
              </Button>
            </label>
          </div>
          <div className="space-y-3 text-center">
            <p className="text-gray-400 text-sm">{text.landscapeLogo}</p>
            <img
              src={current.logoLandscapeUrl || current.logoUrl || "/branding/default-logo.png"}
              alt="Landscape logo"
              className="h-20 max-w-full object-contain mx-auto rounded-lg bg-slate/20 p-2"
            />
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload("landscape")} />
              <Button variant="outline" className="border-steel text-whiskey" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {text.upload}
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="metal-gradient border-steel">
        <CardHeader>
          <CardTitle className="text-whiskey flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {text.landingImages}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LANDING_SLOTS.map((slot) => {
              const preview = landingImage(slot.key);
              const hasCustom = Boolean(current.landingImages?.[slot.key]);
              return (
                <div key={slot.key} className="rounded-lg border border-steel overflow-hidden bg-charcoal/50">
                  <img src={preview} alt={isEnglish ? slot.labelEn : slot.labelEl} className="w-full h-28 object-cover" />
                  <div className="p-3 space-y-2">
                    <p className="text-whiskey text-sm font-medium">
                      {isEnglish ? slot.labelEn : slot.labelEl}
                    </p>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLandingUpload(slot.key)}
                        />
                        <Button size="sm" variant="outline" className="w-full border-steel text-whiskey" asChild>
                          <span>{text.replace}</span>
                        </Button>
                      </label>
                      {hasCustom && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400"
                          onClick={() => clearLandingMutation.mutate(slot.key)}
                          title={text.resetDefault}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

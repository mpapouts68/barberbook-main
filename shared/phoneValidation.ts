/** E.164-style international number: +countryCode + subscriber digits (8–15 digits total). */
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizeInternationalPhone(raw: string): string {
  let value = raw.trim().replace(/[\s().-]/g, "");
  if (!value) return "";
  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`;
  }
  return value;
}

export type PhoneValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; message: string };

export function validateInternationalPhone(raw: string): PhoneValidationResult {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return {
      ok: false,
      message:
        "Το τηλέφωνο είναι υποχρεωτικό με κωδικό χώρας (π.χ. +30…) / Phone is required with country code (e.g. +30…)",
    };
  }

  const normalized = normalizeInternationalPhone(trimmed);
  if (!normalized.startsWith("+")) {
    return {
      ok: false,
      message:
        "Ξεκινήστε το τηλέφωνο με + και κωδικό χώρας / Start the phone number with + and your country code",
    };
  }

  if (!E164_REGEX.test(normalized)) {
    return {
      ok: false,
      message:
        "Μη έγκυρο διεθνές τηλέφωνο (π.χ. +306912345678) / Invalid international phone (e.g. +306912345678)",
    };
  }

  return { ok: true, normalized };
}

export function isValidInternationalPhone(raw: string): boolean {
  return validateInternationalPhone(raw).ok;
}

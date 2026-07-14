/** Shared email HTML styling — reads shop branding from DB when available. */

import { storage } from "../storage";
import { brandingFullName, DEFAULT_BRANDING, getBrandingBusinessName, getBrandingFullName, getBrandingTagline } from "@shared/brandingDefaults";

export interface EmailBrand {
  name: string;
  tagline: string;
  full: string;
  primaryColor: string;
  backgroundColor: string;
}

export async function resolveEmailBranding(lang: "el" | "en" = "el"): Promise<EmailBrand> {
  const isEnglish = lang === "en";
  try {
    const b = await storage.getBrandingSettings();
    const name = getBrandingBusinessName(b, isEnglish);
    const tagline = getBrandingTagline(b, isEnglish);
    return {
      name,
      tagline,
      full: getBrandingFullName(b, isEnglish),
      primaryColor: b.primaryColor,
      backgroundColor: b.backgroundColor,
    };
  } catch {
    const name = getBrandingBusinessName(DEFAULT_BRANDING, isEnglish);
    const tagline = getBrandingTagline(DEFAULT_BRANDING, isEnglish);
    return {
      name,
      tagline,
      full: getBrandingFullName(DEFAULT_BRANDING, isEnglish),
      primaryColor: DEFAULT_BRANDING.primaryColor,
      backgroundColor: DEFAULT_BRANDING.backgroundColor,
    };
  }
}

export function emailBaseCss(brand: EmailBrand): string {
  return `
  body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: ${brand.backgroundColor}; color: #ffffff; padding: 28px 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.02em; }
  .header .tagline { margin: 8px 0 0; font-size: 13px; color: #a3a3a3; font-weight: normal; }
  .content { background: #f5f5f5; padding: 28px 24px; }
  .content h2 { margin-top: 0; color: #0a0a0a; }
  .box { background: #ffffff; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid ${brand.primaryColor}; }
  .detail-row { margin: 10px 0; }
  .detail-label { font-weight: bold; color: #525252; }
  .button { display: inline-block; background: ${brand.primaryColor}; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .footer { text-align: center; padding: 20px; color: #737373; font-size: 12px; }
  .reminder-badge { background: #e5e5e5; color: #0a0a0a; padding: 8px 16px; border-radius: 4px; font-weight: bold; display: inline-block; margin: 8px 0; }
`;
}

export function emailFooter(brand: EmailBrand, extraLine?: string): string {
  const year = new Date().getFullYear();
  return `
    <div class="footer">
      <p>&copy; ${year} ${brand.full}. All rights reserved.</p>
      ${extraLine ? `<p>${extraLine}</p>` : `<p>${brand.tagline}</p>`}
    </div>
  `;
}

export function wrapEmailHtml(
  brand: EmailBrand,
  title: string,
  contentHtml: string,
  footerExtra?: string,
): string {
  return `<!DOCTYPE html>
<html>
<head><style>${emailBaseCss(brand)}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p class="tagline">${brand.full}</p>
    </div>
    <div class="content">${contentHtml}</div>
    ${emailFooter(brand, footerExtra)}
  </div>
</body>
</html>`;
}

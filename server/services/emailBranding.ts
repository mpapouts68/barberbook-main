/** Shared PEQI email HTML styling (monochrome, matches app branding). */

export const EMAIL_BRAND_FULL = "PEQI Haircut Studio";
export const EMAIL_BRAND_NAME = "PEQI";
export const EMAIL_BRAND_TAGLINE = "Haircut Studio";

export const EMAIL_BASE_CSS = `
  body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #0a0a0a; color: #ffffff; padding: 28px 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.02em; }
  .header .tagline { margin: 8px 0 0; font-size: 13px; color: #a3a3a3; font-weight: normal; }
  .content { background: #f5f5f5; padding: 28px 24px; }
  .content h2 { margin-top: 0; color: #0a0a0a; }
  .box { background: #ffffff; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #0a0a0a; }
  .detail-row { margin: 10px 0; }
  .detail-label { font-weight: bold; color: #525252; }
  .button { display: inline-block; background: #0a0a0a; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .footer { text-align: center; padding: 20px; color: #737373; font-size: 12px; }
  .reminder-badge { background: #e5e5e5; color: #0a0a0a; padding: 8px 16px; border-radius: 4px; font-weight: bold; display: inline-block; margin: 8px 0; }
`;

export function emailFooter(extraLine?: string): string {
  const year = new Date().getFullYear();
  return `
    <div class="footer">
      <p>&copy; ${year} ${EMAIL_BRAND_FULL}. All rights reserved.</p>
      ${extraLine ? `<p>${extraLine}</p>` : `<p>${EMAIL_BRAND_TAGLINE}</p>`}
    </div>
  `;
}

export function wrapEmailHtml(title: string, contentHtml: string, footerExtra?: string): string {
  return `<!DOCTYPE html>
<html>
<head><style>${EMAIL_BASE_CSS}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p class="tagline">${EMAIL_BRAND_FULL}</p>
    </div>
    <div class="content">${contentHtml}</div>
    ${emailFooter(footerExtra)}
  </div>
</body>
</html>`;
}

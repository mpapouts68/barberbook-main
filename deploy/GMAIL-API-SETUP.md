# Gmail API for production email (when VPS blocks SMTP port 587)

Many VPS providers block outbound SMTP. Use Gmail API with OAuth refresh token instead.

## 1. Google Cloud project

1. [Google Cloud Console](https://console.cloud.google.com/) → create or select a project
2. Enable **Gmail API**
3. **OAuth consent screen** → External → add your sending Gmail as test user
4. **Credentials** → OAuth client (Web application)
   - Redirect URI for token setup: `https://developers.google.com/oauthplayground`

## 2. OAuth Playground refresh token

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Gear icon → use your own OAuth credentials
3. Scope: `https://mail.google.com/`
4. Authorize with the Gmail account that will send mail
5. Exchange authorization code for tokens → copy **Refresh token**

## 3. Production `.env`

On `/var/www/barberbook/.env`:

```env
EMAIL_USE_GMAIL_API=true
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
EMAIL_FROM="Your Shop <your@gmail.com>"
EMAIL_USER=your@gmail.com
BASE_URL=https://your-domain.com
```

## 4. Restart

```bash
cd /var/www/barberbook
pm2 restart barberbook
```

## 5. Test

```bash
cd /var/www/barberbook
node scripts/test-email.cjs your@gmail.com
```

If Gmail API is not configured, the app falls back to SMTP (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_PASS`) when set.

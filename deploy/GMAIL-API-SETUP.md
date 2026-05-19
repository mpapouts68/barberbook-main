# Gmail API for PEQI (when VPS blocks SMTP)

Hostman and many VPS providers **block outbound SMTP** (ports 587 and 465).  
PEQI can send mail via **Gmail API over HTTPS (443)** instead.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) for the project that already has your OAuth client (same as Google login / Calendar if possible).
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → Credentials** → use your existing **OAuth 2.0 Client ID** (Web application), or create one.

Add this **Authorized redirect URI** (for OAuth Playground only):

```text
https://developers.google.com/oauthplayground
```

## 2. Get a refresh token (one-time)

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the gear icon (top right) → check **Use your own OAuth credentials**.
3. Enter your **Client ID** and **Client Secret** from Google Cloud.
4. In **Step 1**, find **Gmail API v1** → select  
   `https://www.googleapis.com/auth/gmail.send`  
   (send only; no inbox access).
5. Click **Authorize APIs** and sign in as **peqihaircutstudio@gmail.com**.
6. **Step 2** → **Exchange authorization code for tokens**.
7. Copy the **Refresh token** (long string). Store it securely; treat it like a password.

If the app is in **Testing** mode, add `peqihaircutstudio@gmail.com` under **OAuth consent screen → Test users**.

## 3. VPS `.env`

On `/var/www/peqi/.env` add (keep `EMAIL_FROM` / `EMAIL_USER` for the From header):

```env
EMAIL_USE_GMAIL_API=true
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token-from-playground

EMAIL_FROM="PEQI Haircut Studio <peqihaircutstudio@gmail.com>"
EMAIL_USER=peqihaircutstudio@gmail.com
BASE_URL=https://peqi.hair
```

You can leave `EMAIL_PASS` in place for local dev; on VPS the app prefers Gmail API when `EMAIL_USE_GMAIL_API=true` or `GMAIL_REFRESH_TOKEN` is set.

Reload PM2 so env is picked up:

```bash
cd /var/www/peqi
pm2 reload deploy/ecosystem.config.cjs --update-env
```

## 4. Test

```bash
cd /var/www/peqi
node scripts/test-email.cjs mpapoutsakis@gmail.com
```

Expected:

```text
Mode: Gmail API (HTTPS port 443)
Sent: <message-id>
```

PM2 logs on start:

```text
email: Gmail API configured (HTTPS — works when VPS blocks SMTP)
```

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `403` / insufficient permissions | Re-run Playground with scope `gmail.send` only; new refresh token |
| `invalid_grant` | Token revoked; generate a new refresh token |
| Still tries SMTP | Set `EMAIL_USE_GMAIL_API=true` and reload PM2 with `--update-env` |
| SMTP timeout on VPS | Normal on Hostman; use Gmail API, do not open firewall for 587 |

## Security

- Never commit `GMAIL_REFRESH_TOKEN` or client secret to Git.
- Rotate the refresh token if it leaks (revoke in Google Account → Security → Third-party access).

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

### If you see `Error 403: access_denied` (Step 2 / Authorize APIs)

This means Google **refused** the login/consent — fix **all** of the following in [Google Cloud Console](https://console.cloud.google.com/) (same project as client `517309401230-...`):

1. **Gmail API enabled**  
   APIs & Services → Library → **Gmail API** → Enable.

2. **Correct OAuth client (Web application)**  
   Credentials → open the client whose ID matches Playground → type must be **Web application** (not Desktop/iOS).

3. **Redirect URI for Playground** (required)  
   Under **Authorized redirect URIs**, add exactly:
   ```text
   https://developers.google.com/oauthplayground
   ```
   Save. Wait 1–2 minutes before retrying.

4. **OAuth consent screen → Test users** (most common cause)  
   APIs & Services → **OAuth consent screen**:
   - If **Publishing status** is **Testing**, only listed test users can sign in.
   - Click **Add users** and add **every** account you use in Playground, e.g.:
     - `peqihaircutstudio@gmail.com`
     - Your personal Google account if you sign in with that instead
   - Save, then retry Playground in an **incognito** window.

5. **Consent screen — scopes**  
   On the consent screen → **Edit app** → **Scopes** → add (if missing):
   `https://www.googleapis.com/auth/gmail.send`  
   (or “Gmail API … Send email on your behalf”).

6. **On the Google warning screen**  
   If you see “Google hasn’t verified this app” → choose **Advanced** → **Go to PEQI (unsafe)** (wording varies).  
   Do **not** click “Back to safety” — that produces `access_denied`.

7. **Sign in with the right account**  
   In Playground step **Authorize APIs**, pick the **same** Gmail you added as a test user (`peqihaircutstudio@gmail.com`).

8. **Workspace / family account**  
   If the mailbox is managed by an organization, an admin may need to allow the OAuth client or use a personal `@gmail.com` test user first.

**Still failing?** Create a **new** OAuth client (Web) used only for mail: add only the Playground redirect URI, add test users, enable Gmail API, then use that client ID/secret in Playground.

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
| `403 access_denied` in Playground | See **§2 — If you see Error 403** (test users + redirect URI + Advanced → Continue) |
| `403` / insufficient permissions (API) | Re-run Playground with scope `gmail.send` only; new refresh token |
| `invalid_grant` | Token revoked; generate a new refresh token |
| Still tries SMTP | Set `EMAIL_USE_GMAIL_API=true` and reload PM2 with `--update-env` |
| SMTP timeout on VPS | Normal on Hostman; use Gmail API, do not open firewall for 587 |

## Security

- Never commit `GMAIL_REFRESH_TOKEN` or client secret to Git.
- Rotate the refresh token if it leaks (revoke in Google Account → Security → Third-party access).

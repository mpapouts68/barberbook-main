# PEQI — Deploy via Git (peqi.hair)

**Μία φορά** setup στο VPS. Μετά: **push στο GitHub → αυτόματο deploy**.

---

## Ροή (κάθε αλλαγή)

```
git add → git commit → git push origin main
         ↓
   GitHub Actions (SSH στο VPS)
         ↓
   git pull + npm build + pm2 reload
```

Δεν χρειάζονται `scp`, χειροκίνητα uploads, ή δεκάδες εντολές.

---

## 1. Μία φορά — VPS (Hostman)

### DNS `peqi.hair`

| Type | Host | Value |
|------|------|--------|
| A | `@` | IPv4 του PEQI VPS |
| A | `www` | ίδιο IPv4 |

### SSH + clone

GitHub **δεν δέχεται τον κωδικό του λογαριασμού** για `git clone`. Το repo `mpapouts68/peqi` είναι **ιδιωτικό** — χρειάζεστε **deploy key** (προτείνεται) ή **Personal Access Token (PAT)**.

#### Επιλογή Α — Deploy key στο VPS (προτείνεται)

Στο VPS:

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/peqi_github_clone -C "peqi-vps-clone"
cat ~/.ssh/peqi_github_clone.pub
```

Στο GitHub: **https://github.com/mpapouts68/peqi → Settings → Deploy keys → Add deploy key**  
- Title: `peqi-vps`  
- Key: επικόλληση του `.pub`  
- **Allow write access**: off (μόνο clone/pull)

Στο VPS:

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/peqi_github_clone
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github.com   # πρέπει να δείτε "successfully authenticated"
```

#### Επιλογή Β — Personal Access Token (HTTPS)

1. GitHub → **Settings → Developer settings → Personal access tokens** → fine-grained ή classic με scope **repo**  
2. Clone — όταν ζητήσει password, επικολλήστε το **token** (όχι τον κωδικό GitHub):

```bash
git clone https://github.com/mpapouts68/peqi.git peqi
# Username: mpapouts68
# Password: <το PAT>
```

#### Επιλογή Γ — Δημόσιο repo (χωρίς auth στο clone)

**Settings → General → Danger zone → Change visibility → Public** (μόνο αν δεν υπάρχουν secrets στο ιστορικό — το `.env` δεν είναι στο repo).

---

Μετά το auth, εγκατάσταση και clone:

```bash
ssh root@YOUR_PEQI_VPS_IP

apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

cd /var/www
# Αν υπάρχει ημιτελές clone από προηγούμενη προσπάθεια:
# rm -rf peqi
git clone git@github.com:mpapouts68/peqi.git peqi
# ή με PAT: git clone https://github.com/mpapouts68/peqi.git peqi
cd peqi

cp deploy/env.production.example .env
nano .env   # BASE_URL, SESSION_SECRET, EMAIL_*, κ.λπ.

chmod +x deploy/deploy.sh deploy/vps-bootstrap.sh
bash deploy/vps-bootstrap.sh peqi.hair   # nginx + firewall (μία φορά)
bash deploy/deploy.sh                  # πρώτο build + pm2
pm2 startup && pm2 save

certbot --nginx -d peqi.hair -d www.peqi.hair
```

### Deploy key για GitHub Actions (στο VPS)

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/github_deploy -C "peqi-deploy"
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy    # αντιγράψτε — μόνο για secret VPS_SSH_KEY
```

---

## 2. Μία φορά — GitHub repo secrets

Στο repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Παράδειγμα |
|--------|------------|
| `VPS_HOST` | `203.0.113.10` (IPv4 PEQI VPS) |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | ιδιωτικό κλειδί `github_deploy` (ολόκληρο) |
| `VPS_APP_DIR` | `/var/www/peqi` (προαιρετικό) |

Το workflow **δεν** κάνει πλέον `git pull` στο VPS (συχνά αποτυγχάνει σε private repo). Στέλνει τον κώδικα με **rsync** και τρέχει `deploy/deploy.sh`.

Αν το Actions αποτύχει: δείτε το log του step **Sync files** ή **Run deploy**.

---

## 3. Κάθε deploy (εσείς)

```bash
git add .
git commit -m "your message"
git push origin main
```

Έλεγχος: GitHub → **Actions** → workflow **Deploy PEQI** (πράσινο ✓).

Χειροκίνητο deploy (χωρίς push): Actions → **Run workflow**.

---

## Τι μένει μόνο στο server (όχι στο Git)

- `.env` — κωδικοί, email, secrets  
- `database.sqlite` — δεδομένα (backup ξεχωριστά)

Το `.env` **δεν** ανεβαίνει στο Git (είναι στο `.gitignore`).

### Email επιβεβαίωσης ραντεβού

Στο `/var/www/peqi/.env` **υποχρεωτικά**:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=peqihaircutstudio@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM="PEQI Haircut Studio <peqihaircutstudio@gmail.com>"
BASE_URL=https://peqi.hair
```

`EMAIL_PASS` = [Gmail App Password](https://myaccount.google.com/apppasswords) (όχι τον κωδικό λογαριασμού).

Μετά deploy:

```bash
cd /var/www/peqi
npm run test-email
pm2 logs peqi --lines 30
```

Στα logs πρέπει: `email: SMTP configured` και `✅ Email SMTP verified`.

PM2 φορτώνει το `.env` μέσω `deploy/ecosystem.config.cjs` — μετά αλλαγή `.env`: `pm2 reload deploy/ecosystem.config.cjs --update-env`.

---

## Χρήσιμες εντολές (μόνο αν χρειαστεί)

```bash
ssh root@YOUR_PEQI_VPS_IP
cd /var/www/peqi
pm2 logs peqi --lines 50
bash deploy/deploy.sh          # χειροκίνητο deploy χωρίς GitHub
```

---

## 502 Bad Gateway (nginx)

Το nginx δουλεύει, αλλά **δεν απαντάει η Node εφαρμογή** πίσω από το `proxy_pass`. Στο Fade Factory η θύρα ήταν **5000** και το PM2 λεγόταν `barberbook` — το PEQI χρησιμοποιεί **5100** και όνομα **`peqi`**.

### 1. Διάγνωση (τρέξτε στο VPS)

```bash
cd /var/www/peqi

# Η εφαρμογή ακούει στη 5100;
ss -tlnp | grep 5100
curl -sI http://127.0.0.1:5100 | head -5

# PM2
pm2 status
pm2 logs peqi --lines 80

# Τι θύρα βλέπει το nginx; (πρέπει 5100, όχι 5000)
grep -R proxy_pass /etc/nginx/sites-enabled/

# Σφάλματα nginx
tail -30 /var/log/nginx/error.log
```

Αν το `curl http://127.0.0.1:5100` **αποτυγχάνει** → πρόβλημα εφαρμογής/PM2, όχι DNS.

### 2. Γρήγορη διόρθωση (ένα script)

```bash
cd /var/www/peqi
git pull origin main
chmod +x deploy/vps-fix-502.sh
bash deploy/vps-fix-502.sh
```

Το script κάνει build, `db:push`, διορθώνει nginx αν δείχνει στη 5000, ξεκινάει PM2 και ελέγχει `curl http://127.0.0.1:5100`.

### 3. Χειροκίνητα (αν προτιμάτε)

```bash
cd /var/www/peqi

pm2 delete barberbook 2>/dev/null || true

test -f .env || cp deploy/env.production.example .env && nano .env
# PORT=5100, BASE_URL=https://peqi.hair, SESSION_SECRET=..., DATABASE_URL=file:./database.sqlite

npm ci && npm run build && npm run db:push

pm2 delete peqi 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

curl -sI http://127.0.0.1:5100 | head -3
```

Πρέπει να δείτε `HTTP/1.1` (π.χ. 200 ή 304), όχι `Connection refused`.

### 4. Διόρθωση nginx (λάθος θύρα 5000)

Αν το `grep proxy_pass` δείχνει `5000`:

```bash
sed -i 's/127.0.0.1:5000/127.0.0.1:5100/g; s/localhost:5000/127.0.0.1:5100/g' /etc/nginx/sites-available/peqi
nginx -t && systemctl reload nginx
```

Ή ξανατρέξτε bootstrap (αντικαθιστά το site config):

```bash
bash /var/www/peqi/deploy/vps-bootstrap.sh peqi.hair
```

### 5. Μετά το SSL (certbot)

Μερικές φορές το HTTPS block **δεν** έχει `proxy_pass`. Ελέγξτε:

```bash
grep -A20 "listen 443" /etc/nginx/sites-enabled/peqi
```

Και τα δύο blocks (80 και 443) πρέπει να έχουν `proxy_pass http://127.0.0.1:5100;`.

### 6. Ακόμα 502;

Στείλτε output από:

```bash
pm2 logs peqi --lines 40 --nostream
ls -la /var/www/peqi/dist/index.js
cat /var/www/peqi/.env | grep -E '^PORT=|^DATABASE_URL=|^NODE_ENV='
```

Συχνά αίτια στα logs: λείπει `.env`, λάθος `DATABASE_URL`, αποτυχία `npm run build`, ή crash κατά το startup.

### Εορτολόγιο (`eortologio_namedays.csv`)

Πλήρες εορτολόγιο (~2800 ονόματα) από το αρχείο `eortologio_namedays.csv` στη ρίζα του project.

**Τοπικά (μία φορά ή μετά από αλλαγή CSV):**

```bash
cd /var/www/peqi   # ή τοπικό project folder
npm run import-namedays:force
```

**Στη συνέχεια** ανεβάστε τη βάση στο VPS (βλ. παρακάτω) **ή** στο VPS μετά από `git pull`:

```bash
cd /var/www/peqi
npm run import-namedays:force
pm2 restart peqi
```

---

### Ανέβασμα τοπικής `database.sqlite` (προτείνεται αν το `db:push` αποτυγχάνει)

Η τοπική σας βάση έχει ήδη όλους τους πίνακες (`namedays`, `google_calendar_config`, κ.λπ.).

**Από Windows (PowerShell):**

```powershell
cd "C:\POS\JavaETC\BarberBook - Peqi"
$env:PEQI_VPS = "root@YOUR_PEQI_VPS_IP"
.\deploy\upload-database.ps1
```

**Ή χειροκίνητα:**

```powershell
scp "C:\POS\JavaETC\BarberBook - Peqi\database.sqlite" root@YOUR_PEQI_VPS_IP:/var/www/peqi/database.sqlite
```

**Στο VPS μετά το upload:**

```bash
cd /var/www/peqi
pm2 stop peqi
# Στο .env ΠΡΕΠΕΙ να δείχνει στο ίδιο αρχείο:
grep DATABASE_URL .env
# DATABASE_URL=file:./database.sqlite

chmod 644 database.sqlite
pm2 restart peqi
curl -I http://127.0.0.1:5100
```

**Σημαντικό:** Αν το `.env` λέει `file:barbershop.db` αλλά ανεβάσατε `database.sqlite`, η εφαρμογή διαβάζει **λάθος αρχείο** (άδειο). Διορθώστε:

```bash
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=file:./database.sqlite|' .env
```

### `SqliteError: no such table: namedays`

Η SQLite υπάρχει αλλά **δεν έχουν δημιουργηθεί οι πίνακες** (ή λάθος αρχείο DB). Στο VPS:

```bash
cd /var/www/peqi
grep DATABASE_URL .env    # π.χ. file:./database.sqlite
npm run db:push
pm2 restart peqi
pm2 logs peqi --lines 20
```

Μετά το `db:push`, στην εκκίνηση γεμίζονται αυτόματα τα εορτολογικά (namedays) από το `namedays_greek.csv`.

Το μήνυμα **Google Calendar service account key not available** είναι προειδοποίηση — ρυθμίζεται αργότερα από Admin → Google Calendar.

---

## Google OAuth / Calendar (production)

- `BASE_URL=https://peqi.hair` στο `.env` και Admin  
- OAuth redirect: `https://peqi.hair/api/auth/google/callback`  
- Origins: `https://peqi.hair`

---

## Σημείωση

Το `peqi.hair` είναι **ξεχωριστό VPS** από άλλα projects (π.χ. shishapoint) — δικό του IP, DNS, `.env`.

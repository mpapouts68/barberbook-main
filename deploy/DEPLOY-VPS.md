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

```bash
ssh root@YOUR_PEQI_VPS_IP

apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

mkdir -p /var/www/peqi
cd /var/www/peqi
git clone https://github.com/mpapouts68/peqi.git .

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

---

## Χρήσιμες εντολές (μόνο αν χρειαστεί)

```bash
ssh root@YOUR_PEQI_VPS_IP
cd /var/www/peqi
pm2 logs peqi --lines 50
bash deploy/deploy.sh          # χειροκίνητο deploy χωρίς GitHub
```

---

## Google OAuth / Calendar (production)

- `BASE_URL=https://peqi.hair` στο `.env` και Admin  
- OAuth redirect: `https://peqi.hair/api/auth/google/callback`  
- Origins: `https://peqi.hair`

---

## Σημείωση

Το `peqi.hair` είναι **ξεχωριστό VPS** από άλλα projects (π.χ. shishapoint) — δικό του IP, DNS, `.env`.

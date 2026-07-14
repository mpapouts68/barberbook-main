# Deploy (optional)

BarberBook is designed to run as a **local app** on Windows.

👉 **Start here:** [`LOCAL-APP.md`](../LOCAL-APP.md) — use `start-app.bat`

The scripts in this folder are **optional** helpers if you later host on a Linux server. They are not required for normal shop use.

| File | Purpose |
|------|---------|
| `deploy.sh` | Build + PM2 on a remote Linux server |
| `ecosystem.config.cjs` | PM2 process name `barberbook` |
| `env.production.example` | Server `.env` template |
| `GMAIL-API-SETUP.md` | Email when SMTP is blocked |

For day-to-day development and client installs on a PC, use `start-app.bat` at the project root.

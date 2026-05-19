# Deploy files

| File | Purpose |
|------|---------|
| `deploy.sh` | Runs on VPS after `git pull` (build + pm2) |
| `vps-bootstrap.sh` | One-time: nginx, node, firewall |
| `ecosystem.config.cjs` | PM2 process config |
| `env.production.example` | Template for server `.env` |
| `DEPLOY-VPS.md` | Full guide (Git-based) |

GitHub Actions: `.github/workflows/deploy-peqi.yml`

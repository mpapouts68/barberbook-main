# BarberBook — Local App

BarberBook runs as a **local desktop app** on Windows (same idea as the VDJukebox project): double-click to start, browser opens automatically, SQLite database stays on your machine.

No VPS required for normal use.

## Quick start

1. Install **Node.js 20+** from [nodejs.org](https://nodejs.org/)
2. Double-click **`start-app.bat`**
3. Browser opens at **http://127.0.0.1:5100**

First run installs npm packages and applies database migrations (may take a few minutes).

## Scripts

| File | Purpose |
|------|---------|
| `start-app.bat` | **Main launcher** — dev mode, opens browser |
| `stop-app.bat` | Stop the app (port 5100) |
| `start-app-prod.bat` | Build + run production mode locally |
| `restart.bat` | Menu: quick / standard / clean restart |
| `wait-app.bat` | Used by launcher to wait and open browser |

## Configuration

- Copy `.env.example` → `.env` (launcher does this on first run)
- Default database: `database.sqlite` in the project folder
- Default port: **5100**

## Branding (per shop)

Admin → **Branding**: bilingual business name & tagline (Greek + English), logos, 8 landing images, and **17 theme colors**. Text shown follows the app language switcher.

## Email / OAuth / Google Calendar

Configure in `.env` and Admin panels. Works locally with `BASE_URL=http://localhost:5100` for development.

For OAuth callbacks while testing locally, use `http://localhost:5100` in Google Cloud Console.

## Data backup

Copy these files to back up a shop:

- `database.sqlite`
- `public/uploads/` (avatars, shop photos, branding uploads)

## Troubleshooting

**Port already in use**

```bat
stop-app.bat
start-app.bat
```

**Stuck or weird cache**

```bat
restart.bat
```

Choose option 2 (standard) or 3 (full clean).

**Production-like test on same PC**

```bat
start-app-prod.bat
```

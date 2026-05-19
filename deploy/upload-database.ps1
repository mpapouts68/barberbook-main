# Upload local database.sqlite to PEQI VPS
# Usage (PowerShell):
#   $env:PEQI_VPS = "root@YOUR_VPS_IP"
#   .\deploy\upload-database.ps1

param(
  [string]$VpsHost = $env:PEQI_VPS,
  [string]$LocalDb = "",
  [string]$RemoteDir = "/var/www/peqi"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $LocalDb) {
  $LocalDb = Join-Path $Root "database.sqlite"
}

if (-not $VpsHost) {
  Write-Host "Set VPS host: `$env:PEQI_VPS = 'root@203.0.113.10'" -ForegroundColor Yellow
  Write-Host "Or: .\deploy\upload-database.ps1 -VpsHost root@203.0.113.10"
  exit 1
}

if (-not (Test-Path $LocalDb)) {
  Write-Host "Local database not found: $LocalDb" -ForegroundColor Red
  exit 1
}

$sizeMb = [math]::Round((Get-Item $LocalDb).Length / 1MB, 2)
Write-Host "Uploading $LocalDb ($sizeMb MB) -> ${VpsHost}:${RemoteDir}/database.sqlite"

ssh $VpsHost "pm2 stop peqi 2>/dev/null || true; cp ${RemoteDir}/database.sqlite ${RemoteDir}/database.sqlite.bak.`$(date +%Y%m%d%H%M%S) 2>/dev/null || true"
scp $LocalDb "${VpsHost}:${RemoteDir}/database.sqlite"

ssh $VpsHost @"
set -e
cd ${RemoteDir}
grep -q '^DATABASE_URL=file:./database.sqlite' .env 2>/dev/null || {
  echo 'WARN: .env should contain DATABASE_URL=file:./database.sqlite'
  echo 'Current:'
  grep DATABASE_URL .env || echo '(no DATABASE_URL)'
}
chmod 644 database.sqlite
node -e \"const D=require('better-sqlite3');const db=D('database.sqlite',{readonly:true});const t=db.prepare(\\\"SELECT name FROM sqlite_master WHERE type='table'\\\").all().map(r=>r.name);console.log('Tables:',t.join(', '));if(!t.includes('namedays')){console.error('ERROR: namedays missing');process.exit(1)};db.close();\"
pm2 restart peqi || pm2 start deploy/ecosystem.config.cjs
sleep 2
curl -sI http://127.0.0.1:5100 | head -3 || true
pm2 logs peqi --lines 15 --nostream
"@

Write-Host "Done. Test https://peqi.hair" -ForegroundColor Green

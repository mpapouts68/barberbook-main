@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

cd /d "%ROOT%"

title BarberBook Production Launcher

echo ========================================
echo  BarberBook - Production (local)
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  pause
  exit /b 1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5100.*LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
)

if not exist ".env" (
  echo [ERROR] Missing .env — copy .env.example and configure it.
  pause
  exit /b 1
)

if not exist "node_modules" call npm ci --include=dev

echo Building...
set NODE_ENV=production
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

set DATABASE_URL=file:./database.sqlite
call npm run migrate:production

echo Starting production server...
start "BarberBook" cmd /k "cd /d ""%ROOT%"" && set NODE_ENV=production && set PORT=5100 && npm run start || pause"

call "%ROOT%\wait-app.bat"
endlocal

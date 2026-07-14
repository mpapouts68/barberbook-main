@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

cd /d "%ROOT%"

title BarberBook Launcher

echo ========================================
echo  BarberBook - Local App
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Install Node 20+ from https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5100.*LISTENING"') do (
  echo [WARN] Port 5100 in use ^(PID %%p^) - stopping old instance...
  taskkill /PID %%p /F >nul 2>&1
)

if not exist ".env" (
  if exist ".env.example" (
    echo Creating .env from .env.example ...
    copy /y ".env.example" ".env" >nul
  ) else (
    echo [WARN] No .env file found. Create one before production use.
  )
)

if not exist "node_modules" (
  echo Installing dependencies - first run may take a few minutes...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo Dependencies OK.
)

echo Applying database migrations...
set DATABASE_URL=file:./database.sqlite
call npm run migrate:production
if errorlevel 1 (
  echo [WARN] Some migrations failed - app may still start.
)

echo.
echo Starting BarberBook server...
echo   URL: http://127.0.0.1:5100
echo.

start "BarberBook" cmd /k "cd /d ""%ROOT%"" && set DATABASE_URL=file:./database.sqlite && set NODE_ENV=development && set PORT=5100 && npm run dev || echo [ERROR] Server failed && pause"

echo Waiting for app to be ready - up to 2 minutes...
call "%ROOT%\wait-app.bat"

echo.
echo BarberBook is running.
echo   App:    http://127.0.0.1:5100
echo   Admin:  http://127.0.0.1:5100/admin
echo.
echo Keep the BarberBook window open while using the app.
echo Run stop-app.bat to shut down.

endlocal

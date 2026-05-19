@echo off
title BarberBook - Restart Application
color 0A

echo ========================================
echo  BarberBook Application Restart Script
echo ========================================
echo.

echo [1/5] Killing any running Node.js processes...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo       Node.js processes killed successfully.
) else (
    echo       No Node.js processes were running.
)

echo.
echo [2/5] Cleaning up temporary files...
REM Clean up any lock files
if exist "package-lock.json.lock" del /f /q "package-lock.json.lock" 2>nul
if exist ".vite" rmdir /s /q ".vite" 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul
echo       Temporary files cleaned.

echo.
echo [3/5] Setting environment variables...
set DATABASE_URL=file:database.sqlite
set NODE_ENV=development
echo       Environment variables set.

echo.
echo [4/5] Waiting for processes to fully terminate...
timeout /t 3 /nobreak >nul
echo       Ready to start.

echo.
echo [5/5] Starting the application...
echo ========================================
echo  Server will start on http://localhost:5000
echo ========================================
echo.

REM Start the application
npm run dev

pause

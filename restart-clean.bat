@echo off
title BarberBook - Full Clean Restart
color 0B

echo ========================================
echo  BarberBook - FULL CLEAN RESTART
echo ========================================
echo.
echo This script will:
echo  - Kill all Node.js processes
echo  - Clean all cache and temporary files
echo  - Reinstall dependencies (optional)
echo  - Rebuild the application
echo  - Start the dev server
echo.
echo ========================================
echo.

set /p REINSTALL="Do you want to reinstall npm packages? (y/n): "

echo.
echo [1/7] Killing any running Node.js processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.exe 2>nul
if %errorlevel% equ 0 (
    echo       All processes killed successfully.
) else (
    echo       No processes were running.
)

echo.
echo [2/7] Cleaning up cache and temporary files...
if exist ".vite" rmdir /s /q ".vite" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul
if exist "package-lock.json.lock" del /f /q "package-lock.json.lock" 2>nul
echo       Cache cleaned.

if /i "%REINSTALL%"=="y" (
    echo.
    echo [3/7] Removing node_modules...
    if exist "node_modules" (
        echo       This may take a moment...
        rmdir /s /q "node_modules"
        echo       node_modules removed.
    ) else (
        echo       node_modules not found.
    )
    
    echo.
    echo [4/7] Installing dependencies...
    echo       This may take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo       ERROR: npm install failed!
        pause
        exit /b 1
    )
    echo       Dependencies installed successfully.
) else (
    echo.
    echo [3/7] Skipping node_modules removal...
    echo [4/7] Skipping npm install...
)

echo.
echo [5/7] Setting environment variables...
set DATABASE_URL=file:database.sqlite
set NODE_ENV=development
echo       Environment variables set.

echo.
echo [6/7] Waiting for system to stabilize...
timeout /t 3 /nobreak >nul
echo       Ready to start.

echo.
echo [7/7] Starting the application...
echo ========================================
echo  Server will start on http://localhost:5100
echo ========================================
echo.

call npm run dev

pause







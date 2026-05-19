@echo off
title BarberBook - Quick Restart
color 0E

echo ========================================
echo  BarberBook - QUICK RESTART
echo ========================================
echo.

echo Stopping Node.js...
taskkill /f /im node.exe >nul 2>&1

echo Waiting...
timeout /t 2 /nobreak >nul

echo Starting application...
echo Server: http://localhost:5000
echo.

set DATABASE_URL=file:database.sqlite
set NODE_ENV=development

npm run dev







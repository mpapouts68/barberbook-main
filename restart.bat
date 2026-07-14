@echo off
title BarberBook - Restart Menu
color 0F

:MENU
cls
echo ========================================
echo      BarberBook - RESTART MENU
echo ========================================
echo.
echo  Tip: For normal use, run start-app.bat instead.
echo.
echo Choose restart option:
echo.
echo  1. Quick Restart (fastest)
echo     - Kill processes and restart
echo.
echo  2. Standard Restart (recommended)
echo     - Kill processes
echo     - Clean cache files
echo     - Restart application
echo.
echo  3. Full Clean Restart
echo     - Kill processes
echo     - Clean all cache
echo     - Reinstall dependencies (optional)
echo     - Restart application
echo.
echo  4. Exit
echo.
echo ========================================
echo.

set /p CHOICE="Enter your choice (1-4): "

if "%CHOICE%"=="1" goto QUICK
if "%CHOICE%"=="2" goto STANDARD
if "%CHOICE%"=="3" goto FULL
if "%CHOICE%"=="4" goto EXIT
echo Invalid choice. Please try again.
timeout /t 2 >nul
goto MENU

:QUICK
cls
echo Starting Quick Restart...
call restart-quick.bat
goto END

:STANDARD
cls
echo Starting Standard Restart...
call restart-app.bat
goto END

:FULL
cls
echo Starting Full Clean Restart...
call restart-clean.bat
goto END

:EXIT
echo.
echo Exiting...
timeout /t 1 >nul
exit

:END
pause







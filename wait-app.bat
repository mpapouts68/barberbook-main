@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "URL=http://127.0.0.1:5100"
set "TRIES=0"

:wait_loop
set /a TRIES+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%URL%' -TimeoutSec 2 -UseBasicParsing).StatusCode | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open_browser
if !TRIES! geq 60 (
  echo [WARN] BarberBook did not respond on %URL% after 2 minutes.
  echo Check the BarberBook terminal window for errors.
  pause
  exit /b 1
)
echo Waiting for BarberBook... !TRIES!/60
ping 127.0.0.1 -n 3 >nul
goto wait_loop

:open_browser
echo BarberBook is ready. Opening %URL%
start "" "%URL%"
endlocal

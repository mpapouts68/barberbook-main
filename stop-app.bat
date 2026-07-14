@echo off
setlocal EnableExtensions
echo Stopping BarberBook...

for /f "tokens=5" %%p in ('netstat -ano ^| findstr "127.0.0.1:5100.*LISTENING"') do (
  echo Stopping server on port 5100 ^(PID %%p^)
  taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5100.*LISTENING"') do (
  echo Stopping server on port 5100 ^(PID %%p^)
  taskkill /PID %%p /F >nul 2>&1
)

echo Done.
endlocal

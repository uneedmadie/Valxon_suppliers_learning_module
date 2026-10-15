@echo off
rem VALXON Academy – jednoduché spuštění na Windows (API http://localhost:4000, web http://localhost:3000).
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js neni nainstalovany. Nainstalujte Node.js 20+ ^(winget install OpenJS.NodeJS.LTS^).
  exit /b 1
)

rem Prvni spusteni: instalace zavislosti a vychozi lokalni konfigurace (bez tajemstvi).
if not exist node_modules (
  echo Instaluji zavislosti...
  call npm install || exit /b 1
)
if not exist apps\api\.env copy apps\api\.env.example apps\api\.env >nul
if not exist apps\web\.env.local copy apps\web\.env.example apps\web\.env.local >nul

echo Spoustim API a web. Aplikace: http://localhost:3000  (ukonceni: Ctrl+C)
call npm run dev

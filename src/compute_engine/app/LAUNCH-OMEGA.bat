@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  METATRON Ω — LAUNCHER  (double-click)
REM  Starts the installed app if present, otherwise the dev app from source.
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions
cd /d "%~dp0"
title METATRON OMEGA Launcher
set "ELECTRON_RUN_AS_NODE="

REM prefer the installed app (read its location from the registry)
set "APPEXE="
for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "METATRON-OMEGA" 2^>nul ^| findstr /C:"DisplayIcon"') do set "APPEXE=%%B"
if defined APPEXE set "APPEXE=%APPEXE:,0=%"

if defined APPEXE if exist "%APPEXE%" (
  echo  launching installed METATRON-OMEGA: %APPEXE%
  start "" "%APPEXE%"
  exit /b 0
)

echo  no installed app found - starting from source (dev mode)…
if not exist node_modules\electron\dist\electron.exe (
  echo  installing dependencies first…
  call npm install --no-audit --no-fund || ( pause & exit /b 1 )
)
call npm start

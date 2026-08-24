@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  AVA — LAUNCHER  (double-click)
REM  Starts the installed AVA if present, otherwise the dev app from source.
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions
cd /d "%~dp0"
title AVA Launcher
set "ELECTRON_RUN_AS_NODE="


REM prefer the installed app (read its location from the registry)
set "APPEXE="
for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "AVA" 2^>nul ^| findstr /C:"DisplayIcon"') do set "APPEXE=%%B"
if defined APPEXE set "APPEXE=%APPEXE:,0=%"

if defined APPEXE if exist "%APPEXE%" (
  echo  launching installed AVA: %APPEXE%
  start "" "%APPEXE%"
  exit /b 0
)

echo  no installed AVA found - starting from source (dev mode)…
if not exist node_modules\electron\dist\electron.exe (
  echo  installing dependencies first…
  call npm install --no-audit --no-fund || ( pause & exit /b 1 )
)
call npm start

@echo off
chcp 65001 >nul
REM ══════════════════════════════════════════════════════════════════════════
REM  METATRON Ω — LAUNCHER  (double-click)
REM  Starts, in order:
REM    1. the freshly built release\win-unpacked\METATRON-OMEGA.exe  (build→launch)
REM    2. the installed app (read from the Windows uninstall registry)
REM    3. the dev app from source (npm start) as a last resort
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions
cd /d "%~dp0"
title METATRON OMEGA Launcher
set "ELECTRON_RUN_AS_NODE="

REM prefer the freshly built release exe (the "build then launch" flow) — a
REM stale installed copy must not shadow the build you just made
if exist "release\win-unpacked\METATRON-OMEGA.exe" (
  echo  launching fresh build: release\win-unpacked\METATRON-OMEGA.exe
  start "" "release\win-unpacked\METATRON-OMEGA.exe"
  exit /b 0
)

REM then the installed app (read its location from the uninstall registry)
set "APPEXE="
for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "METATRON-OMEGA" 2^>nul ^| findstr /C:"DisplayIcon"') do set "APPEXE=%%B"
if defined APPEXE set "APPEXE=%APPEXE:,0=%"

if defined APPEXE if exist "%APPEXE%" (
  echo  launching installed METATRON-OMEGA: %APPEXE%
  start "" "%APPEXE%"
  exit /b 0
)

REM no built/installed app — run from source (dev mode). This path needs Node.
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  ═══ ERROR: no built or installed app, and Node.js is not on PATH ═══
  echo  Run BUILD-OMEGA.bat first, or install Node.js 18+ for dev mode.
  pause
  exit /b 1
)

echo  no installed app found - starting from source (dev mode)…
if not exist node_modules\electron\dist\electron.exe (
  echo  installing dependencies first…
  call npm install --no-audit --no-fund || ( pause & exit /b 1 )
)
call npm start


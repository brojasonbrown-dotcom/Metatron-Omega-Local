@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  AVA — LAUNCHER  (double-click)
REM  Starts the installed AVA if present, otherwise the dev app from source.
REM  Mind (ψ button) needs: system Node ^>= 25 + Ollama with phi:latest and
REM  mathstral:latest (see app README for the two provisioning commands).
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions
cd /d "%~dp0"
title AVA Launcher
set "ELECTRON_RUN_AS_NODE="

REM ── Kimi (K3) API key ──────────────────────────────────────────────────────
REM Read from the ENVIRONMENT (set KIMI_K3_API_KEY, or persist via the UI) — NOT
REM hardcoded: a committed plaintext key is a live secret in version control.
if not defined KIMI_K3_API_KEY echo [ava] KIMI_K3_API_KEY not set — K3 instrument unavailable (set it in env or via the UI).


REM prefer the installed app (read its location from the registry)
set "APPEXE="
for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "AVA" 2^>nul ^| findstr /C:"DisplayIcon"') do set "APPEXE=%%B"
if defined APPEXE set "APPEXE=%APPEXE:,0=%"

if defined APPEXE if exist "%APPEXE%" (
  echo  launching installed AVA: %APPEXE%
  echo  (mind needs Node ^>=25 on PATH + ollama models phi:latest / mathstral:latest)
  start "" "%APPEXE%"
  exit /b 0
)

echo  no installed AVA found - starting from source (dev mode)…
if not exist node_modules\electron\dist\electron.exe (
  echo  installing dependencies first…
  call npm install --no-audit --no-fund || ( pause & exit /b 1 )
)
call npm start

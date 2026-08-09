@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  AVA — FULL BUILD PIPELINE  (double-click)
REM  bundle engine → smoke test → pack → dist (NSIS installer + portable exe)
REM  Output: release\AVA-0.1.0-setup.exe + AVA-0.1.0-portable.exe
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions
cd /d "%~dp0"
title AVA Build Pipeline

REM This IDE exports ELECTRON_RUN_AS_NODE=1, which silently turns Electron
REM into plain Node. Clear it for the whole pipeline.
set "ELECTRON_RUN_AS_NODE="

REM ── Kimi (K3) API key ──────────────────────────────────────────────────────
REM Personal-use key, written here by the UI's "set" action so the instrument
REM survives restarts. Plaintext by request. Remove this line to revoke.
if not defined KIMI_K3_API_KEY set "KIMI_K3_API_KEY=sk-otsg4Bpo5EhkFYmqohEIFBBxF3yFvBiUcSGcsbxvNUDb6xMQ"


echo.
echo  ═══ AVA BUILD PIPELINE ═══
echo  [0/5] checking dependencies…
if not exist node_modules\electron\dist\electron.exe (
  echo        electron missing - running npm install…
  call npm install --no-audit --no-fund || goto :fail
)
if not exist node_modules\electron-builder\out\cli.js (
  echo        electron-builder missing - running npm install…
  call npm install --no-audit --no-fund || goto :fail
)

echo  [1/5] bundling the RHUFT engine (esbuild)…
call npm run bundle:engine || goto :fail

echo  [2/5] smoke tests (chat + sensory codec + engine loop)…
call node scripts\smoke.mjs || goto :fail

echo  [2b/5] clearing stale output (orphaned minds lock app.asar)…
call node scripts\clean-release.mjs

echo  [3/5] pack (unpacked verification build)…
call npx electron-builder --dir || goto :fail

echo  [4/5] verifying packaged exe (--ci roundtrip)…
call "release\win-unpacked\AVA.exe" --ci
if not exist "%TEMP%\ava-ci-report.txt" goto :fail
findstr /C:"PASS" "%TEMP%\ava-ci-report.txt" >nul || goto :fail
del "%TEMP%\ava-ci-report.txt" >nul 2>&1

echo  [5/5] dist (NSIS installer + portable)…
call npx electron-builder || goto :fail

echo.
echo  ═══ BUILD COMPLETE ═══
dir /b release\*.exe
echo.
pause
exit /b 0

:fail
echo.
echo  ═══ BUILD FAILED — see the step above ═══
pause
exit /b 1

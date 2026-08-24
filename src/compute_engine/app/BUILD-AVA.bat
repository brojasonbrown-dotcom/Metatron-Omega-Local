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
REM Read from the ENVIRONMENT (set KIMI_K3_API_KEY, or persist via the UI) — NOT
REM hardcoded: a committed plaintext key is a live secret in version control.
if not defined KIMI_K3_API_KEY echo [build] KIMI_K3_API_KEY not set — K3 instrument will be unavailable.


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

echo  [2c/5] checking the output tree is not locked (Electron watchers hold it)…
call node scripts\check-release-lock.mjs || goto :fail

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
REM ── Speech-module weights (ADR-010): ship 5.4 GB beside the installer (NSIS 2 GB
REM ceiling) — the first-run materializer copies them into the writable install brain dir.
echo  [6/6] staging speech-module weights (offline install)...
if exist "release\weights" rmdir /s /q "release\weights"
mkdir "release\weights" >nul 2>&1
xcopy "..\brain v14\blobs" "release\weights\blobs\" /E /I /Q /Y >nul || goto :fail
xcopy "..\brain v14\manifests" "release\weights\manifests\" /E /I /Q /Y >nul || goto :fail
echo        weights staged: release\weights (ships beside the installer)

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

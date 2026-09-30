@echo off
chcp 65001 >nul
REM ══════════════════════════════════════════════════════════════════════════
REM  METATRON Ω — FULL BUILD PIPELINE  (double-click)
REM  deps → bundle brain → smoke test → pack (--ci verify) → dist (NSIS + portable)
REM  Output: release\METATRON-OMEGA-<version>-setup.exe + -portable.exe
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions
cd /d "%~dp0"
title METATRON OMEGA Build Pipeline

REM This IDE exports ELECTRON_RUN_AS_NODE=1, which silently turns Electron
REM into plain Node. Clear it for the whole pipeline.
set "ELECTRON_RUN_AS_NODE="

REM ── 0. Node.js must be present (bundle/smoke/build all need it) ────────────
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  ═══ ERROR: Node.js not found on PATH ═══
  echo  Install Node.js 18+ from https://nodejs.org, then re-run this file.
  pause
  exit /b 1
)

echo.
echo  ═══ METATRON OMEGA BUILD PIPELINE ═══
echo  [1/5] checking dependencies (electron + electron-builder + esbuild)…
REM electron-builder does NOT ship esbuild, so esbuild is declared directly and
REM checked by resolution (Node walks node_modules up the tree, so a hoisted
REM install at the parent level is found too). One install covers any missing piece.
set "NEED_INSTALL="
if not exist "node_modules\electron\dist\electron.exe" set "NEED_INSTALL=1"
if not exist "node_modules\electron-builder\cli.js" set "NEED_INSTALL=1"
node -e "require('esbuild')" >nul 2>nul || set "NEED_INSTALL=1"
if defined NEED_INSTALL (
  echo        dependencies missing - running npm install…
  call npm install --no-audit --no-fund || goto :fail
)

echo  [2/5] bundling the OMEGA brain (esbuild → electron\omega-bundle.cjs)…
call npm run bundle:omega || goto :fail

echo  [3/5] smoke tests (chat + sensory codec + brain loop)…
call node scripts\smoke.mjs || goto :fail

echo  [4/5] pack (unpacked verification build)…
REM pre-pack reconciles stale in-tree release\ staging; build-driver stages the
REM real output OUTSIDE the watched tree (an IDE watcher locking win-unpacked.tmp
REM is what EBUSY-kills a direct npx electron-builder run — ADR-011).
call node scripts\pre-pack.mjs
call node scripts\build-driver.mjs --dir || goto :fail

echo  [4b/5] verifying packaged exe (--ci roundtrip)…
REM `start /wait` (not `call`) — the exe is a GUI-subsystem app, so `call`
REM would return immediately and race the report write. /wait blocks until
REM the --ci roundtrip finishes and the exe exits.
start /wait "" "release\win-unpacked\METATRON-OMEGA.exe" --ci
if not exist "%TEMP%\omega-ci-report.txt" goto :fail
findstr /C:"PASS" "%TEMP%\omega-ci-report.txt" >nul || goto :fail
del "%TEMP%\omega-ci-report.txt" >nul 2>&1

echo  [5/5] dist (NSIS installer + portable)…
call node scripts\build-driver.mjs || goto :fail

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


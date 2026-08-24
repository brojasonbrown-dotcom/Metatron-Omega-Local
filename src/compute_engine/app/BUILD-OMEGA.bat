@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  METATRON Ω — FULL BUILD PIPELINE  (double-click)
REM  bundle brain → smoke test → pack → dist (NSIS installer + portable exe)
REM  Output: release\METATRON-OMEGA-1.0.0-setup.exe + -portable.exe
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions
cd /d "%~dp0"
title METATRON OMEGA Build Pipeline

REM This IDE exports ELECTRON_RUN_AS_NODE=1, which silently turns Electron
REM into plain Node. Clear it for the whole pipeline.
set "ELECTRON_RUN_AS_NODE="

echo.
echo  ═══ METATRON OMEGA BUILD PIPELINE ═══
echo  [0/4] checking dependencies…
if not exist node_modules\electron\dist\electron.exe (
  echo        electron missing - running npm install…
  call npm install --no-audit --no-fund || goto :fail
)
if not exist node_modules\electron-builder\out\cli.js (
  echo        electron-builder missing - running npm install…
  call npm install --no-audit --no-fund || goto :fail
)

echo  [1/4] bundling the OMEGA brain (esbuild)…
call npm run bundle:omega || goto :fail

echo  [2/4] smoke tests (chat + sensory codec + brain loop)…
call node scripts\smoke.mjs || goto :fail

echo  [3/4] pack (unpacked verification build)…
call npx electron-builder --dir || goto :fail

echo  [3b/4] verifying packaged exe (--ci roundtrip)…
call "release\win-unpacked\METATRON-OMEGA.exe" --ci
if not exist "%TEMP%\omega-ci-report.txt" goto :fail
findstr /C:"PASS" "%TEMP%\omega-ci-report.txt" >nul || goto :fail
del "%TEMP%\omega-ci-report.txt" >nul 2>&1

echo  [4/4] dist (NSIS installer + portable)…
call npx electron-builder || goto :fail

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

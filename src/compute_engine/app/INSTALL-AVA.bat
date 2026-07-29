@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  AVA — INSTALLER LAUNCHER  (double-click)
REM  Installs the newest release\AVA-*-setup.exe, then VERIFIES the install
REM  from the registry and runs the installed app's self-check.
REM
REM  Usage:  INSTALL-AVA.bat          → assisted install (you pick the folder)
REM          INSTALL-AVA.bat /S       → fully silent install (default folder)
REM ══════════════════════════════════════════════════════════════════════════
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title AVA Installer
set "ELECTRON_RUN_AS_NODE="

echo.
echo  ═══ AVA INSTALLER ═══

REM ── find the newest setup exe ──
set "SETUP="
for /f "delims=" %%F in ('dir /b /o-d release\AVA-*-setup.exe 2^>nul') do (
  if not defined SETUP set "SETUP=release\%%F"
)
if not defined SETUP (
  echo  ERROR: no release\AVA-*-setup.exe found.
  echo  Run BUILD-AVA.bat first.
  pause & exit /b 1
)
echo  installer: %SETUP%

REM ── run it ──
if /i "%~1"=="/S" (
  echo  mode: silent ^(/S^)
  start "" /wait "%SETUP%" /S
) else (
  echo  mode: assisted - follow the installer window…
  start "" /wait "%SETUP%"
)
set "RC=%ERRORLEVEL%"
echo  installer exit code: %RC%
if not "%RC%"=="0" goto :fail

REM ── verify from the registry (the ground truth of "installed") ──
echo  verifying installation…
set "FOUND="
for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "AVA" 2^>nul ^| findstr /C:"DisplayName"') do set "FOUND=1" & echo  registered: %%B
if not defined FOUND (
  echo  ERROR: AVA not found in the uninstall registry — install did not complete.
  goto :fail
)

REM ── locate the installed exe and run its self-check ──
set "APPDIR="
for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "AVA" 2^>nul ^| findstr /C:"DisplayIcon"') do set "APPDIR=%%B"
if defined APPDIR (
  REM DisplayIcon is "<dir>\AVA.exe,0" — strip the ,0
  set "APPEXE=!APPDIR:,0=!"
  echo  installed exe: !APPEXE!
  if exist "!APPEXE!" (
    del "%TEMP%\ava-ci-report.txt" >nul 2>&1
    "!APPEXE!" --ci
    if exist "%TEMP%\ava-ci-report.txt" (
      findstr /C:"PASS" "%TEMP%\ava-ci-report.txt" >nul && (
        echo  SELF-CHECK: PASS ^(renderer + IPC + engine + sensors^)
      ) || ( echo  SELF-CHECK: FAIL & goto :fail )
    ) else (
      echo  WARNING: no CI report produced ^(older build^) — launch manually to verify.
    )
  )
)

echo.
echo  ═══ INSTALL COMPLETE ═══
pause
exit /b 0

:fail
echo.
echo  ═══ INSTALL FAILED — see above ═══
pause
exit /b 1

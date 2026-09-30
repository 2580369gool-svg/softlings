@echo off
rem ============================================================
rem  Softlings - mobile dev launcher (double-click to run)
rem
rem  Why a .cmd instead of "npm run mobile":
rem    PowerShell's default execution policy blocks npm.ps1 with
rem    "running scripts is disabled on this system". A .cmd file is
rem    not subject to execution policy, and we call node directly so
rem    the npm wrapper is skipped entirely.
rem
rem  NOTE: this file is intentionally ASCII-only. cmd.exe reads the
rem  script using the OEM codepage (GBK on this machine) BEFORE any
rem  chcp takes effect, so non-ASCII bytes here get mangled into
rem  stray command separators and break parsing.
rem ============================================================

chcp 65001 >nul 2>&1

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   [ERROR] Node.js not found. Please install it first.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo.
  echo   Dependencies missing. Running "npm install" ...
  echo.
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo   [ERROR] npm install failed.
    echo.
    pause
    exit /b 1
  )
)

node scripts\mobile.mjs

echo.
echo   Server stopped.
pause

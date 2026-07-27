@echo off
setlocal
chcp 65001 >nul
title Dia8Dragon - STOP APP
cd /d "%~dp0"

echo.
echo ===============================================
echo  Dia8Dragon - STOP APP
echo ===============================================
echo.

if not exist "%~dp0scripts\stop-local.ps1" (
  echo [LOI] Khong tim thay scripts\stop-local.ps1.
  echo Goi app bi thieu file dung ung dung.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-local.ps1"

echo.
echo Da gui lenh dung ung dung.
echo Neu trinh duyet con mo, co the dong tab trinh duyet.
echo.
pause

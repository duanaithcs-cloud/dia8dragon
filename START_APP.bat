@echo off
setlocal
chcp 65001 >nul
title Dia8Dragon - START APP
cd /d "%~dp0"

echo.
echo ===============================================
echo  Dia8Dragon - PVT-THCSHH
echo ===============================================
echo.
echo Dang mo ung dung...
echo Neu cong 3000 ban, app se tu chon cong tiep theo.
echo.

if not exist "%~dp0dist\index.html" (
  echo [LOI] Khong tim thay dist\index.html.
  echo Goi app co the chua duoc dong goi dung cach.
  echo Hay dung lai file zip moi nhat hoac bao nguoi gui goi lai.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0scripts\serve-dist.ps1" (
  echo [LOI] Khong tim thay scripts\serve-dist.ps1.
  echo Goi app bi thieu file khoi dong.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\serve-dist.ps1"

echo.
echo Ung dung da dung.
echo Co the bam START_APP.bat de mo lai.
echo.
pause

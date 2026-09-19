@echo off
title Karaoke Dual-Screen Launcher
echo ========================================================
echo        INICIANDO SISTEMA DE KARAOKE DUAL-SCREEN
echo ========================================================
echo.
echo [1/2] Iniciando Servidor Backend (Proxy YouTube en :3001)...
start "Karaoke Backend Server" cmd /k "cd /d "%~dp0server" && node src/index.js"

ping -n 3 127.0.0.1 >nul

echo [2/2] Iniciando Cliente Frontend (Vite en :5173)...
start "Karaoke Frontend Client" cmd /k "cd /d "%~dp0client" && npm.cmd run dev"

ping -n 4 127.0.0.1 >nul

echo.
echo Abriendo Operador en http://localhost:5173/ ...
start http://localhost:5173/

ping -n 2 127.0.0.1 >nul

echo Abriendo Pantalla de Proyeccion (Display) en http://localhost:5173/display ...
start http://localhost:5173/display

echo.
echo ========================================================
echo        SISTEMA DE KARAOKE EN EJECUCION
echo   Operador (Control): http://localhost:5173/
echo   Display (Proyector): http://localhost:5173/display
echo ========================================================

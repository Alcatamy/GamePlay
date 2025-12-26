@echo off
title Alcantasy Launcher
echo Iniciando servidor de Alcantasy...
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"
start "" "http://localhost:5173"
npm run dev
pause

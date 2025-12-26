@echo off
chcp 65001 > nul
title Migrar Alcantasy a Documentos
echo Copiando proyecto a C:\Users\adria\Documents\Fantasy\Alcantasy...
mkdir "C:\Users\adria\Documents\Fantasy\Alcantasy" 2>nul
robocopy "%~dp0." "C:\Users\adria\Documents\Fantasy\Alcantasy" /E /XD node_modules .git /R:1 /W:1
echo.
echo Copia completada.
echo Por favor, abre la carpeta "C:\Users\adria\Documents\Fantasy\Alcantasy" en tu editor para continuar.


@echo off
cd /d "%~dp0"
echo.
echo  SepLab Tooling - Iniciando...
echo.
if not exist "node_modules" (
  echo  Instalando dependencias (primeira vez, aguarde)...
  npm.cmd install
  echo.
)
echo  Servidor iniciado! Abrindo navegador...
start http://localhost:3000/separacao-pedidos_1.html
node server.js
pause

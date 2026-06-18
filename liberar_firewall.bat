@echo off
:: Solicita permissao de administrador automaticamente
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo  Liberando porta 3000 no firewall...
netsh advfirewall firewall delete rule name="SepLab Tooling" >nul 2>&1
netsh advfirewall firewall add rule name="SepLab Tooling" dir=in action=allow protocol=TCP localport=3000
echo.
echo  Porta 3000 liberada com sucesso!
echo  O aplicativo ja pode ser acessado pela rede.
echo.
pause

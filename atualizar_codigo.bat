@echo off
setlocal
cd /d "%~dp0"
echo.
echo  Volux - Atualizar codigo (pull + push)
echo.

echo Baixando as ultimas mudancas do GitHub...
git pull --rebase
if errorlevel 1 (
  echo.
  echo  ATENCAO: houve um conflito com uma mudanca do outro programador.
  echo  Abra o(s) arquivo(s) com conflito no editor, procure pelas marcacoes
  echo  ^<^<^<^<^<^<^<  /  ^=^=^=^=^=^=^=  /  ^>^>^>^>^>^>^>, decida o que fica, apague
  echo  essas marcacoes, salve o arquivo, depois rode:
  echo.
  echo    git add .
  echo    git rebase --continue
  echo.
  echo  E rode este script de novo pra terminar o envio.
  echo.
  pause
  exit /b 1
)

git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo  Tudo atualizado - voce nao tem mudanca nenhuma pra enviar.
  pause
  exit /b 0
)

echo.
set "MSG="
set /p MSG="Descreva rapidamente o que voce mudou (Enter para pular): "
if "%MSG%"=="" set "MSG=Atualizacao de codigo"

git commit -m "%MSG%"
git push

echo.
echo  Pronto! Suas mudancas foram enviadas.
echo  O outro programador so precisa rodar este mesmo script pra receber.
echo.
pause

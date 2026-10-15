' Volux - abre o sistema como aplicativo (janela propria, sem barra do navegador).
' Liga o servidor em segundo plano se ele ainda nao estiver rodando.
Option Explicit

Const URL_APP = "http://localhost:3000/separacao-pedidos_1.html"
Const URL_CHECK = "http://localhost:3000/api/network-info"

Dim WShell, FSO, pasta, navegador, i
Set WShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
pasta = FSO.GetParentFolderName(WScript.ScriptFullName)

Function ServidorRodando()
  Dim http
  ServidorRodando = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP")
  http.setTimeouts 1000, 1000, 1000, 1000
  http.Open "GET", URL_CHECK, False
  http.Send
  If Err.Number = 0 Then
    If http.Status = 200 Then ServidorRodando = True
  End If
  On Error GoTo 0
End Function

If Not ServidorRodando() Then
  If Not FSO.FolderExists(pasta & "\node_modules") Then
    WShell.Run "cmd /c cd /d """ & pasta & """ && npm.cmd install", 1, True
  End If
  WShell.Run "cmd /c cd /d """ & pasta & """ && node server.js", 0, False
  For i = 1 To 20
    WScript.Sleep 500
    If ServidorRodando() Then Exit For
  Next
  If Not ServidorRodando() Then
    MsgBox "Nao foi possivel iniciar o servidor do Volux." & vbCrLf & _
           "Verifique se o Node.js esta instalado.", vbExclamation, "Volux"
    WScript.Quit 1
  End If
End If

navegador = ""
If FSO.FileExists(WShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe") Then
  navegador = WShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
ElseIf FSO.FileExists(WShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe") Then
  navegador = WShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"
ElseIf FSO.FileExists(WShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe") Then
  navegador = WShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
End If

If navegador <> "" Then
  WShell.Run """" & navegador & """ --app=" & URL_APP & " --window-size=1400,900", 1, False
Else
  WShell.Run URL_APP
End If

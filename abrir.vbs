Set WShell = CreateObject("WScript.Shell")
Set objHTTP = CreateObject("MSXML2.XMLHTTP")

bRodando = False
On Error Resume Next
objHTTP.Open "GET", "http://localhost:3000", False
objHTTP.Send
If Err.Number = 0 Then
    If objHTTP.Status = 200 Then bRodando = True
End If
On Error GoTo 0

If Not bRodando Then
    WShell.Run "cmd /c ""cd /d """"\\192.168.2.253\estoque\VITOR ESTOQUE\PASTA DO APLICATIVO"""" && node server.js""", 0, False
    WScript.Sleep 2500
End If

WShell.Run "http://localhost:3000/separacao-pedidos_1.html"

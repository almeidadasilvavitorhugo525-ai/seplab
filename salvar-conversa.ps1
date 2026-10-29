# Salva as conversas com o Claude sobre o SepLab/Volux (a cada 30 min, pelo Agendador de Tarefas do Windows).
# Copia o registro completo (.jsonl) e gera uma versao legivel (.md) em backup-conversas\ (fora do Git).
$projetos = "$env:USERPROFILE\.claude\projects"
$destino  = "$env:USERPROFILE\seplab\backup-conversas"
New-Item -ItemType Directory -Force $destino | Out-Null

# Conversas abertas dentro da pasta seplab (atalho "Continuar Projeto Seplab") entram todas;
# as abertas na pasta do usuario so entram se falarem do SepLab/Volux.
$arquivos = @(Get-ChildItem "$projetos\C--Users-PC-ESTOQUE-0365-seplab*" -Filter *.jsonl -Recurse -ErrorAction SilentlyContinue) +
            @(Get-ChildItem "$projetos\C--Users-PC-ESTOQUE-0365" -Filter *.jsonl -ErrorAction SilentlyContinue |
              Where-Object { Select-String -Path $_.FullName -Pattern 'seplab|volux' -Quiet })

$arquivos | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-2) } | ForEach-Object {
    $data = $_.CreationTime.ToString('yyyy-MM-dd')
    $nome = "$data-$($_.BaseName.Substring(0,8))"
    Copy-Item $_.FullName "$destino\$nome.jsonl" -Force

    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.AppendLine("# Conversa $nome (salva em $(Get-Date -Format 'dd/MM/yyyy HH:mm'))`n")
    foreach ($linha in [System.IO.File]::ReadLines($_.FullName)) {
        try { $m = $linha | ConvertFrom-Json } catch { continue }
        if ($m.type -ne 'user' -and $m.type -ne 'assistant') { continue }
        $c = $m.message.content
        $texto = if ($c -is [string]) { $c } else { ($c | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.text }) -join "`n" }
        if (-not $texto -or $texto -match '^\s*<(system-reminder|task-notification|command-)') { continue }
        $quem = if ($m.type -eq 'user') { 'Vitor' } else { 'Claude' }
        [void]$sb.AppendLine("## $quem`n$texto`n")
    }
    [System.IO.File]::WriteAllText("$destino\$nome.md", $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
}

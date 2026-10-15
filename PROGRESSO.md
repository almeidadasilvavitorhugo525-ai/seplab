# Volux — Diário de progresso

Registro do que foi feito em cada sessão, para retomar de onde parou.

## Sessão de 15/10/2026

### Feito
1. **Junção das versões** — o commit de 14/10 (roteiro de entrega, painel TV, README) foi integrado ao trabalho local de segurança:
   - só a pasta `public/` é acessível pelo navegador (data.json, users.json e backups dão 404);
   - login bloqueia 15 min após 5 senhas erradas;
   - todo dado de pedido mostrado na tela passa por `esc()` (inclusive roteiro e painel TV).
2. **Volux como aplicativo** — atalhos **Volux** e **Volux TV** na área de trabalho (`Volux.vbs`, ícones `public/volux.ico` e `public/volux-tv.ico`). Ligam o servidor escondido e abrem em janela própria. O app também é instalável pelo navegador ou celular (`manifest.webmanifest`).
3. **Análise de mercado** — comparação com sistemas de separação/WMS. Lista de prioridades:
   1. 🔴 Sincronização: dois aparelhos salvando ao mesmo tempo apagavam o trabalho um do outro — **FEITO**
   2. 🟠 Registrar quem marcou cada item e quando — **FEITO**
   3. 🟠 Conferência por bip (bipar a peça marca o item; peça errada bloqueia)
   4. 🟠 Estoque integrado (baixa automática ao concluir o pedido, entradas e saídas)
   5. 🟡 Prioridade/urgente e ordenar por prazo
   6. 🟡 Localização das peças (prateleira/corredor)
   7. 🟡 Produtividade (tempo por pedido, itens por pessoa, gráficos)
   8. 🟡 Exportar para Excel
   9. 🟡 Inventário rotativo
   - Depois: integração com o Questor, etiqueta de volume e transportadora.
4. **Sincronização (item 1)** — `public/sync.js` + `/api/patch` + `/api/rev`. Cada aparelho envia só o que mudou, o servidor mescla item a item e a tela puxa as novidades a cada 4 s sem fechar cards. Testado com 2 usuários ao mesmo tempo: 12 testes de API mais o teste no navegador.
5. **Quem marcou (item 2)** — cada item guarda `por`/`em`, mostrados embaixo do item ("Fulano · 14:32"). O pedido guarda `criadoPor`, `iniciadoEm/Por` e `concluidoPor`, que aparecem no histórico.

### Próximos passos
- Item 3 (conferência por bip) e item 4 (estoque integrado) — em andamento.

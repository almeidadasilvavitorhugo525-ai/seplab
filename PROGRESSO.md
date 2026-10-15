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
   3. 🟠 Conferência por bip (bipar a peça marca o item; peça errada bloqueia) — **FEITO**
   4. 🟠 Estoque integrado (baixa automática ao concluir o pedido, entradas e saídas) — **FEITO**
   5. 🟡 Prioridade/urgente e ordenar por prazo
   6. 🟡 Localização das peças (prateleira/corredor)
   7. 🟡 Produtividade (tempo por pedido, itens por pessoa, gráficos)
   8. 🟡 Exportar para Excel
   9. 🟡 Inventário rotativo
   - Depois: integração com o Questor, etiqueta de volume e transportadora.
4. **Sincronização (item 1)** — `public/sync.js` + `/api/patch` + `/api/rev`. Cada aparelho envia só o que mudou, o servidor mescla item a item e a tela puxa as novidades a cada 4 s sem fechar cards. Testado com 2 usuários ao mesmo tempo: 12 testes de API mais o teste no navegador.
5. **Quem marcou (item 2)** — cada item guarda `por`/`em`, mostrados embaixo do item ("Fulano · 14:32"). O pedido guarda `criadoPor`, `iniciadoEm/Por` e `concluidoPor`, que aparecem no histórico.

6. **Conferência por bip (item 3)** — com o pedido aberto, bipar a peça marca o item. Peça errada mostra "PEÇA ERRADA" e não marca nada. Os códigos ficam em Catálogo › Código de barras (ou no Estoque, pela descrição). Testado no navegador: peça certa, repetida, errada, desconhecida e sem pedido aberto.
7. **Estoque integrado (item 4)** — servidor `/api/estoque/movimento`. Baixa automática ao concluir o pedido, sem duplicar. Botões + Entrada / − Saída, histórico de movimentações, colunas Reservado/Disponível e edição manual registrada como "Ajuste". Testado: duas saídas simultâneas foram somadas corretamente.

### Para usar no dia a dia
- **Cadastrar os códigos de barras** das peças em Catálogo › Código de barras (é só bipar no campo).
- **Ligar o estoque aos itens:** o item de estoque precisa ter o mesmo código de barras da peça ou a descrição igual ao nome do item no pedido.
- Abas antigas abertas antes da atualização mostram "O Volux foi atualizado. Recarregue a página (F5)".

### Próximos passos (itens 5 a 9 da lista)
5. Prioridade/urgente e ordenar por prazo
6. Localização das peças (prateleira/corredor)
7. Produtividade (tempo por pedido, itens por pessoa, gráficos), já que os dados de quem/quando estão sendo gravados
8. Exportar para Excel
9. Inventário rotativo

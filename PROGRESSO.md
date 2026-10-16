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

## Sessão de 16/10/2026
- **Estoque:** clicar nos cards (Total de Itens, Em Estoque, Estoque Baixo, Sem Estoque) filtra a lista. O card ativo fica destacado e clicar nele de novo volta para "Todos".
- **Atualização automática:** quando o Volux é atualizado, as telas abertas recarregam sozinhas (assim que ninguém estiver digitando ou com janela aberta). `/api/rev` devolve `app` = data do arquivo da tela.
- **Painel:** clicar nos cards (Em Aberto, Concluídos, Aguardando, Separando, Prontos) mostra a lista desses pedidos logo abaixo; clicar num pedido abre ele (concluído abre o detalhe do histórico). Só o Painel e o Estoque têm cards de números; nas outras abas, perguntar ao usuário o que ele quer clicável.
- **Roteiro pelas rodovias:** a rota agora segue as estradas (serviço gratuito OSRM, dados do OpenStreetMap), com km e tempo de viagem reais por trecho, ordem das entregas otimizada pela estrada e botão "Abrir no Google Maps". Sem internet, volta para a linha reta com aviso. Destinos escritos de forma bagunçada (ex.: "MOSSORO RN CEP: 59610-210") agora são localizados.

### O que foi pedido nesta sessão (em ordem)
1. "na função estoque, quero que dê para eu clicar nos itens" (ex.: clicar em Estoque Baixo e ver só o estoque baixo) — feito.
2. "ainda não arrumou a parte do estoque" — o código já estava no ar, mas a janela aberta mostrava a versão antiga. Solução: recarregamento automático das telas.
3. "fazer essa mesma função em todas as opções do sistema, agora na parte do painel" — feito.
4. Print do roteiro com a linha reta passando por dentro do rio: "quero a rota certa passando pelas rodovias" — feito.
5. "salva tudo no GitHub, vou abrir em outro computador" — tudo enviado.

### Detalhes técnicos
- Rota: 2 consultas ao OSRM público (`router.project-osrm.org`): `/trip` com `overview=false` para a ordem das entregas e `/route` com `geometries=polyline` para o desenho (geojson completo pesava ~500 KB e demorava 60 s). Decodificador `decodificarPolyline()` no HTML. Tempo de viagem é de carro (caminhão demora mais).
- Teste do roteiro com os 3 pedidos reais: Paranavaí → Teresina 2805 km → Fortaleza 593 km → Mossoró 237 km (≈ 8 s para calcular).
- Correções de segurança aproveitadas: `esc()` em "Itens mais pendentes" do Painel e no destino/modelos do Histórico.

### Abrir em outro computador
- `git clone https://github.com/almeidadasilvavitorhugo525-ai/seplab` → `npm install` → `node server.js` → http://localhost:3000.
- `data.json` (pedidos/estoque/histórico) e `users.json` (usuários/senhas) **não vão pelo GitHub** (dados de clientes e senhas). Copiar por pen drive para a pasta do projeto, ou acessar este computador pela rede (IP:3000) para usar os mesmos dados.

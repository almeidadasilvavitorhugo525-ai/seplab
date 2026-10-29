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
   5. 🟡 Prioridade/urgente e ordenar por prazo — **FEITO (29/10)**
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

## Sessão de 19/10/2026
- **Observação da separação:** pedido do usuário: "um campo de observação para escrever o status do pedido, ex.: tenho que separar 3 máquinas mas só tenho 2 — já separei 2 e falta uma". Cada pedido tem o campo "Observação da separação" dentro do card (salva sozinho ao parar de digitar, grava quem e quando). Aparece:
  - no cabeçalho do card mesmo fechado;
  - na lista do Painel;
  - no painel da TV;
  - no detalhe do Histórico depois de concluído.
  Campos: `obsSeparacao`, `obsSeparacaoEm`, `obsSeparacaoPor`. É diferente do `obs` (observação que vem do pedido).
- **Pegar os pedidos (papel sem código):** protótipo aprovado em https://claude.ai/artifact/4XNCZMQSM8thC1jzdzsotx e colocado no Volux:
  - **Etiqueta do pedido (100 × 50 mm):** sai ao salvar um pedido novo (opção "Imprimir etiqueta do pedido ao salvar", lembrada por aparelho) e pelo botão "Etiqueta do Pedido" no card. Tem número grande, cliente, cidade, **data de criação** (pedido do usuário: no lugar da data de envio), código de barras do número e QR. Cola no papel do pedido.
  - **QR:** abre `http://IP-DA-REDE:3000/separacao-pedidos_1.html#pedido=NUMERO`; o Volux abre o pedido sozinho (`abrirPedidoDaUrl`). IP vem de `/api/network-info`.
  - **Etiqueta de carregamento (A4):** cópia do modelo do Canva do usuário (imagem "ANA CAROLINA (3).png"; desenho dos óculos recortado em `public/etiqueta-oculos.png`, fonte League Spartan). Abre sozinha quando o pedido chega a 100%: pergunta **volumes** e **nº da nota fiscal** (e telefone/bairro), imprime **uma folha por volume** ("VOLUMES: 3" + rodapé "NF 012345 · VOLUME 1 DE 3"), depois pergunta se move para o histórico. Também pelo botão no card (100%) e no detalhe do Histórico.
  - Campos novos no pedido: `telefone`, `bairro` (cadastro e edição), `volumes`, `notaFiscal`.
  - Ainda não confirmado pelo usuário: se a etiqueta do pedido vai em impressora de etiqueta ou folha A4 (hoje o tamanho da página é 100 × 50 mm).

## Sessão de 21/10/2026

**Pedido:** "no mapa, quero que apareça onde está o gerador TL JR que entregamos para a VS Lab; quando eu escolher Fusion, aparecem todas as Fusion que vendemos".

**Feito:** aba **Mapa** reformulada:
- Mostra **todas** as máquinas dos pedidos (antes só apareciam as com nº de série e pino marcado à mão, por isso o mapa ficava vazio).
- Filtro de produto com a quantidade vendida de cada um (ex.: "Blocadora Fusion (6)"); filtro "entregues / em separação".
- Pino verde = entregue (Histórico), laranja = em separação; número no pino = quantidade de máquinas daquele pedido.
- Pedidos sem pino são localizados sozinhos pelo endereço/cidade/CEP (Nominatim, 1 por segundo) e o resultado fica salvo no pedido (`p.geo` com `chave` do endereço; se o endereço mudar, localiza de novo; falha tenta de novo após 1 dia). O Roteiro também aproveita esse local salvo.
- Lista abaixo do mapa: "6 Blocadora Fusion em 5 clientes" com cliente, cidade, máquinas e data de entrega; clicar centraliza o mapa e abre a ficha.
- Busca por nº de série (da máquina ou dos itens) ou nome do cliente.

**Conversas:** criado repo privado `conversas-claude` com `salvar_conversas.py`; falta o usuário rodar o primeiro salvamento e o `schtasks` (o Claude Code bloqueou rodar daqui).
- **Mapa limpo** (pedido do usuário: "deixar o mapa limpo, e as informações aparecem só quando eu quiser"): botão "Mostrar informações / Mapa limpo" (lembrado em `localStorage` `volux_mapa_limpo`, padrão = limpo). No modo limpo só aparecem os pinos; clicar num pino abre um balão com cliente, cidade, máquinas e "Ver detalhes".

## Sessão de 29/10/2026

**Retomada e salvamento:** criado o comando `/seplab` (retoma o projeto lendo este arquivo, o Git e a última conversa salva) e o atalho "Continuar Projeto Seplab.bat" na Área de Trabalho. A tarefa do Windows "Salvar Conversa Seplab" roda `salvar-conversa.ps1` a cada 30 min e guarda as conversas em `backup-conversas\` (fora do Git, pode ter dados de clientes).

**Item 5 — Prioridade e prazo** (pedido do usuário: "pode começar pelo item 5"):
- Botão de bandeira no card do pedido marca/desmarca **Urgente** (grava quem e quando: `prioridade`, `prioridadeEm`, `prioridadePor`). Também dá para marcar no cadastro e na edição ("Pedido urgente").
- Lista de pedidos ordenada por **urgentes primeiro → prazo de envio mais próximo → sem data**; prontos (100%) vão para o fim. Seletor "Ordem: urgentes e prazo / mais recentes" (lembrado no aparelho, `volux_ordem_pedidos`).
- Filtro novo **Urgentes** com a contagem; selo vermelho "Urgente" no card e nas listas do Painel.
- A data de envio mostra quanto falta: "hoje", "amanhã", "em 3 dias" ou "X dias de atraso" (em vermelho quando falta 1 dia ou menos).
- **Painel da TV:** urgentes no topo com a faixa vermelha "URGENTE" piscando; depois separando, aguardando e prontos, cada grupo pelo prazo.
- Testado numa cópia na porta 3999: o urgente sobe para o topo sem fechar o card aberto, fica gravado no servidor, e a TV mostra em primeiro.

**Próximo:** item 6 (localização das peças: prateleira/corredor). Ainda pendente: confirmar se a etiqueta do pedido vai em rolo ou A4.

## Sessão de 29/10/2026
- Criado o comando `/seplab` e o salvamento automático das conversas (tarefa "Salvar Conversa Seplab", minutos :28 e :58, pasta `backup-conversas/` fora do Git).
- **Tela de Pedidos mais profissional** — pedido do usuário: "assim ela está ficando muito minimizada" e "parece uma coisa muito de iniciante, quero algo mais profissional". Hoje a tela usa só ~1140 px no centro de um monitor de 1870 px, com letras pequenas e tudo em caixa alta condensada.
  - Protótipo com 2 propostas: https://claude.ai/artifact/JCEnqSu3bE4M7shau5MFNq
    - **A · Lista + painel lateral:** menu lateral escuro, indicadores, lista em tabela (pedido, cliente/máquinas, destino, prazo, barra de separação, situação) e o checklist do pedido aberto num painel à direita.
    - **B · Quadro por etapa:** colunas Aguardando / Separando / Prontos para carregar.
  - Pendente: o usuário escolher A ou B (ou misturar) antes de mexer no código.
  - Atenção: outra janela do Claude estava mexendo em `separacao-pedidos_1.html` e `tv.html` ao mesmo tempo (urgentes/ordem por prazo). Ela já fez o commit `22e1d97` (item 5 feito); o novo layout tem que manter o filtro Urgentes e a ordem por prazo.

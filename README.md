# SepLab — Sistema de Separação de Pedidos

Sistema interno para gerenciar a separação de pedidos de laboratório, com painel de produção para TV e roteiro de entrega otimizado.

---

## Sumário

- [O que é o SepLab](#o-que-é-o-seplab)
- [Como instalar e rodar](#como-instalar-e-rodar)
- [Acesso pelo celular / rede local](#acesso-pelo-celular--rede-local)
- [Telas e funcionalidades](#telas-e-funcionalidades)
  - [Pedidos](#pedidos)
  - [Histórico](#histórico)
  - [Mapa](#mapa)
  - [Roteiro de Entrega](#roteiro-de-entrega)
  - [Painel](#painel)
  - [Itens Padrão](#itens-padrão)
  - [Estoque](#estoque)
  - [Catálogo](#catálogo)
  - [Usuários](#usuários)
- [Painel TV](#painel-tv)
- [Estrutura do projeto](#estrutura-do-projeto)
- [API do servidor](#api-do-servidor)
- [Usuários e permissões](#usuários-e-permissões)
- [Backup automático](#backup-automático)

---

## O que é o SepLab

O SepLab é um sistema web local para controlar a separação de pedidos de equipamentos de laboratório óptico. Ele substitui planilhas e papéis, permitindo que toda a equipe veja em tempo real o que está sendo separado, o que falta e o que já foi concluído.

**Funcionalidades principais:**
- Cadastro e acompanhamento de pedidos com checklist por máquina
- Registro de número de série de cada equipamento
- Mapa de localização dos clientes
- Roteiro de entrega otimizado saindo de Paranavaí-PR
- Painel de TV para exibição em tempo real na produção
- Controle de estoque de itens
- Catálogo de produtos
- Histórico de pedidos concluídos
- Múltiplos usuários com níveis de acesso (admin / operador)
- Backup automático dos dados

---

## Como instalar e rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior

### Instalação

```bash
# Clone o repositório
git clone https://github.com/almeidadasilvavitorhugo525-ai/seplab.git
cd seplab

# Instale as dependências
npm install
```

### Iniciar o sistema

**Windows — duplo clique em:**
```
iniciar.bat
```

**Ou pelo terminal:**
```bash
node server.js
```

O sistema abre em:
- **Local:** http://localhost:3000/separacao-pedidos_1.html
- **Rede:** http://`<IP da máquina>`:3000/separacao-pedidos_1.html

### Aplicativo na área de trabalho (Windows)

Dê duplo clique em **`Volux.vbs`** (ou no atalho **Volux** da área de trabalho). Para o painel TV use o atalho **Volux TV** (`Volux.vbs tv.html`, ícone `public\volux-tv.ico`), que abre maximizado. Ele:
- liga o servidor em segundo plano, sem janela preta, caso ainda não esteja rodando;
- abre o Volux em uma janela própria (Edge ou Chrome em modo app), sem barra de endereço.

Para criar o atalho em outro computador: botão direito em `Volux.vbs` → *Enviar para* → *Área de trabalho*, depois em *Propriedades* → *Alterar ícone* → `publicolux.ico`.

O Volux também pode ser instalado como app pelo navegador (ícone de instalar na barra de endereço do Chrome/Edge) ou, no celular, por *Adicionar à tela inicial*.

### Primeiro acesso

Na primeira vez que rodar, o sistema cria automaticamente um usuário administrador e exibe as credenciais no terminal:

```
⚠ Primeiro usuário administrador criado:
   Usuário: admin
   Senha:   XxXxXxXxXx
   Anote essa senha agora — ela não será exibida de novo.
```

Anote a senha antes de fechar o terminal.

---

## Acesso pelo celular / rede local

Qualquer dispositivo na mesma rede Wi-Fi pode acessar o sistema:

1. Veja o **IP da Rede** exibido no terminal ao iniciar
2. No celular ou tablet, abra o browser e acesse: `http://192.168.X.X:3000/separacao-pedidos_1.html`
3. Faça login normalmente

---

## Telas e funcionalidades

### Pedidos

Tela principal. Lista todos os pedidos ativos com:

- **Status visual** — barra lateral colorida indicando o estágio:
  - Amarelo = Aguardando (0%)
  - Azul = Em separação (1–99%)
  - Verde = Concluído (100%)
- **Barra de progresso** por pedido e por máquina
- **Checklist por máquina** — cada item pode ser marcado individualmente
- **Campo de número de série** para itens rastreáveis
- **Filtros rápidos:** Todos / Aguardando / Separando / Concluído / Atrasados
- **Scan por código de barras** — campo de busca rápida no topo

**Criar pedido:**
1. Clique em `+ Novo Pedido`
2. Preencha: número, cliente, endereço, destino, CEP, data, responsável, observações
3. Selecione os produtos (máquinas) que fazem parte do pedido
4. Salve

**Concluir pedido:**
- Quando todos os itens estiverem marcados (100%), aparece o botão **Concluir Pedido**
- O pedido vai automaticamente para o Histórico

---

### Histórico

Lista de todos os pedidos concluídos. Mostra cliente, destino, data de conclusão e produtos separados.

---

### Mapa

Exibe no mapa (OpenStreetMap via Leaflet) a localização de todos os clientes com pedidos.

- Clique em um marcador para ver os detalhes do pedido
- Filtre por modelo de máquina ou busque por número de série

---

### Roteiro de Entrega

Calcula automaticamente a melhor ordem de entrega para um conjunto de pedidos, sempre partindo de **Paranavaí-PR**.

**Como usar:**
1. Acesse a aba **Roteiro**
2. Marque os pedidos que vão no caminhão clicando nos cards
3. Clique em **Traçar Rota**
4. O sistema geocodifica os destinos (via OpenStreetMap) e calcula a rota otimizada

**Resultado:**
- Mapa com marcadores numerados na ordem de entrega
- Linha pontilhada conectando os pontos
- Lista ordenada: 1ª entrega, 2ª entrega... com distância estimada em km
- Distância total do percurso

> **Algoritmo:** Nearest Neighbor (vizinho mais próximo) — parte de Paranavaí-PR e sempre vai para o destino mais perto do ponto atual. Funciona bem para rotas de até ~15 paradas.

> **Geocodificação:** Usa a API gratuita do Nominatim (OpenStreetMap). Se o pedido já tiver coordenadas salvas no mapa, usa direto sem precisar geocodificar.

---

### Painel

Dashboard com estatísticas gerais: total de pedidos, itens separados, progresso geral, itens em falta.

---

### Itens Padrão

Gerencia os itens padrão de cada modelo de máquina. Quando um pedido é criado com determinado modelo, o checklist é gerado automaticamente a partir daqui.

---

### Estoque

Controle de quantidade de peças e componentes disponíveis em estoque.

- Adicionar / editar / remover itens
- Visualizar alertas de estoque baixo ou zerado

---

### Catálogo

Lista de todos os modelos de máquina disponíveis para pedidos.

---

### Usuários

Disponível apenas para administradores. Permite:

- Criar novos usuários (operadores ou admins)
- Alterar nome e senha
- Remover usuários

---

## Painel TV

Tela separada otimizada para exibição em **TV ou monitor na área de produção**.

**Acesso:** `http://localhost:3000/tv.html`  
(ou pelo IP da rede em qualquer dispositivo)

### Funcionalidades

- **Login próprio** — mesmas credenciais do sistema principal
- **Auto-refresh a cada 30 segundos** — a tabela atualiza sozinha
- **Relógio ao vivo** no cabeçalho
- **Botão tela cheia** — remove a barra do browser para exibição na TV
- **Filtros clicáveis** no topo:

| Card | Filtro |
|------|--------|
| Todos os Pedidos | Mostra tudo |
| Aguardando | Pedidos ainda não iniciados |
| Em Separação | O que está sendo trabalhado agora |
| Concluídos | Pedidos 100% prontos |

- **Tabela de pedidos** com:
  - Número do pedido
  - Cliente e destino
  - Barra de progresso por máquina
  - Status colorido (Aguardando / Separando / Concluído)
  - Percentual geral

### Como configurar na TV

1. Ligue a TV ou monitor em um computador/mini-PC na rede
2. Abra o Chrome ou Edge
3. Acesse `http://<IP do servidor>:3000/tv.html`
4. Faça login
5. Pressione **F11** ou clique no botão de tela cheia no painel

---

## Estrutura do projeto

```
seplab/
├── server.js                  # Servidor Express (API + arquivos de public/)
├── public/                    # Única pasta acessível pelo navegador
│   ├── separacao-pedidos_1.html   # Sistema principal (SPA)
│   ├── tv.html                    # Painel de TV
│   ├── rede.html                  # Página de informações de rede (QR Code)
│   ├── manifest.webmanifest       # Dados do app instalável (nome, ícones, cores)
│   └── volux.ico / icon-*.png / favicon.svg   # Ícones do app
├── data.json                  # Dados dos pedidos (gerado automaticamente, não versionado)
├── users.json                 # Usuários cadastrados (gerado automaticamente, não versionado)
├── package.json               # Dependências Node.js
├── Volux.vbs                  # Abre o Volux como aplicativo (liga o servidor se preciso)
├── iniciar.bat                # Inicia com janela de terminal
├── atualizar_codigo.bat       # Pull + push do GitHub
├── sincronizar_pendrive.bat   # Sincroniza dados com pen drive
├── backups/                   # Backups automáticos dos dados
│   └── data-YYYY-MM-DD.json
```

> Por segurança, `data.json`, `users.json` e `backups/` ficam fora de `public/` e não podem ser baixados pelo navegador.

---

## API do servidor

Todas as rotas protegidas exigem o header `x-volux-token` com o token de sessão.

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/api/login` | Público | Autenticar usuário (bloqueia 15 min após 5 tentativas erradas) |
| POST | `/api/logout` | Autenticado | Encerrar sessão |
| GET | `/api/me` | Autenticado | Dados do usuário logado |
| GET | `/api/data` | Autenticado | Buscar todos os dados |
| POST | `/api/data` | Autenticado | Salvar dados (operadores não podem excluir) |
| GET | `/api/usuarios` | Admin | Listar usuários |
| POST | `/api/usuarios` | Admin | Criar usuário |
| PUT | `/api/usuarios/:id` | Admin | Editar usuário |
| DELETE | `/api/usuarios/:id` | Admin | Remover usuário |
| GET | `/api/backup-download` | Admin | Baixar backup JSON |
| GET | `/api/network-info` | Público | IP e porta do servidor |

---

## Usuários e permissões

| Permissão | Operador | Admin |
|-----------|----------|-------|
| Ver pedidos | ✅ | ✅ |
| Criar pedidos | ✅ | ✅ |
| Editar pedidos | ✅ | ✅ |
| Marcar itens do checklist | ✅ | ✅ |
| Concluir pedidos | ✅ | ✅ |
| Excluir pedidos | ❌ | ✅ |
| Excluir histórico | ❌ | ✅ |
| Gerenciar usuários | ❌ | ✅ |
| Baixar backup | ❌ | ✅ |
| Gerenciar estoque | ✅ | ✅ |

---

## Backup automático

A cada vez que os dados são salvos, o sistema gera automaticamente um backup em `backups/data-YYYY-MM-DDTHH-MM-SS.json`.

- Máximo de **30 backups** mantidos (os mais antigos são removidos automaticamente)
- Para restaurar um backup: substitua o `data.json` pelo arquivo de backup desejado e reinicie o servidor

---

## Dependências

| Pacote | Versão | Uso |
|--------|--------|-----|
| express | ^4.18.2 | Servidor HTTP |

**Frontend (CDN, sem instalação):**
- [Leaflet 1.9.4](https://leafletjs.com/) — mapas interativos
- [OpenStreetMap / Nominatim](https://nominatim.openstreetmap.org/) — mapas e geocodificação (gratuito)
- [qrcode 1.5.4](https://www.npmjs.com/package/qrcode) — QR Code de acesso em rede (`rede.html`)
- Google Fonts — Barlow Condensed + Inter

---

*SepLab — desenvolvido para uso interno.*

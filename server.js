const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const VoluxSync = require('./public/sync.js');

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 30;
const BACKUP_INTERVALO_MS = 5 * 60 * 1000; // no máximo 1 backup a cada 5 min
let ultimoBackup = 0;

// Versão dos dados: muda a cada gravação. Os aparelhos consultam /api/rev
// para saber se precisam buscar as novidades.
let REV = Date.now();

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const sessions = new Map(); // token -> {expiraEm, usuarioId, usuario, nome, admin}

function lerUsuarios() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function salvarUsuarios(lista) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(lista, null, 2), 'utf8');
}

function gerarHashSenha(senha, salt) {
  return crypto.scryptSync(senha, salt, 64).toString('hex');
}

function criarCredenciais(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: gerarHashSenha(senha, salt) };
}

function senhaConfere(senha, salt, hash) {
  const tentativa = Buffer.from(gerarHashSenha(senha, salt), 'hex');
  const esperado = Buffer.from(hash, 'hex');
  return tentativa.length === esperado.length && crypto.timingSafeEqual(tentativa, esperado);
}

function gerarSenhaAleatoria() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 10; i++) senha += alfabeto[crypto.randomInt(alfabeto.length)];
  return senha;
}

function seedUsuarioAdmin() {
  if (fs.existsSync(USERS_FILE)) return null;
  const usuarioPadrao = process.env.VOLUX_USUARIO || 'admin';
  const senhaPadrao = process.env.VOLUX_SENHA || gerarSenhaAleatoria();
  const { salt, hash } = criarCredenciais(senhaPadrao);
  salvarUsuarios([{
    id: crypto.randomBytes(6).toString('hex'),
    nome: 'Administrador',
    usuario: usuarioPadrao,
    salt, hash,
    admin: true
  }]);
  return { usuario: usuarioPadrao, senha: senhaPadrao };
}

const LOGIN_MAX_TENTATIVAS = 5;
const LOGIN_JANELA_MS = 15 * 60 * 1000; // 15min
const loginTentativas = new Map(); // ip -> {count, primeiraTentativa, bloqueadoAte}

function checarBloqueioLogin(ip) {
  const rec = loginTentativas.get(ip);
  if (!rec) return null;
  if (rec.bloqueadoAte && rec.bloqueadoAte > Date.now()) return rec.bloqueadoAte;
  if (rec.bloqueadoAte && rec.bloqueadoAte <= Date.now()) loginTentativas.delete(ip);
  return null;
}

function registrarLoginFalhou(ip) {
  const agora = Date.now();
  let rec = loginTentativas.get(ip);
  if (!rec || agora - rec.primeiraTentativa > LOGIN_JANELA_MS) rec = { count: 0, primeiraTentativa: agora };
  rec.count++;
  if (rec.count >= LOGIN_MAX_TENTATIVAS) rec.bloqueadoAte = agora + LOGIN_JANELA_MS;
  loginTentativas.set(ip, rec);
}

function limparSessoesExpiradas() {
  const agora = Date.now();
  for (const [token, sessao] of sessions) {
    if (sessao.expiraEm < agora) sessions.delete(token);
  }
}

function requireAuth(req, res, next) {
  const token = req.headers['x-volux-token'];
  limparSessoesExpiradas();
  const sessao = token && sessions.get(token);
  if (!sessao) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
  sessao.expiraEm = Date.now() + SESSION_TTL_MS; // renova a sessão a cada uso
  req.sessao = sessao;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.sessao.admin) {
    return res.status(403).json({ error: 'Apenas administradores podem fazer isso.' });
  }
  next();
}

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});
app.get('/', (req, res) => res.redirect('/separacao-pedidos_1.html'));
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function backupData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    if (Date.now() - ultimoBackup < BACKUP_INTERVALO_MS) return;
    ultimoBackup = Date.now();
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `data-${stamp}.json`));
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort();
    while (files.length > MAX_BACKUPS) {
      fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }
  } catch {}
}

function writeData(data) {
  backupData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  REV = Math.max(Date.now(), REV + 1);
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.post('/api/login', (req, res) => {
  const ip = req.ip;
  const bloqueadoAte = checarBloqueioLogin(ip);
  if (bloqueadoAte) {
    const min = Math.ceil((bloqueadoAte - Date.now()) / 60000);
    return res.status(429).json({ ok: false, error: `Muitas tentativas de login. Tente novamente em ${min} min.` });
  }
  const { usuario, senha } = req.body || {};
  const usuarios = lerUsuarios();
  const u = usuarios.find(x => x.usuario === usuario);
  if (!u || !senhaConfere(senha || '', u.salt, u.hash)) {
    registrarLoginFalhou(ip);
    return res.status(401).json({ ok: false, error: 'Usuário ou senha incorretos.' });
  }
  loginTentativas.delete(ip);
  limparSessoesExpiradas();
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { expiraEm: Date.now() + SESSION_TTL_MS, usuarioId: u.id, usuario: u.usuario, nome: u.nome, admin: !!u.admin });
  res.json({ ok: true, token, nome: u.nome, usuario: u.usuario, admin: !!u.admin });
});

app.post('/api/logout', (req, res) => {
  const token = req.headers['x-volux-token'];
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ usuario: req.sessao.usuario, nome: req.sessao.nome, admin: req.sessao.admin });
});

app.get('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
  const usuarios = lerUsuarios();
  res.json(usuarios.map(u => ({ id: u.id, nome: u.nome, usuario: u.usuario, admin: !!u.admin })));
});

app.post('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
  const { nome, usuario, senha, admin } = req.body || {};
  if (!nome || !usuario || !senha) {
    return res.status(400).json({ error: 'Preencha nome, usuário e senha.' });
  }
  const usuarios = lerUsuarios();
  if (usuarios.some(u => u.usuario.toLowerCase() === String(usuario).toLowerCase())) {
    return res.status(409).json({ error: 'Já existe um usuário com esse login.' });
  }
  const { salt, hash } = criarCredenciais(senha);
  const novo = { id: crypto.randomBytes(6).toString('hex'), nome, usuario, salt, hash, admin: !!admin };
  usuarios.push(novo);
  salvarUsuarios(usuarios);
  res.json({ ok: true, id: novo.id });
});

app.put('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
  const usuarios = lerUsuarios();
  const u = usuarios.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const { nome, senha, admin } = req.body || {};
  if (nome) u.nome = nome;
  if (typeof admin === 'boolean' && u.admin && admin === false) {
    if (usuarios.filter(x => x.admin).length <= 1) {
      return res.status(400).json({ error: 'Não é possível remover o último administrador.' });
    }
  }
  if (typeof admin === 'boolean') u.admin = admin;
  if (senha) {
    const cred = criarCredenciais(senha);
    u.salt = cred.salt;
    u.hash = cred.hash;
  }
  salvarUsuarios(usuarios);
  res.json({ ok: true });
});

app.delete('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
  const usuarios = lerUsuarios();
  const idx = usuarios.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (usuarios[idx].id === req.sessao.usuarioId) {
    return res.status(400).json({ error: 'Você não pode excluir o próprio usuário enquanto estiver logado.' });
  }
  if (usuarios[idx].admin && usuarios.filter(x => x.admin).length <= 1) {
    return res.status(400).json({ error: 'Não é possível excluir o último administrador.' });
  }
  usuarios.splice(idx, 1);
  salvarUsuarios(usuarios);
  res.json({ ok: true });
});

// Operador não pode excluir pedido nem histórico (concluir = mover para o histórico é permitido).
function removeuPedidoOuHistorico(atual, novo) {
  const idsAtuaisPedidos = new Set((atual.pedidos || []).map(p => p.id));
  const idsNovosPedidos = new Set((novo.pedidos || []).map(p => p.id));
  const idsNovosHist = new Set((novo.historico || []).map(p => p.id));
  const idsAtuaisHist = new Set((atual.historico || []).map(p => p.id));
  const removeuPedido = [...idsAtuaisPedidos].some(id => !idsNovosPedidos.has(id) && !idsNovosHist.has(id));
  const removeuHistorico = [...idsAtuaisHist].some(id => !idsNovosHist.has(id));
  return removeuPedido || removeuHistorico;
}

app.get('/api/data', requireAuth, (req, res) => {
  res.setHeader('x-volux-rev', String(REV));
  res.json(readData());
});

// Versão da tela: muda quando o arquivo do app é atualizado, para os aparelhos recarregarem sozinhos.
function versaoApp() {
  try { return String(fs.statSync(path.join(__dirname, 'public', 'separacao-pedidos_1.html')).mtimeMs); } catch { return ''; }
}

app.get('/api/rev', requireAuth, (req, res) => {
  res.json({ rev: REV, app: versaoApp() });
});

// Recebe só as mudanças feitas no aparelho e aplica sobre a versão atual dos dados.
app.post('/api/patch', requireAuth, (req, res) => {
  try {
    const { patch, baseRev } = req.body || {};
    if (!patch || typeof patch !== 'object') return res.status(400).json({ ok: false, error: 'Alteração inválida.' });
    const atual = readData() || {};
    const novo = VoluxSync.apply(VoluxSync.clone(atual), patch);
    if (!novo || typeof novo !== 'object' || Array.isArray(novo)) {
      return res.status(400).json({ ok: false, error: 'Alteração inválida.' });
    }
    if (!req.sessao.admin && removeuPedidoOuHistorico(atual, novo)) {
      return res.status(403).json({ ok: false, error: 'Apenas administradores podem excluir pedidos.' });
    }
    const prevRev = REV;
    writeData(novo);
    res.json({ ok: true, rev: REV, prevRev, outroAlterou: String(baseRev) !== String(prevRev) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Entrada/saída de estoque. A conta é feita aqui no servidor (e não no aparelho)
// para que duas baixas ao mesmo tempo não se sobrescrevam.
app.post('/api/estoque/movimento', requireAuth, (req, res) => {
  try {
    const { movs, origem, pedidoId } = req.body || {};
    if (!Array.isArray(movs) || !movs.length) return res.status(400).json({ ok: false, error: 'Nenhuma movimentação.' });
    const data = readData() || {};
    if (!data.estoque || typeof data.estoque !== 'object') data.estoque = { itens: [] };
    const est = data.estoque;
    if (!Array.isArray(est.itens)) est.itens = [];
    if (!Array.isArray(est.movimentos)) est.movimentos = [];
    if (pedidoId && est.movimentos.some(m => m.pedidoId === pedidoId && m.tipo === 'saida')) {
      return res.json({ ok: true, jaRegistrado: true, rev: REV, movimentos: [] });
    }
    const agora = new Date().toISOString();
    const por = req.sessao.nome || req.sessao.usuario || '';
    const feitos = [];
    for (const mv of movs) {
      const it = est.itens.find(i => i.id === (mv && mv.itemId));
      const qtd = Math.abs(Number(mv && mv.qtd));
      if (!it || !qtd || !['entrada', 'saida'].includes(mv.tipo)) continue;
      it.quantidade = (Number(it.quantidade) || 0) + (mv.tipo === 'entrada' ? qtd : -qtd);
      const reg = {
        id: crypto.randomBytes(6).toString('hex'), em: agora, por, tipo: mv.tipo,
        itemId: it.id, codigo: it.codigo, descricao: it.descricao, qtd, saldo: it.quantidade,
        origem: String(mv.obs || origem || '').slice(0, 200),
      };
      if (pedidoId) reg.pedidoId = String(pedidoId);
      est.movimentos.push(reg);
      feitos.push(reg);
    }
    if (!feitos.length) return res.status(400).json({ ok: false, error: 'Itens de estoque não encontrados.' });
    if (est.movimentos.length > 3000) est.movimentos = est.movimentos.slice(-3000);
    writeData(data);
    res.json({ ok: true, rev: REV, movimentos: feitos });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Rota antiga: gravava o arquivo inteiro e apagava o que outros aparelhos tinham salvo.
// Uma aba aberta com a versão antiga do sistema cai aqui — pede para recarregar.
app.post('/api/data', requireAuth, (req, res) => {
  res.status(409).json({ ok: false, error: 'O Volux foi atualizado. Recarregue a página (F5).' });
});

app.get('/api/backup-download', requireAuth, requireAdmin, (req, res) => {
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="volux-backup-${stamp}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(fs.readFileSync(DATA_FILE, 'utf8'));
});

app.get('/api/network-info', (req, res) => {
  const ip = getLocalIP();
  res.json({ ip, port: PORT, url: `http://${ip}:${PORT}` });
});

const PORT = Number(process.env.PORT) || 3000;
const localIP = getLocalIP();

const usuarioSeedCriado = seedUsuarioAdmin();

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n ╔══════════════════════════════════════════╗');
  console.log(' ║              VOLUX - ATIVO               ║');
  console.log(' ╠══════════════════════════════════════════╣');
  console.log(` ║  Local:  http://localhost:${PORT}           ║`);
  console.log(` ║  Rede:   http://${localIP}:${PORT}     ║`);
  console.log(' ╠══════════════════════════════════════════╣');
  console.log(' ║  Acesse pelo celular usando o IP da Rede ║');
  console.log(' ║  Pressione Ctrl+C para parar             ║');
  console.log(' ╚══════════════════════════════════════════╝\n');
  if (usuarioSeedCriado) {
    console.log(' ⚠ Primeiro usuário administrador criado:');
    console.log(`   Usuário: ${usuarioSeedCriado.usuario}`);
    console.log(`   Senha:   ${usuarioSeedCriado.senha}`);
    console.log('   Anote essa senha agora — ela não será exibida de novo.');
    console.log('   Depois de entrar, cadastre os demais funcionários em "Usuários".\n');
  }
});

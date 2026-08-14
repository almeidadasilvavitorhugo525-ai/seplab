const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 30;

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
app.use((req, res, next) => {
  if (req.path === '/data.json' || req.path === '/users.json') return res.status(404).end();
  next();
});
app.use(express.static(__dirname, { etag: false, lastModified: false }));

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
  const { usuario, senha } = req.body || {};
  const usuarios = lerUsuarios();
  const u = usuarios.find(x => x.usuario === usuario);
  if (!u || !senhaConfere(senha || '', u.salt, u.hash)) {
    return res.status(401).json({ ok: false, error: 'Usuário ou senha incorretos.' });
  }
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

app.get('/api/data', requireAuth, (req, res) => {
  res.json(readData());
});

app.post('/api/data', requireAuth, (req, res) => {
  try {
    if (!req.sessao.admin) {
      const atual = readData() || {};
      const idsAtuaisPedidos = new Set((atual.pedidos || []).map(p => p.id));
      const idsNovosPedidos = new Set((req.body.pedidos || []).map(p => p.id));
      const idsNovosHist = new Set((req.body.historico || []).map(p => p.id));
      const idsAtuaisHist = new Set((atual.historico || []).map(p => p.id));
      const removeuPedido = [...idsAtuaisPedidos].some(id => !idsNovosPedidos.has(id) && !idsNovosHist.has(id));
      const removeuHistorico = [...idsAtuaisHist].some(id => !idsNovosHist.has(id));
      if (removeuPedido || removeuHistorico) {
        return res.status(403).json({ ok: false, error: 'Apenas administradores podem excluir pedidos.' });
      }
    }
    writeData(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
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

const PORT = 3000;
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

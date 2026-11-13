// Banco de dados MariaDB/MySQL (XAMPP) do Volux.
//
// - `volux_estado` guarda o documento completo do sistema (é de onde o Volux lê ao ligar).
// - `pedidos`, `pedido_maquinas`, `pedido_itens`, `estoque` e `estoque_movimentos`
//   são tabelas legíveis, refeitas a cada gravação, para consultar no phpMyAdmin.
//
// Configuração (opcional) em db-config.json ou variáveis de ambiente:
//   VOLUX_DB_HOST, VOLUX_DB_PORT, VOLUX_DB_USER, VOLUX_DB_PASS, VOLUX_DB_NAME
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function lerConfig() {
  let arq = {};
  try { arq = JSON.parse(fs.readFileSync(path.join(__dirname, 'db-config.json'), 'utf8')); } catch {}
  const env = process.env;
  return {
    host: env.VOLUX_DB_HOST || arq.host || '127.0.0.1',
    port: Number(env.VOLUX_DB_PORT || arq.port || 3306),
    user: env.VOLUX_DB_USER || arq.user || 'root',
    password: env.VOLUX_DB_PASS ?? arq.password ?? '',
    database: env.VOLUX_DB_NAME || arq.database || 'volux',
  };
}

const TABELAS = [
  `CREATE TABLE IF NOT EXISTS volux_estado (
    id TINYINT PRIMARY KEY,
    dados LONGTEXT NOT NULL,
    atualizado_em DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(64) PRIMARY KEY,
    numero VARCHAR(64), cliente VARCHAR(255), destino VARCHAR(255), endereco VARCHAR(255),
    bairro VARCHAR(120), cep VARCHAR(20), telefone VARCHAR(60), data_envio VARCHAR(20),
    responsavel VARCHAR(120), situacao VARCHAR(20), progresso INT, total_itens INT, itens_separados INT,
    urgente TINYINT, criado_em DATETIME NULL, criado_por VARCHAR(120), concluido_em DATETIME NULL,
    concluido_por VARCHAR(120), nota_fiscal VARCHAR(60), volumes INT NULL, obs TEXT, obs_separacao TEXT,
    INDEX (numero), INDEX (situacao)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS pedido_maquinas (
    pedido_id VARCHAR(64), maquina_id VARCHAR(64), ordem INT, nome VARCHAR(255), modelo VARCHAR(120),
    total_itens INT, itens_separados INT,
    PRIMARY KEY (pedido_id, maquina_id), INDEX (modelo)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS pedido_itens (
    pedido_id VARCHAR(64), maquina_id VARCHAR(64), item_id VARCHAR(64), nome VARCHAR(255),
    categoria VARCHAR(120), qtd VARCHAR(40), separado TINYINT, separado_por VARCHAR(120),
    separado_em DATETIME NULL, serial VARCHAR(120),
    PRIMARY KEY (pedido_id, maquina_id, item_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS estoque (
    id VARCHAR(64) PRIMARY KEY, codigo VARCHAR(80), descricao VARCHAR(255), categoria VARCHAR(120),
    quantidade DECIMAL(12,2), minimo DECIMAL(12,2), local VARCHAR(40), INDEX (codigo)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS estoque_movimentos (
    id VARCHAR(64) PRIMARY KEY, em DATETIME NULL, por VARCHAR(120), tipo VARCHAR(20),
    item_id VARCHAR(64), codigo VARCHAR(80), descricao VARCHAR(255), qtd DECIMAL(12,2), saldo DECIMAL(12,2),
    origem VARCHAR(255), pedido_id VARCHAR(64), INDEX (item_id), INDEX (pedido_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let pool = null;
let ultimoErro = '';

async function conectar() {
  const cfg = lerConfig();
  const semBanco = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, connectTimeout: 4000 });
  await semBanco.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await semBanco.end();
  pool = mysql.createPool({ ...cfg, connectionLimit: 4, charset: 'utf8mb4', dateStrings: true });
  for (const sql of TABELAS) await pool.query(sql);
  return cfg;
}

async function lerEstado() {
  const [rows] = await pool.query('SELECT dados, UNIX_TIMESTAMP(atualizado_em) AS ts FROM volux_estado WHERE id = 1');
  return rows.length ? { dados: rows[0].dados, em: Number(rows[0].ts) * 1000 } : null;
}

// ---- conversões ----
const txt = (v, max = 255) => (v == null || v === '' ? null : String(v).slice(0, max));
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
function dataHora(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
const itensDoPedido = p => (Array.isArray(p.maquinas) ? p.maquinas.flatMap(m => m.itens || []) : (p.itens || []));

function linhas(data) {
  const ped = [], maq = [], its = [], est = [], mov = [];
  const add = (p, situacao) => {
    if (!p || !p.id) return;
    const todos = itensDoPedido(p);
    const feitos = todos.filter(i => i.checked).length;
    ped.push([
      txt(p.id, 64), txt(p.numero, 64), txt(p.cliente), txt(p.destino), txt(p.endereco), txt(p.bairro, 120),
      txt(p.cep, 20), txt(p.telefone, 60), txt(p.data, 20), txt(p.responsavel, 120), situacao,
      todos.length ? Math.round(feitos / todos.length * 100) : 0, todos.length, feitos,
      p.prioridade === 'urgente' ? 1 : 0, dataHora(p.criadoEm), txt(p.criadoPor, 120), dataHora(p.concluidoEm),
      txt(p.concluidoPor, 120), txt(p.notaFiscal, 60), num(p.volumes), txt(p.obs, 65000), txt(p.obsSeparacao, 65000),
    ]);
    const item = (i, mid) => its.push([
      txt(p.id, 64), txt(mid, 64), txt(i.id, 64), txt(i.nome), txt(i.categoria, 120), txt(i.qty, 40),
      i.checked ? 1 : 0, txt(i.por, 120), dataHora(i.em), txt(i.serial, 120),
    ]);
    if (Array.isArray(p.maquinas)) {
      p.maquinas.forEach((m, k) => {
        const mi = m.itens || [];
        maq.push([txt(p.id, 64), txt(m.id || 'm' + k, 64), k + 1, txt(m.nome), txt(m.modelo, 120), mi.length, mi.filter(i => i.checked).length]);
        mi.forEach(i => item(i, m.id || 'm' + k));
      });
    } else (p.itens || []).forEach(i => item(i, ''));
  };
  (data.pedidos || []).forEach(p => add(p, 'aberto'));
  (data.historico || []).forEach(p => add(p, 'historico'));
  const e = data.estoque || {};
  (e.itens || []).forEach(i => i && i.id && est.push([
    txt(i.id, 64), txt(i.codigo, 80), txt(i.descricao), txt(i.categoria, 120), num(i.quantidade), num(i.minimo), txt(i.local, 40),
  ]));
  (e.movimentos || []).forEach(m => m && m.id && mov.push([
    txt(m.id, 64), dataHora(m.em), txt(m.por, 120), txt(m.tipo, 20), txt(m.itemId, 64), txt(m.codigo, 80),
    txt(m.descricao), num(m.qtd), num(m.saldo), txt(m.origem), txt(m.pedidoId, 64),
  ]));
  return { ped, maq, its, est, mov };
}

async function inserir(conn, tabela, colunas, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const lote = rows.slice(i, i + 500);
    await conn.query(`INSERT IGNORE INTO ${tabela} (${colunas}) VALUES ?`, [lote]);
  }
}

async function gravarAgora(json) {
  const data = JSON.parse(json);
  const L = linhas(data);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('REPLACE INTO volux_estado (id, dados, atualizado_em) VALUES (1, ?, NOW())', [json]);
    for (const t of ['pedido_itens', 'pedido_maquinas', 'pedidos', 'estoque', 'estoque_movimentos']) await conn.query(`DELETE FROM ${t}`);
    await inserir(conn, 'pedidos', 'id,numero,cliente,destino,endereco,bairro,cep,telefone,data_envio,responsavel,situacao,progresso,total_itens,itens_separados,urgente,criado_em,criado_por,concluido_em,concluido_por,nota_fiscal,volumes,obs,obs_separacao', L.ped);
    await inserir(conn, 'pedido_maquinas', 'pedido_id,maquina_id,ordem,nome,modelo,total_itens,itens_separados', L.maq);
    await inserir(conn, 'pedido_itens', 'pedido_id,maquina_id,item_id,nome,categoria,qtd,separado,separado_por,separado_em,serial', L.its);
    await inserir(conn, 'estoque', 'id,codigo,descricao,categoria,quantidade,minimo,local', L.est);
    await inserir(conn, 'estoque_movimentos', 'id,em,por,tipo,item_id,codigo,descricao,qtd,saldo,origem,pedido_id', L.mov);
    await conn.commit();
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

// Fila: grava uma vez por vez; se chegarem várias mudanças seguidas, grava só a mais nova.
let pendente = null, gravando = false;
function gravar(json) {
  if (!pool) return;
  pendente = json;
  if (gravando) return;
  gravando = true;
  (async () => {
    while (pendente) {
      const atual = pendente; pendente = null;
      try {
        await gravarAgora(atual);
        if (ultimoErro) { console.log(' ✔ Banco de dados voltou a gravar.'); ultimoErro = ''; }
      } catch (e) {
        if (e.message !== ultimoErro) console.log(' ⚠ Não consegui gravar no banco de dados:', e.message, '(os dados continuam salvos no data.json)');
        ultimoErro = e.message;
        if (!pendente) pendente = atual;
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    gravando = false;
  })();
}

module.exports = { conectar, lerEstado, gravar, ativo: () => !!pool, ultimoErro: () => ultimoErro, lerConfig };

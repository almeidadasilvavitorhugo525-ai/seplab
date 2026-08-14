const fs = require('fs');
const path = require('path');

const MEU_DIR = __dirname;
const NOME_PACOTE = 'seplab-tooling';

function encontrarPendrive() {
  const letras = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  for (const letra of letras) {
    const candidato = `${letra}:\\seplab`;
    if (path.resolve(candidato).toLowerCase() === path.resolve(MEU_DIR).toLowerCase()) continue;
    try {
      const pkgPath = path.join(candidato, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name === NOME_PACOTE && fs.existsSync(path.join(candidato, 'data.json'))) {
        return candidato;
      }
    } catch {}
  }
  return null;
}

function backup(dataFile, sufixo) {
  try {
    const dir = path.join(path.dirname(dataFile), 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(dataFile, path.join(dir, `data-presync-${sufixo}-${stamp}.json`));
  } catch (e) {
    console.log('  (aviso: não consegui fazer backup de', dataFile, '-', e.message, ')');
  }
}

function mergeListasPorId(a, b, nomeCampo, conflitos) {
  const porId = new Map();
  (a || []).forEach(item => porId.set(item.id, item));
  (b || []).forEach(item => {
    if (!porId.has(item.id)) {
      porId.set(item.id, item);
    } else if (JSON.stringify(porId.get(item.id)) !== JSON.stringify(item)) {
      conflitos.push({ campo: nomeCampo, id: item.id, ref: porId.get(item.id).numero || porId.get(item.id).nome || porId.get(item.id).codigo || item.id });
    }
  });
  return [...porId.values()];
}

function mergeObjetoPorChave(a, b, nomeCampo, conflitos) {
  const resultado = { ...(a || {}) };
  Object.entries(b || {}).forEach(([chave, valor]) => {
    if (!(chave in resultado)) {
      resultado[chave] = valor;
    } else if (JSON.stringify(resultado[chave]) !== JSON.stringify(valor)) {
      conflitos.push({ campo: nomeCampo, id: chave });
    }
  });
  return resultado;
}

function mergeProdutosImportados(a, b) {
  const porNome = new Map();
  (a || []).forEach(p => porNome.set(p.nome, p.qtd));
  (b || []).forEach(p => {
    const atual = porNome.get(p.nome);
    if (atual === undefined) porNome.set(p.nome, p.qtd);
    else porNome.set(p.nome, Math.max(atual || 0, p.qtd || 0));
  });
  return [...porNome.entries()].map(([nome, qtd]) => ({ nome, qtd }));
}

console.log('=== Sincronização Volux: computador <-> pen drive ===\n');

const pendriveDir = process.argv[2] || encontrarPendrive();
if (!pendriveDir) {
  console.log('Pen drive não encontrado. Conecte o pen drive "Vitor Disc" e tente de novo.');
  console.log('(Se a letra da unidade for diferente de D-K, rode: node sync_dados.js <LETRA>:\\seplab)');
  process.exit(1);
}
console.log('Pen drive encontrado em:', pendriveDir, '\n');

const meuDataFile = path.join(MEU_DIR, 'data.json');
const pendriveDataFile = path.join(pendriveDir, 'data.json');

const local = JSON.parse(fs.readFileSync(meuDataFile, 'utf8'));
const remoto = JSON.parse(fs.readFileSync(pendriveDataFile, 'utf8'));

backup(meuDataFile, 'computador');
backup(pendriveDataFile, 'pendrive');

const conflitos = [];
const pedidos = mergeListasPorId(local.pedidos, remoto.pedidos, 'pedidos (ativos)', conflitos);
const historico = mergeListasPorId(local.historico, remoto.historico, 'histórico', conflitos);
const itensPadrao = mergeListasPorId(local.itensPadrao, remoto.itensPadrao, 'itens padrão', conflitos);
const estoqueItens = mergeListasPorId((local.estoque || {}).itens, (remoto.estoque || {}).itens, 'estoque', conflitos);
const caixas = mergeListasPorId((local.embalagens || {}).caixas, (remoto.embalagens || {}).caixas, 'caixas', conflitos);
const pallets = mergeListasPorId((local.embalagens || {}).pallets, (remoto.embalagens || {}).pallets, 'pallets', conflitos);
const catalogoItens = mergeObjetoPorChave(local.catalogoItens, remoto.catalogoItens, 'catálogo (peso/medida)', conflitos);
const produtosImportados = mergeProdutosImportados(local.produtosImportados, remoto.produtosImportados);

const mesclado = {
  pedidos, historico, itensPadrao,
  estoque: { itens: estoqueItens },
  catalogoItens,
  embalagens: { caixas, pallets },
  produtosImportados
};

fs.writeFileSync(meuDataFile, JSON.stringify(mesclado, null, 2), 'utf8');
fs.writeFileSync(pendriveDataFile, JSON.stringify(mesclado, null, 2), 'utf8');

console.log('Resultado:');
console.log('  Pedidos ativos:', pedidos.length);
console.log('  Histórico:', historico.length);
console.log('  Itens de estoque:', estoqueItens.length);
console.log('  Caixas/Pallets:', caixas.length + pallets.length);
console.log('  Itens no catálogo (peso/medida):', Object.keys(catalogoItens).length);
console.log('  Produtos importados (relatório):', produtosImportados.length);

if (conflitos.length) {
  console.log('\n⚠ ATENÇÃO: os itens abaixo foram alterados nos DOIS lugares de forma diferente.');
  console.log('  Mantive a versão do computador para eles — confira manualmente se está tudo certo:');
  conflitos.forEach(c => console.log(`   - ${c.campo}: ${c.ref || c.id}`));
} else {
  console.log('\nNenhum conflito encontrado — tudo mesclado sem sobreposição.');
}

console.log('\nComputador e pen drive agora têm os mesmos dados. Backups do estado anterior ficaram nas pastas "backups/" de cada um.');

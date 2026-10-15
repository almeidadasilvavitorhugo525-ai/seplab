// Volux — sincronização entre aparelhos.
// Em vez de enviar o data.json inteiro (o que apagava o trabalho de quem salvou antes),
// cada aparelho envia só o que mudou (um "patch") e o servidor aplica sobre a versão atual.
// Listas de objetos com `id` (pedidos, máquinas, itens...) são mescladas item a item,
// então duas pessoas marcando itens diferentes do mesmo pedido não se atrapalham.
// Usado no navegador (window.VoluxSync) e no servidor (require('./public/sync.js')).
(function (root) {
  const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function igual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // Lista "com chave": todos os elementos são objetos com id único.
  function comChave(a) {
    if (!Array.isArray(a)) return false;
    const vistos = new Set();
    for (const x of a) {
      if (!isObj(x) || (typeof x.id !== 'string' && typeof x.id !== 'number')) return false;
      const k = String(x.id);
      if (vistos.has(k)) return false;
      vistos.add(k);
    }
    return true;
  }

  // Retorna o patch que transforma `a` em `b`, ou null se forem iguais.
  function diff(a, b) {
    if (igual(a, b)) return null;
    if (isObj(a) && isObj(b)) {
      const k = {};
      for (const key of Object.keys(b)) {
        if (!(key in a)) k[key] = { t: 'set', v: clone(b[key]) };
        else { const d = diff(a[key], b[key]); if (d) k[key] = d; }
      }
      for (const key of Object.keys(a)) if (!(key in b)) k[key] = { t: 'del' };
      return { t: 'obj', k };
    }
    if (comChave(a) && comChave(b)) {
      const mapaA = new Map(a.map(x => [String(x.id), x]));
      const idsB = new Set(b.map(x => String(x.id)));
      const del = a.filter(x => !idsB.has(String(x.id))).map(x => String(x.id));
      const ins = [], k = {};
      b.forEach((x, i) => {
        const id = String(x.id);
        if (!mapaA.has(id)) ins.push({ after: i > 0 ? String(b[i - 1].id) : null, v: clone(x) });
        else { const d = diff(mapaA.get(id), x); if (d) k[id] = d; }
      });
      return { t: 'arr', del, ins, k };
    }
    return { t: 'set', v: clone(b) };
  }

  // Aplica o patch sobre `alvo` (modifica e retorna o resultado).
  // Mudanças em algo que outra pessoa já excluiu são ignoradas.
  function apply(alvo, p) {
    if (!p) return alvo;
    if (p.t === 'set') return clone(p.v);
    if (p.t === 'obj') {
      const o = isObj(alvo) ? alvo : {};
      for (const key of Object.keys(p.k || {})) {
        if (CHAVES_PROIBIDAS.has(key)) continue;
        const sp = p.k[key];
        if (sp && sp.t === 'del') delete o[key];
        else o[key] = apply(o[key], sp);
      }
      return o;
    }
    if (p.t === 'arr') {
      const del = new Set((p.del || []).map(String));
      let arr = Array.isArray(alvo) ? alvo.filter(x => !(isObj(x) && del.has(String(x.id)))) : [];
      const k = p.k || {};
      for (let i = 0; i < arr.length; i++) {
        if (!isObj(arr[i])) continue;
        const id = String(arr[i].id);
        if (Object.prototype.hasOwnProperty.call(k, id)) arr[i] = apply(arr[i], k[id]);
      }
      for (const ins of p.ins || []) {
        if (!isObj(ins.v)) continue;
        const id = String(ins.v.id);
        const existente = arr.findIndex(x => isObj(x) && String(x.id) === id);
        if (existente >= 0) { arr[existente] = clone(ins.v); continue; }
        let pos = 0;
        if (ins.after !== null && ins.after !== undefined) {
          const idx = arr.findIndex(x => isObj(x) && String(x.id) === String(ins.after));
          pos = idx >= 0 ? idx + 1 : arr.length;
        }
        arr.splice(pos, 0, clone(ins.v));
      }
      return arr;
    }
    return alvo;
  }

  const api = { diff, apply, clone, igual };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VoluxSync = api;
})(typeof window !== 'undefined' ? window : this);

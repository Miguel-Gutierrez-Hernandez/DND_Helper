const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
const pickN = (arr, n) => {
  const a = [...arr];
  const out = [];
  const limit = Math.min(n, a.length);
  for (let i = 0; i < limit; i++) out.push(a.splice(rnd(a.length), 1)[0]);
  return out;
};

const abilityMod = score => Math.floor((score - 10) / 2);
const modStr = m => (m >= 0 ? `+${m}` : `${m}`);
const profBonus = level => Math.floor((level - 1) / 4) + 2;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function roll4d6() {
  const r = [rnd(6), rnd(6), rnd(6), rnd(6)].map(n => n + 1);
  r.sort((a, b) => a - b);
  r.shift();
  return r.reduce((a, b) => a + b, 0);
}

function rollStatSet() {
  return Array.from({ length: 6 }, roll4d6);
}

const STANDARDARRAY = [15, 14, 13, 12, 10, 8];

function assignStats(values, priorityOrder) {
  const sorted = [...values].sort((a, b) => b - a);
  const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const remaining = abilities.filter(a => !priorityOrder.includes(a));
  const order = [...priorityOrder, ...remaining];
  const result = {};
  order.forEach((ab, i) => (result[ab] = sorted[i]));
  return result;
}

function parseCrInput(str) {
  str = String(str || '').trim();
  if (!str) return null;
  if (str.includes('/')) {
    const [a, b] = str.split('/').map(Number);
    return a / b;
  }
  const n = Number(str);
  return Number.isNaN(n) ? null : n;
}

function crRowByNumber(n) {
  let best = CRTABLE[0];
  for (const row of CRTABLE) {
    if (row.crn <= n) best = row;
    else break;
  }
  return best;
}

function crRowById(id) {
  return CRTABLE.find(r => r.cr === id) || CRTABLE[4];
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fillSelect(el, items, getVal, getLabel, includeRandomFirst = false, randomLabel = 'Aleatorio') {
  el.innerHTML = '';
  if (includeRandomFirst) {
    const o = document.createElement('option');
    o.value = randomLabel;
    o.textContent = randomLabel;
    el.appendChild(o);
  }
  items.forEach(it => {
    const o = document.createElement('option');
    o.value = getVal(it);
    o.textContent = getLabel(it);
    el.appendChild(o);
  });
}
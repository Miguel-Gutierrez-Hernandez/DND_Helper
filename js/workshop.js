/* ================= TALLER: contenido personalizado ================= */

/* -------- helpers de fusión con el contenido base -------- */
function getMonsterById(id) {
  const custom = (window.CUSTOMMONSTERSCACHE || []).find(m => m.id === id);
  if (custom) return custom;
  return MONSTERS.find(m => m.id === id);
}

function getAllMonstersMerged() {
  return [...MONSTERS, ...(window.CUSTOMMONSTERSCACHE || [])];
}

/* combina SPELL_POOL[nivel] con los hechizos personalizados de ese mismo nivel */
function getSpellPoolForLevel(lvl) {
  const base = SPELL_POOL[lvl] || [];
  const custom = (window.CUSTOMSPELLSCACHE || []).filter(s => Number(s.level) === Number(lvl));
  return [...base, ...custom];
}

/* lista plana de todos los hechizos (base + personalizados) para el buscador */
function getAllSpellsFlatMerged() {
  const base = Object.entries(SPELL_POOL).flatMap(([lvl, arr]) => arr.map(s => ({ ...s, level: Number(lvl) })));
  const custom = (window.CUSTOMSPELLSCACHE || []).map(s => ({ ...s, level: Number(s.level), custom: true }));
  return [...base, ...custom];
}

/* -------- monstruo personalizado -------- */
function populateWorkshopCrSelect() {
  const sel = document.getElementById('wm-cr');
  if (!sel) return;
  sel.innerHTML = CRTABLE.map(r => `<option value="${r.cr}">CR ${r.cr} (XP ${r.xp})</option>`).join('');
}

async function addCustomMonster() {
  const name = document.getElementById('wm-name').value.trim();
  const type = document.getElementById('wm-type').value.trim() || 'Monstruosidad personalizada';
  const cr = document.getElementById('wm-cr').value;
  const attackName = document.getElementById('wm-attackname').value.trim() || 'Ataque';
  const traits = document.getElementById('wm-traits').value.split('\n').map(t => t.trim()).filter(Boolean);
  if (!name) { alert('Ponle un nombre al monstruo.'); return; }

  let manual = null;
  if (document.getElementById('wm-manual-toggle').checked) {
    const ac = Number(document.getElementById('wm-ac').value);
    const hp = Number(document.getElementById('wm-hp').value);
    const attackBonus = Number(document.getElementById('wm-atkbonus').value);
    const dmgPerRound = Number(document.getElementById('wm-dmg').value);
    const saveDC = Number(document.getElementById('wm-dc').value);
    manual = {
      ac: ac || null, hp: hp || null, attackBonus: (document.getElementById('wm-atkbonus').value !== '' ? attackBonus : null),
      dmgPerRound: dmgPerRound || null, saveDC: saveDC || null,
    };
  }

  const data = {
    id: 'cmon-' + Date.now() + '-' + rnd(100000),
    savedAt: Date.now(),
    name, type, cr, attackName, traits: traits.length ? traits : ['Sin rasgos especiales'],
    manual, custom: true,
  };
  await saveCustomMonster(data);
  await refreshCustomMonstersCache();
  await populateMonsterSelect();
  refreshWorkshopLists();

  document.getElementById('wm-name').value = '';
  document.getElementById('wm-type').value = '';
  document.getElementById('wm-attackname').value = '';
  document.getElementById('wm-traits').value = '';
  document.getElementById('wm-manual-toggle').checked = false;
  document.getElementById('wm-manual-fields').style.display = 'none';
}

/* -------- objeto mágico personalizado -------- */
async function addCustomItem() {
  const name = document.getElementById('wi-name').value.trim();
  const type = document.getElementById('wi-type').value;
  const rarity = document.getElementById('wi-rarity').value;
  const bonus = document.getElementById('wi-bonus').value.trim();
  const ability = document.getElementById('wi-ability').value.trim();
  if (!name) { alert('Ponle un nombre al objeto.'); return; }
  if (!ability) { alert('Describe su habilidad especial.'); return; }

  const data = {
    id: 'citem-' + Date.now() + '-' + rnd(100000),
    savedAt: Date.now(),
    name, type, rarity, bonus, ability, custom: true,
  };
  await saveCustomItem(data);
  await refreshCustomItemsCache();
  refreshWorkshopLists();

  document.getElementById('wi-name').value = '';
  document.getElementById('wi-bonus').value = '';
  document.getElementById('wi-ability').value = '';
}

/* -------- hechizo personalizado -------- */
async function addCustomSpell() {
  const name = document.getElementById('ws-name').value.trim();
  const level = Number(document.getElementById('ws-level').value);
  const desc = document.getElementById('ws-desc').value.trim();
  const range = document.getElementById('ws-range').value.trim() || 'No especificado';
  const cast = document.getElementById('ws-cast').value.trim() || '1 acción';
  const duration = document.getElementById('ws-duration').value.trim() || 'Instantáneo';
  const damage = document.getElementById('ws-damage').value.trim() || null;
  const concentration = document.getElementById('ws-concentration').checked;
  if (!name) { alert('Ponle un nombre al hechizo.'); return; }
  if (!desc) { alert('Describe qué hace.'); return; }

  const data = {
    id: 'cspell-' + Date.now() + '-' + rnd(100000),
    savedAt: Date.now(),
    name, level, desc, range, cast, duration, damage, concentration, custom: true,
  };
  await saveCustomSpell(data);
  await refreshCustomSpellsCache();
  refreshWorkshopLists();
  if (typeof filterSpells === 'function') filterSpells();

  document.getElementById('ws-name').value = '';
  document.getElementById('ws-desc').value = '';
  document.getElementById('ws-range').value = '';
  document.getElementById('ws-cast').value = '';
  document.getElementById('ws-duration').value = '';
  document.getElementById('ws-damage').value = '';
  document.getElementById('ws-concentration').checked = false;
}

/* -------- listas del taller -------- */
const RARITY_ES_WORKSHOP = { common: 'Común', uncommon: 'Poco común', rare: 'Raro', veryrare: 'Muy raro', legendary: 'Legendario' };

async function refreshWorkshopLists() {
  const [monsters, items, spells] = await Promise.all([listCustomMonsters(), listCustomItems(), listCustomSpells()]);
  window.CUSTOMMONSTERSCACHE = monsters;
  window.CUSTOMITEMSCACHE = items;
  window.CUSTOMSPELLSCACHE = spells;

  const mEl = document.getElementById('workshop-monster-list');
  mEl.innerHTML = monsters.length ? monsters.map(m => `
    <div class="saved-card">
      <div class="saved-card-main">
        <div class="saved-card-name">${m.name}</div>
        <div class="saved-card-sub">${m.type} · CR ${m.cr}${m.manual ? ' · estadísticas propias' : ''}</div>
      </div>
      <div class="saved-card-actions">
        <button class="ghost-btn light" onclick="deleteCustomMonster('${m.id}').then(async()=>{await refreshCustomMonstersCache();await populateMonsterSelect();refreshWorkshopLists();})">Eliminar</button>
      </div>
    </div>`).join('') : '<div class="empty-state">Ningún monstruo personalizado todavía.</div>';

  const iEl = document.getElementById('workshop-item-list');
  iEl.innerHTML = items.length ? items.map(it => `
    <div class="saved-card">
      <div class="saved-card-main">
        <div class="saved-card-name">${it.name}</div>
        <div class="saved-card-sub">${it.type} · ${RARITY_ES_WORKSHOP[it.rarity] || it.rarity}${it.bonus ? ' · ' + it.bonus : ''}</div>
      </div>
      <div class="saved-card-actions">
        <button class="ghost-btn light" onclick="deleteCustomItem('${it.id}').then(async()=>{await refreshCustomItemsCache();refreshWorkshopLists();})">Eliminar</button>
      </div>
    </div>`).join('') : '<div class="empty-state">Ningún objeto personalizado todavía.</div>';

  const sEl = document.getElementById('workshop-spell-list');
  sEl.innerHTML = spells.length ? spells.map(s => `
    <div class="saved-card">
      <div class="saved-card-main">
        <div class="saved-card-name">${s.name}</div>
        <div class="saved-card-sub">Nivel ${s.level}${s.range ? ' · ' + s.range : ''}${s.concentration ? ' · Concentración' : ''}${s.damage ? ' · ' + s.damage : ''}</div>
      </div>
      <div class="saved-card-actions">
        <button class="ghost-btn light" onclick="deleteCustomSpell('${s.id}').then(async()=>{await refreshCustomSpellsCache();refreshWorkshopLists();if(typeof filterSpells==='function')filterSpells();})">Eliminar</button>
      </div>
    </div>`).join('') : '<div class="empty-state">Ningún hechizo personalizado todavía.</div>';
}

/* -------- adjuntar objetos del catálogo a PNJ / PJ -------- */
function renderItemPicker(pickerId, addFnName) {
  const catalog = window.CUSTOMITEMSCACHE || [];
  if (!catalog.length) {
    return `<div class="note-box">Aún no tienes objetos en el Taller. Crea uno en la pestaña «Taller» para poder adjuntarlo aquí.</div>`;
  }
  const options = catalog.map(it => `<option value="${it.id}">${it.name} · ${RARITY_ES_WORKSHOP[it.rarity] || it.rarity}</option>`).join('');
  return `
    <div class="row2" style="align-items:end;">
      <div class="field" style="margin-bottom:0;">
        <label>Objeto del catálogo</label>
        <select id="${pickerId}">${options}</select>
      </div>
      <button class="ghost-btn" style="height:38px;" onclick="${addFnName}(document.getElementById('${pickerId}').value)">+ Añadir objeto</button>
    </div>`;
}

/* -------- bonos mecánicos de los objetos -------- */
/* extrae el primer número con signo del texto de "bonus" (p.ej. "+1 a impactar y dañar" -> 1) */
function parseItemBonusNumber(str) {
  if (!str) return 0;
  const m = String(str).match(/[+-]\s*\d+/);
  if (!m) return 0;
  return parseInt(m[0].replace(/\s+/g, ''), 10);
}

/* suma los bonos de todos los objetos adjuntos, repartidos por tipo:
   Arma -> ataque y daño | Armadura/Escudo -> CA | Objeto maravilloso -> sin efecto numérico automático */
function computeItemBonuses(items) {
  const result = { ac: 0, atk: 0, dmg: 0 };
  (items || []).forEach(it => {
    const n = parseItemBonusNumber(it.bonus);
    if (!n) return;
    if (it.type === 'Armadura' || it.type === 'Escudo') result.ac += n;
    else if (it.type === 'Arma') { result.atk += n; result.dmg += n; }
  });
  return result;
}

/* CA final ya con el bono de objetos aplicado, con desglose visual si hay bono */
function acWithItemsLabel(baseAc, items) {
  const bonus = computeItemBonuses(items);
  const total = baseAc + bonus.ac;
  if (!bonus.ac) return `${total}`;
  return `${total} <span style="opacity:.6;font-weight:400;">(${baseAc} ${bonus.ac > 0 ? '+' : ''}${bonus.ac} por objetos)</span>`;
}

/* línea-resumen de modificadores por objetos (ataque/daño), vacía si no hay ninguno */
function itemBonusSummaryLine(items) {
  const b = computeItemBonuses(items);
  const parts = [];
  if (b.atk) parts.push(`Ataque ${b.atk > 0 ? '+' : ''}${b.atk}`);
  if (b.dmg) parts.push(`Daño ${b.dmg > 0 ? '+' : ''}${b.dmg}`);
  if (!parts.length) return '';
  return `<div class="note-box">Modificadores por objetos: ${parts.join(' · ')}</div>`;
}

function renderAttachedItems(items, removeFnName) {
  if (!items || !items.length) return '<div class="note-box">Sin objetos adjuntos todavía.</div>';
  return `<ul class="clean">${items.map((it, idx) => `
    <li><b>${it.name}</b> (${it.type} · ${RARITY_ES_WORKSHOP[it.rarity] || it.rarity}${it.bonus ? ' · ' + it.bonus : ''}) — ${it.ability}
      <button class="ghost-btn light" style="margin-left:8px;padding:2px 8px;" onclick="${removeFnName}(${idx})">Quitar</button>
    </li>`).join('')}</ul>`;
}

function renderCurrentNPC() {
  if (!lastNPCData) return;
  const opts = lastNPCData.savedAt ? { hideSave: true, showDelete: true } : {};
  document.getElementById('npc-result').innerHTML = npcDataToHtml(lastNPCData, opts);
}
async function addItemToNPC(itemId) {
  if (!lastNPCData || !itemId) return;
  const item = (window.CUSTOMITEMSCACHE || []).find(i => i.id === itemId);
  if (!item) return;
  if (!lastNPCData.items) lastNPCData.items = [];
  lastNPCData.items.push(item);
  if (lastNPCData.savedAt) { lastNPCData.savedAt = Date.now(); await saveNPCData(lastNPCData); refreshSavedList(); }
  renderCurrentNPC();
}
async function removeItemFromNPC(idx) {
  if (!lastNPCData || !lastNPCData.items) return;
  lastNPCData.items.splice(idx, 1);
  if (lastNPCData.savedAt) { lastNPCData.savedAt = Date.now(); await saveNPCData(lastNPCData); refreshSavedList(); }
  renderCurrentNPC();
}

function renderCurrentPC() {
  if (!lastPCData) return;
  const opts = lastPCData.savedAt ? { hideSave: true, showDelete: true } : {};
  document.getElementById('pc-result').innerHTML = pcDataToHtml(lastPCData, opts);
}
async function addItemToPC(itemId) {
  if (!lastPCData || !itemId) return;
  const item = (window.CUSTOMITEMSCACHE || []).find(i => i.id === itemId);
  if (!item) return;
  if (!lastPCData.items) lastPCData.items = [];
  lastPCData.items.push(item);
  if (lastPCData.savedAt) { lastPCData.savedAt = Date.now(); await savePCData(lastPCData); refreshSavedList(); }
  renderCurrentPC();
}
async function removeItemFromPC(idx) {
  if (!lastPCData || !lastPCData.items) return;
  lastPCData.items.splice(idx, 1);
  if (lastPCData.savedAt) { lastPCData.savedAt = Date.now(); await savePCData(lastPCData); refreshSavedList(); }
  renderCurrentPC();
}

function initWorkshopUI() {
  populateWorkshopCrSelect();

  document.getElementById('wm-manual-toggle').addEventListener('change', (e) => {
    document.getElementById('wm-manual-fields').style.display = e.target.checked ? 'grid' : 'none';
  });

  document.getElementById('wm-add').addEventListener('click', addCustomMonster);
  document.getElementById('wi-add').addEventListener('click', addCustomItem);
  document.getElementById('ws-add').addEventListener('click', addCustomSpell);

  refreshWorkshopLists();
}
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
  if (!name) { alert('Ponle un nombre al hechizo.'); return; }
  if (!desc) { alert('Describe qué hace.'); return; }

  const data = {
    id: 'cspell-' + Date.now() + '-' + rnd(100000),
    savedAt: Date.now(),
    name, level, desc, custom: true,
  };
  await saveCustomSpell(data);
  await refreshCustomSpellsCache();
  refreshWorkshopLists();
  if (typeof filterSpells === 'function') filterSpells();

  document.getElementById('ws-name').value = '';
  document.getElementById('ws-desc').value = '';
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
        <div class="saved-card-sub">Nivel ${s.level}</div>
      </div>
      <div class="saved-card-actions">
        <button class="ghost-btn light" onclick="deleteCustomSpell('${s.id}').then(async()=>{await refreshCustomSpellsCache();refreshWorkshopLists();if(typeof filterSpells==='function')filterSpells();})">Eliminar</button>
      </div>
    </div>`).join('') : '<div class="empty-state">Ningún hechizo personalizado todavía.</div>';
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
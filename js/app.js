function backgroundById(id) {
  return BACKGROUNDS.find(b => b.id === id);
}

function activateTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
}

function refreshSavedList() {
  Promise.all([listSavedNPCs(), listSavedPCs()]).then(([npcItems, pcItems]) => {
    const badgeEl = document.getElementById('saved-backend-badge');
    if (badgeEl) {
      badgeEl.textContent = storageBackend === 'storage'
        ? 'Guardado permanente en tu navegador'
        : 'Guardado solo en esta sesión';
    }

    const npcEl = document.getElementById('saved-list-npc');
    npcEl.innerHTML = npcItems.length
      ? npcItems.map(n => `
        <div class="saved-card">
          <div class="saved-card-main">
            <div class="saved-card-name">${n.name}</div>
            <div class="saved-card-sub">${n.raceName} ${n.jobName} · Nivel ${n.level}</div>
          </div>
          <div class="saved-card-actions">
            <button class="ghost-btn light" onclick="viewSavedNPC('${n.id}')">Ver</button>
            <button class="ghost-btn light" onclick="deleteSavedNPC('${n.id}').then(refreshSavedList)">Eliminar</button>
          </div>
        </div>
      `).join('')
      : `<div class="empty-state">Ningún PNJ guardado todavía.</div>`;

    const pcEl = document.getElementById('saved-list-pc');
    pcEl.innerHTML = pcItems.length
      ? pcItems.map(n => `
        <div class="saved-card">
          <div class="saved-card-main">
            <div class="saved-card-name">${n.name}</div>
            <div class="saved-card-sub">${n.speciesName} ${n.className}${n.subclassName ? ` · ${n.subclassName}` : ''} · Nivel ${n.level}</div>
          </div>
          <div class="saved-card-actions">
            <button class="ghost-btn light" onclick="viewSavedPC('${n.id}')">Ver</button>
            <button class="ghost-btn light" onclick="deleteSavedPC('${n.id}').then(refreshSavedList)">Eliminar</button>
          </div>
        </div>
      `).join('')
      : `<div class="empty-state">Ningún personaje guardado todavía.</div>`;
  });
}

async function exportAllData() {
  const [npc, pc, cmonster, citem, cspell] = await Promise.all([
    listSavedNPCs(),
    listSavedPCs(),
    listCustomMonsters(),
    listCustomItems(),
    listCustomSpells()
  ]);
  downloadJSON('cuaderno-del-guardian-datos.json', { npc, pc, cmonster, citem, cspell });
}

async function importAllDataFromFile(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    alert('El archivo no es un JSON válido.');
    return;
  }

  const namespaces = ['npc', 'pc', 'cmonster', 'citem', 'cspell'];
  for (const ns of namespaces) {
    const arr = data[ns];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (!it.id) it.id = `${ns}-${Date.now()}-${rnd(100000)}`;
        await storeSave(ns, it);
      }
    }
  }

  await Promise.all([refreshCustomSpellsCache(), refreshCustomMonstersCache(), refreshCustomItemsCache()]);
  await populateMonsterSelect();
  refreshSavedList();
  if (document.getElementById('workshop-monster-list')) refreshWorkshopLists();
  if (typeof filterSpells === 'function') filterSpells();
}

async function populateMonsterSelect() {
  const all = getAllMonstersMerged();
  fillSelect(document.getElementById('mon-base'), all, m => m.id, m => `${m.name} · CR ${m.cr}${m.custom ? ' (personalizado)' : ''}`);
}

async function initUI() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  fillSelect(document.getElementById('npc-race'), SPECIES, s => s.id, s => s.name);
  fillSelect(document.getElementById('npc-job'), OFICIOS, o => o.id, o => o.name);
  fillSelect(document.getElementById('pc-race'), SPECIES, s => s.id, s => s.name, true);
  fillSelect(document.getElementById('pc-background'), BACKGROUNDS, b => b.id, b => b.name, true);
  fillSelect(document.getElementById('pc-class'), CLASSES, c => c.id, c => c.name, true);

  await Promise.all([refreshCustomMonstersCache(), refreshCustomItemsCache(), refreshCustomSpellsCache()]);
  await populateMonsterSelect();

  document.getElementById('npc-generate').addEventListener('click', () => {
    generateNPC(
      document.getElementById('npc-race').value,
      document.getElementById('npc-job').value,
      Number(document.getElementById('npc-partylevel').value || 3)
    );
  });

  document.getElementById('pc-class').addEventListener('change', refreshSubclassOptions);

  document.querySelectorAll('input[name="statmethod"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('pc-manual-stats').style.display =
        document.querySelector('input[name="statmethod"]:checked').value === 'manual' ? 'grid' : 'none';
    });
  });

  document.getElementById('pc-generate').addEventListener('click', () => {
    const levelRaw = document.getElementById('pc-level').value;
    const level = levelRaw ? Math.min(20, Math.max(1, Number(levelRaw))) : 1;
    const statMethod = document.querySelector('input[name="statmethod"]:checked').value;
    const manualStats = statMethod === 'manual'
      ? ['m-str', 'm-dex', 'm-con', 'm-int', 'm-wis', 'm-cha'].map(id => Number(document.getElementById(id).value || 10))
      : null;

    generatePC({
      level,
      race: document.getElementById('pc-race').value,
      background: document.getElementById('pc-background').value,
      klass: document.getElementById('pc-class').value,
      subclass: document.getElementById('pc-subclass').value,
      statMethod,
      manualStats
    });
  });

  document.querySelectorAll('input[name="monmode"]').forEach(r => r.addEventListener('change', refreshMonsterModeUI));
  document.querySelectorAll('input[name="scalemethod"]').forEach(r => r.addEventListener('change', refreshMonsterScaleUI));

  document.getElementById('mon-generate').addEventListener('click', () => {
    generateMonster({
      mode: document.querySelector('input[name="monmode"]:checked').value,
      scaleMethod: document.querySelector('input[name="scalemethod"]:checked').value,
      players: Number(document.getElementById('mon-players').value || 4),
      level: Number(document.getElementById('mon-level').value || 5),
      difficulty: document.getElementById('mon-difficulty').value,
      targetCr: document.getElementById('mon-target-cr').value,
      baseId: document.getElementById('mon-base').value
    });
  });

  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importAllDataFromFile(file);
  });

  filterSpells();
  refreshSubclassOptions();
  refreshMonsterModeUI();
  refreshSavedList();
  initWorkshopUI();
}

function refreshSubclassOptions() {
  const classSelect = document.getElementById('pc-class');
  const subSelect = document.getElementById('pc-subclass');
  const classId = classSelect.value;
  const klass = CLASSES.find(c => c.id === classId);

  subSelect.innerHTML = '<option value="">Aleatoria</option>';

  const subclasses = klass ? klass.subclasses : [...new Set(CLASSES.flatMap(c => c.subclasses))];
  subclasses.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    subSelect.appendChild(opt);
  });
}

function filterSpells() {
  const input = document.getElementById('spell-search').value.toLowerCase();
  const listEl = document.getElementById('spell-list');
  
  // Aplanamos todos los hechizos de todos los niveles (base + personalizados) en un solo array
  const allSpells = getAllSpellsFlatMerged();
  
  const filtered = allSpells.filter(s => 
    s.name.toLowerCase().includes(input) || 
    s.desc.toLowerCase().includes(input)
  );

  listEl.innerHTML = filtered.length > 0 
    ? filtered.map(s => `
        <div class="spell-card">
          <div class="spell-name">${s.name} <span style="font-weight:400;font-size:11px;opacity:.65;">· Nv${s.level}${s.custom ? ' · personalizado' : ''}</span></div>
          <div class="spell-desc">${s.desc}</div>
        </div>
      `).join('')
    : '<div class="empty-state">No se encontraron hechizos.</div>';
}

document.addEventListener('DOMContentLoaded', initUI);
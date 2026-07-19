let lastPCData = null;

function spellcasterInfo(klass, level) {
  if (!klass.caster) return null;

  const info = {
    ability: klass.casterAbility,
    type: klass.casterType
  };

  if (klass.caster === 'full') {
    info.slots = FULLCASTERSLOTS[level];
    info.maxSpellLevel = info.slots.reduce((m, v, i) => (v > 0 ? i + 1 : m), 0);
  } else if (klass.caster === 'half') {
    info.slots = HALFCASTERSLOTS[level];
    info.maxSpellLevel = info.slots.reduce((m, v, i) => (v > 0 ? i + 1 : m), 0);
  } else if (klass.caster === 'pact') {
    const p = PACTSLOTS[level];
    info.pactSlots = p[0];
    info.pactLevel = p[1];
    info.maxSpellLevel = p[1];
    info.cantrips = level < 4 ? 2 : level < 10 ? 3 : 4;
  }

  return info;
}

function pickSpellsForCaster(info, level) {
  if (!info) return null;
  const cantrips = pickN(getSpellPoolForLevel(0), info.cantrips || 3).map(s => s.name);
  const known = [];
  const maxLvl = info.maxSpellLevel || 1;
  const numKnownIsh = info.type === 'known' ? Math.min(2 + level, 15) : Math.min(2 + level, 15);
  const spellsSet = new Set();

  while (spellsSet.size < numKnownIsh) {
    const lvl = 1 + rnd(maxLvl);
    const pool = getSpellPoolForLevel(lvl);
    if (!pool.length) break; 
    spellsSet.add(pick(pool).name);
  }
  return { cantrips, spells: [...spellsSet] };
}

function buildPCData(opts) {
  const level = opts.level || 1;
  const species = SPECIES.find(ss => ss.id === opts.race) || pick(SPECIES);
  const background = BACKGROUNDS.find(bb => bb.id === opts.background) || pick(BACKGROUNDS);
  const klass = CLASSES.find(cc => cc.id === opts.klass) || pick(CLASSES);

  let statSet;
  if (opts.statMethod === 'manual') statSet = opts.manualStats;
  else if (opts.statMethod === 'standard') statSet = [...STANDARDARRAY];
  else statSet = rollStatSet();

  let stats = opts.statMethod === 'manual' ? { str: statSet[0], dex: statSet[1], con: statSet[2], int: statSet[3], wis: statSet[4], cha: statSet[5] } : assignStats(statSet, STATPRIORITY[klass.id] || klass.primary);

  const bgAbilities = background.abilities || [];
  if (Math.random() < 0.5) {
    const boosted = pick(bgAbilities);
    stats[boosted] = Math.min(20, stats[boosted] + 2);
  } else {
    bgAbilities.forEach(a => (stats[a] = Math.min(20, stats[a] + 1)));
  }

  const conMod = abilityMod(stats.con);
  const avgDie = Math.floor(klass.hitDie / 2) + 1;
  const hp = klass.hitDie + conMod + (level - 1) * (avgDie + conMod);
  const pb = profBonus(level);
  const dexMod = abilityMod(stats.dex);

  let ac = 10 + dexMod;
  if (klass.armor.includes('pesada')) ac = 16;
  else if (klass.armor.includes('escudo') && klass.armor.includes('media')) ac = 13 + Math.min(dexMod, 2);
  else if (klass.armor.includes('media')) ac = 13 + Math.min(dexMod, 2);
  else if (klass.armor.includes('ligera')) ac = 11 + dexMod;
  else if (klass.armor.includes('Defensa sin Armadura')) {
    const secondMod = klass.id === 'barbaro' ? abilityMod(stats.con) : abilityMod(stats.wis);
    ac = 10 + dexMod + secondMod;
  }

  const casterInfo = spellcasterInfo(klass, level);
  const spells = casterInfo ? pickSpellsForCaster(casterInfo, level) : null;
  const gear = STARTINGGEAR[klass.id] || [];
  const skills = pickN(['Percepción', 'Perspicacia', 'Persuasión', 'Engaño', 'Intimidación', 'Investigación', 'Historia', 'Naturaleza', 'Medicina', 'Sigilo', 'Juego de Manos', 'Trato con Animales', 'Supervivencia', 'Arcanos', 'Atletismo', 'Acrobacias'], 3);
  const name = genName();

  return {
    id: `pc-${Date.now()}-${rnd(100000)}`,
    savedAt: null,
    name,
    speciesId: species.id,
    speciesName: species.name,
    backgroundId: background.id,
    backgroundName: background.name,
    classId: klass.id,
    className: klass.name,
    subclassName: opts.subclass || null,
    level,
    stats,
    hp,
    ac,
    pb,
    speed: species.speed,
    size: species.size,
    traits: species.traits,
    skills,
    gear,
    hitDie: klass.hitDie,
    saves: klass.saves,
    armor: klass.armor,
    subclassList: klass.subclasses,
    casterInfo,
    spells
  };
}

function pcDataToHtml(data, options = {}) {
  const saveBtn = options.hideSave ? '' : `<button class="ghost-btn" onclick="saveCurrentPC()">Guardar PJ</button>`;
  const regenBtn = options.hideRegen ? '' : `<button class="ghost-btn" onclick="document.getElementById('pc-generate').click()">Regenerar</button>`;
  const deleteBtn = options.showDelete ? `<button class="ghost-btn" onclick="deleteSavedPC('${data.id}').then(refreshSavedList)">Eliminar</button>` : '';
  const savedTag = data.savedAt ? `<div class="note-box">Guardado el ${new Date(data.savedAt).toLocaleString('es-ES')}</div>` : '';

  let html = `
    <div class="sheet">
      <div class="sheet-head">
        <div>
          <div class="sheet-name">${data.name}</div>
          <div class="sheet-sub">${data.speciesName} ${data.className}${data.subclassName ? ` · ${data.subclassName}` : ''} · Nivel ${data.level} · ${data.backgroundName}</div>
        </div>
        <div class="sheet-tag">PJ</div>
      </div>

      <div class="abilities">
        ${['str','dex','con','int','wis','cha'].map(a => `
          <div class="ability-box">
            <div class="a-name">${a.toUpperCase()}</div>
            <div class="a-score">${data.stats[a]}</div>
            <div class="a-mod">${modStr(abilityMod(data.stats[a]))}</div>
          </div>`).join('')}
      </div>

      <div class="stat-line">
        <span><b>CA</b> ${data.ac}</span>
        <span><b>PG</b> ${data.hp}</span>
        <span><b>Dado de golpe</b> d${data.hitDie}</span>
        <span><b>Velocidad</b> ${data.speed} m</span>
        <span><b>Bono comp.</b> ${modStr(data.pb)}</span>
        <span><b>Salvaciones</b> ${data.saves.map(s => s.toUpperCase()).join(', ')}</span>
      </div>

      <div class="section-title">Rasgos de ${data.speciesName}</div>
      <ul class="clean">${data.traits.map(t => `<li>${t}</li>`).join('')}</ul>

      <div class="section-title">Trasfondo ${data.backgroundName}</div>
      <ul class="clean">
        <li>Habilidades: ${backgroundById(data.backgroundId).skills.join(', ')}</li>
        <li>Herramienta: ${backgroundById(data.backgroundId).tool}</li>
        <li>Dote inicial: ${backgroundById(data.backgroundId).feat}</li>
      </ul>

      <div class="section-title">Competencias destacadas</div>
      <div class="chiplist">${data.skills.map(s => `<span class="chip">${s}</span>`).join('')}</div>

      <div class="section-title">Equipo inicial</div>
      <ul class="clean">${data.gear.map(g => `<li>${g}</li>`).join('')}</ul>
  `;

  if (data.spells) {
    html += `
      <div class="section-title">Magia</div>
      <ul class="clean">
        <li>Cantrips: ${data.spells.cantrips.join(', ')}</li>
        <li>Hechizos: ${data.spells.spells.join(', ')}</li>
      </ul>
    `;
  }

  html += `
      ${savedTag}
      <div class="sheet-actions">
        ${regenBtn}
        ${saveBtn}
        ${deleteBtn}
      </div>
    </div>
  `;

  return html;
}

function generatePC(opts) {
  const data = buildPCData(opts);
  lastPCData = data;
  document.getElementById('pc-result').innerHTML = pcDataToHtml(data);
}

async function saveCurrentPC() {
  if (!lastPCData) return;
  lastPCData.savedAt = Date.now();
  await savePCData(lastPCData);
  document.getElementById('pc-result').innerHTML = pcDataToHtml(lastPCData, { hideSave: true });
  refreshSavedList();
}

function viewSavedPC(id) {
  listSavedPCs().then(items => {
    const data = items.find(n => n.id === id);
    if (!data) return;
    lastPCData = data;
    activateTab('pc');
    document.getElementById('pc-result').innerHTML = pcDataToHtml(data, { hideSave: true, showDelete: true });
  });
}
let lastNPCData = null;

function buildShopStock(job, partyLevel) {
  const mundane = SHOPMUNDANE[job.shop] || [];
  const tiers = rarityTierByLevel(partyLevel);
  let magicItems = [];

  tiers.forEach(tier => {
    const pool = MAGICPOOL[tier] || MAGICPOOL[tier]?.[job.shop] || [];
    if (!pool || !pool.length) return;
    if (tier === 'legendary') {
      if (Math.random() < 0.3) magicItems.push({ item: pick(pool), rarity: tier });
    } else {
      magicItems = magicItems.concat(pickN(pool, Math.min(2, pool.length)).map(item => ({ item, rarity: tier })));
    }
  });

  return { mundane, magicItems };
}

function renderShop(job, partyLevel, stock) {
  const { mundane, magicItems } = stock || buildShopStock(job, partyLevel);
  const RARITYES = {
    common: 'Común',
    uncommon: 'Poco común',
    rare: 'Raro',
    veryrare: 'Muy raro',
    legendary: 'Legendario'
  };

  let html = `
    <div class="section-title">Género en venta ajustado a nivel ${partyLevel}</div>
    <table class="shop-table">
      <thead><tr><th>Artículo</th><th>Precio</th></tr></thead>
      <tbody>
        ${mundane.map(n => `<tr><td>${n.item || n}</td><td>${n.price || ''}</td></tr>`).join('')}
      </tbody>
    </table>
  `;

  if (magicItems.length) {
    html += `
      <div class="section-title">Objetos especiales de hoy</div>
      <table class="shop-table">
        <thead><tr><th>Artículo</th><th>Rareza</th></tr></thead>
        <tbody>
          ${magicItems.map(m => `<tr><td>${m.item}</td><td>${RARITYES[m.rarity] || m.rarity}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="note-box">La disponibilidad de objetos mágicos escala con el nivel de tus jugadores.</div>
    `;
  }

  return html;
}

function rarityTierByLevel(level) {
  if (level < 4) return ['common'];
  if (level < 10) return ['common', 'uncommon'];
  if (level < 16) return ['uncommon', 'rare'];
  if (level < 19) return ['rare', 'veryrare'];
  return ['rare', 'veryrare', 'legendary'];
}

function genName() {
  const start = pick(NAMESYLSTART);
  const mid = Math.random() < 0.6 ? pick(NAMESYLMID) : '';
  const end = pick(NAMESYLEND);
  return (start + mid + end).toLowerCase().replace(/^./, c => c.toUpperCase());
}

function buildNPCData(raceId, jobId, partyLevel) {
  const race = SPECIES.find(s => s.id === raceId) || pick(SPECIES);
  const job = OFICIOS.find(o => o.id === jobId) || pick(OFICIOS);
  const level = 1 + rnd(8);
  const statSet = rollStatSet();
  const stats = assignStats(statSet, job.priority);
  const conMod = abilityMod(stats.con);
  const avgDie = Math.floor(job.hitDie / 2) + 1;
  const hp = job.hitDie + conMod + (level - 1) * (avgDie + conMod);
  const pb = profBonus(level);
  const dexMod = abilityMod(stats.dex);

  let ac = 10 + dexMod;
  if (job.armorHint.includes('cuero')) ac = 11 + dexMod;
  else if (job.armorHint.includes('escamas')) ac = 14 + Math.min(dexMod, 2);
  else if (job.armorHint.includes('malla')) ac = 16;

  const skills = pickN(
    ['Percepción', 'Perspicacia', 'Persuasión', 'Engaño', 'Intimidación', 'Investigación', 'Historia', 'Naturaleza', 'Medicina', 'Sigilo', 'Juego de Manos', 'Trato con Animales', 'Supervivencia', 'Arcanos', 'Atletismo', 'Acrobacias'],
    3
  );

  const atkBonus = Math.max(pb + abilityMod(stats.str), pb + abilityMod(stats.dex));
  const shopStock = job.shop ? buildShopStock(job, partyLevel) : null;

  return {
    id: `npc-${Date.now()}-${rnd(100000)}`,
    savedAt: null,
    name: genName(),
    raceId: race.id,
    raceName: race.name,
    jobId: job.id,
    jobName: job.name,
    level,
    stats,
    hp,
    ac,
    pb,
    speed: race.speed,
    size: race.size,
    traits: race.traits,
    skills,
    armorHint: job.armorHint,
    weaponHint: job.weaponHint,
    atkBonus,
    shopType: job.shop,
    partyLevel,
    shopStock
  };
}

function npcDataToHtml(data, options = {}) {
  const saveBtn = options.hideSave ? '' : `<button class="ghost-btn" onclick="saveCurrentNPC()">Guardar PNJ</button>`;
  const regenBtn = options.hideRegen ? '' : `<button class="ghost-btn" onclick="document.getElementById('npc-generate').click()">Regenerar</button>`;
  const deleteBtn = options.showDelete ? `<button class="ghost-btn" onclick="deleteSavedNPC('${data.id}').then(refreshSavedList)">Eliminar</button>` : '';

  let html = `
    <div class="sheet">
      <div class="sheet-head">
        <div>
          <div class="sheet-name">${data.name}</div>
          <div class="sheet-sub">${data.raceName} ${data.jobName} · Nivel ${data.level}</div>
        </div>
        <div class="sheet-tag">PNJ</div>
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
        <span><b>Velocidad</b> ${data.speed} m</span>
        <span><b>Bono comp.</b> ${modStr(data.pb)}</span>
        <span><b>Tamaño</b> ${data.size}</span>
      </div>

      <div class="section-title">Rasgos</div>
      <ul class="clean">${data.traits.map(t => `<li>${t}</li>`).join('')}</ul>

      <div class="section-title">Habilidades destacadas</div>
      <div class="chiplist">${data.skills.map(s => `<span class="chip">${s}</span>`).join('')}</div>

      <div class="section-title">Equipo</div>
      <ul class="clean">
        <li>Armadura: ${data.armorHint}</li>
        <li>Arma: ${data.weaponHint} (${modStr(data.atkBonus)} para golpear, aprox.)</li>
      </ul>

      ${data.shopType ? renderShop(OFICIOS.find(o => o.id === data.jobId), data.partyLevel, data.shopStock) : '<div class="note-box">Este oficio no lleva tienda.</div>'}

      <div class="sheet-actions">
        ${regenBtn}
        ${saveBtn}
        ${deleteBtn}
      </div>
    </div>
  `;

  return html;
}

function generateNPC(raceId, jobId, partyLevel) {
  lastNPCData = buildNPCData(raceId, jobId, partyLevel);
  document.getElementById('npc-result').innerHTML = npcDataToHtml(lastNPCData);
}

async function saveCurrentNPC() {
  if (!lastNPCData) return;
  lastNPCData.savedAt = Date.now();
  await saveNPCData(lastNPCData);
  document.getElementById('npc-result').innerHTML = npcDataToHtml(lastNPCData, { hideSave: true });
  refreshSavedList();
}

function viewSavedNPC(id) {
  listSavedNPCs().then(items => {
    const data = items.find(n => n.id === id);
    if (!data) return;
    lastNPCData = data;
    activateTab('npc');
    document.getElementById('npc-result').innerHTML = npcDataToHtml(data, { hideSave: true, showDelete: true });
  });
}
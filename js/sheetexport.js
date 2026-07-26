/* ================= FICHA EXPORTABLE (PJ Y PNJ) ================= */
/* SKILL_ABILITY_MAP y ABILITY_LABEL viven en data.js (compartidas con pc.js) */

function slugify(str) {
  return String(str || 'personaje')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'personaje';
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function resolveSpellByName(name) {
  const all = (typeof getAllSpellsFlatMerged === 'function') ? getAllSpellsFlatMerged() : [];
  return all.find(s => s.name === name) || { name, desc: '', range: '—', cast: '—', duration: '—', concentration: false, damage: null };
}

/* -------- CSS y envoltorio compartidos por la ficha de PJ y de PNJ -------- */
function sheetDocumentStyles() {
  return `
  :root{ --ink:#2b2013; --ink-soft:#5a4a30; --gold:#8a6f2f; --paper:#f7f1e1; --paper-2:#efe4c8; --line:#d8c79a; }
  *{box-sizing:border-box;}
  body{ background:var(--paper); color:var(--ink); font-family:'Spectral',serif; margin:0; padding:32px 18px 60px; line-height:1.55; }
  .wrap{ max-width:880px; margin:0 auto; }
  header{ text-align:center; border-bottom:3px double var(--gold); padding-bottom:18px; margin-bottom:22px; }
  .eyebrow{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--ink-soft); }
  h1{ font-family:'Cinzel',serif; font-size:clamp(26px,4vw,38px); margin:8px 0 6px; color:var(--ink); }
  .subtitle{ font-size:15px; color:var(--ink-soft); font-style:italic; }
  h2{ font-family:'Cinzel',serif; font-size:17px; text-transform:uppercase; letter-spacing:.04em; color:var(--ink); border-bottom:2px solid var(--line); padding-bottom:6px; margin:0 0 12px; }
  h3{ font-family:'Cinzel',serif; font-size:13.5px; text-transform:uppercase; letter-spacing:.03em; color:var(--ink-soft); margin:16px 0 8px; }
  .block{ background:var(--paper-2); border:1px solid var(--line); border-radius:6px; padding:18px 20px; margin-bottom:18px; }
  .muted{ color:var(--ink-soft); font-size:13.5px; }
  .primer{ background:#fff; border:1px dashed var(--gold); border-radius:6px; padding:16px 20px; margin-bottom:22px; font-size:13.5px; }
  .primer h2{ border:none; margin-bottom:8px; }
  .primer ul{ margin:0; padding-left:20px; }
  .primer li{ margin-bottom:6px; }
  .top-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
  .stat-box{ background:var(--paper-2); border:1px solid var(--line); border-radius:6px; text-align:center; padding:12px 6px; }
  .stat-box .label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-soft); }
  .stat-box .value{ font-family:'Cinzel',serif; font-weight:700; font-size:22px; margin-top:4px; }
  .abilities{ display:grid; grid-template-columns:repeat(6,1fr); gap:10px; margin-bottom:18px; }
  .ability-box{ background:var(--paper-2); border:1px solid var(--line); border-radius:6px; text-align:center; padding:10px 4px; }
  .ability-box .a-name{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; color:var(--ink-soft); }
  .ability-box .a-score{ font-family:'Cinzel',serif; font-weight:700; font-size:20px; margin:4px 0; }
  .ability-box .a-mod{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--ink-soft); }
  table{ width:100%; border-collapse:collapse; font-size:13.5px; }
  td{ padding:5px 4px; border-bottom:1px solid var(--line); }
  td:nth-child(2){ text-align:center; width:26px; color:var(--gold); }
  td:last-child{ text-align:right; font-family:'IBM Plex Mono',monospace; }
  .two-col{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  @media(max-width:640px){ .two-col{ grid-template-columns:1fr; } .top-grid{ grid-template-columns:repeat(2,1fr); } .abilities{ grid-template-columns:repeat(3,1fr); } }
  ul.clean{ margin:0; padding-left:18px; font-size:13.5px; }
  ul.clean li{ margin-bottom:4px; }
  .tag{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.04em; background:var(--paper); border:1px solid var(--line); border-radius:20px; padding:2px 9px; margin-left:4px; }
  .spell-list{ display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:10px; }
  .spell-item{ background:#fff; border:1px solid var(--line); border-radius:6px; padding:10px 12px; }
  .spell-item-head{ font-size:13.5px; margin-bottom:3px; }
  .spell-item-meta{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--ink-soft); margin-bottom:5px; }
  .spell-item-desc{ font-size:12.5px; }
  .item-card{ background:#fff; border:1px solid var(--line); border-radius:6px; padding:10px 12px; margin-bottom:8px; font-size:13.5px; }
  footer{ text-align:center; color:var(--ink-soft); font-size:11.5px; font-style:italic; margin-top:30px; }
  @media print{ body{ padding:0; } .block, .primer{ break-inside:avoid; } }
  `;
}

function wrapSheetDocument(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>${sheetDocumentStyles()}</style>
</head>
<body>
<div class="wrap">
${bodyHtml}
<footer>Generado con El Cuaderno del Guardián el ${new Date().toLocaleDateString('es-ES')} · Ficha de apoyo, consulta el manual para cualquier duda de reglas.</footer>
</div>
</body>
</html>`;
}

function abilitiesBlockHtml(stats) {
  return `
  <div class="abilities">
    ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(a => `
      <div class="ability-box">
        <div class="a-name">${ABILITY_LABEL[a]}</div>
        <div class="a-score">${stats[a]}</div>
        <div class="a-mod">${modStr(abilityMod(stats[a]))}</div>
      </div>`).join('')}
  </div>`;
}

/* -------- ficha de personaje jugador -------- */
function buildCharacterSheetDocument(pc) {
  const bg = backgroundById(pc.backgroundId) || { skills: [], tool: '—', feat: '—' };
  const itemBonus = (typeof computeItemBonuses === 'function') ? computeItemBonuses(pc.items) : { ac: 0, atk: 0, dmg: 0 };
  const finalAC = pc.ac + itemBonus.ac;
  const initiative = abilityMod(pc.stats.dex);
  const proficientSkills = new Set(pc.skills || []);

  const savesHtml = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(a => {
    const prof = pc.saves.includes(a);
    const bonus = abilityMod(pc.stats[a]) + (prof ? pc.pb : 0);
    return `<tr><td>${ABILITY_LABEL[a]}</td><td>${prof ? '●' : '○'}</td><td>${modStr(bonus)}</td></tr>`;
  }).join('');

  const skillsHtml = Object.entries(SKILL_ABILITY_MAP).sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([skill, ab]) => {
    const prof = proficientSkills.has(skill);
    const bonus = abilityMod(pc.stats[ab]) + (prof ? pc.pb : 0);
    return `<tr><td>${skill} <span class="muted">(${ABILITY_LABEL[ab]})</span></td><td>${prof ? '●' : '○'}</td><td>${modStr(bonus)}</td></tr>`;
  }).join('');

  const passivePerception = 10 + abilityMod(pc.stats.wis) + (proficientSkills.has('Percepción') ? pc.pb : 0);

  let spellSection = '';
  if (pc.casterInfo && pc.spells) {
    const ci = pc.casterInfo;
    const dc = 8 + pc.pb + abilityMod(pc.stats[ci.ability]);
    const atkBonus = pc.pb + abilityMod(pc.stats[ci.ability]);
    const slotsLine = ci.pactSlots
      ? `${ci.pactSlots} espacios de nivel ${ci.pactLevel} (Magia de Pacto: se recuperan en un descanso corto)`
      : (ci.slots || []).map((n, i) => n > 0 ? `Nivel ${i + 1}: ${n}` : null).filter(Boolean).join(' · ') || '—';

    const spellCard = (name) => {
      const s = resolveSpellByName(name);
      return `
        <div class="spell-item">
          <div class="spell-item-head"><b>${escapeHtml(s.name)}</b> ${s.concentration ? '<span class="tag">Concentración</span>' : ''}</div>
          <div class="spell-item-meta">${s.range !== '—' ? 'Alcance: ' + escapeHtml(s.range) + ' · ' : ''}${s.cast !== '—' ? 'Lanzamiento: ' + escapeHtml(s.cast) + ' · ' : ''}${s.duration !== '—' ? 'Duración: ' + escapeHtml(s.duration) : ''}${s.damage ? ' · Daño: ' + escapeHtml(s.damage) : ''}</div>
          ${s.desc ? `<div class="spell-item-desc">${escapeHtml(s.desc)}</div>` : ''}
        </div>`;
    };

    spellSection = `
      <section class="block">
        <h2>Magia</h2>
        <p class="muted">Característica de lanzamiento: <b>${ABILITY_LABEL[ci.ability]}</b> · CD para salvar contra tus conjuros: <b>${dc}</b> · Bono de ataque con conjuro: <b>${modStr(atkBonus)}</b></p>
        <p class="muted">Espacios de conjuro disponibles: ${slotsLine}</p>
        <h3>Trucos (no gastan espacio)</h3>
        <div class="spell-list">${pc.spells.cantrips.map(spellCard).join('')}</div>
        <h3>Hechizos preparados / conocidos</h3>
        <div class="spell-list">${pc.spells.spells.map(spellCard).join('')}</div>
      </section>`;
  }

  const itemsHtml = (pc.items && pc.items.length)
    ? pc.items.map(it => `
        <div class="item-card">
          <b>${escapeHtml(it.name)}</b> <span class="tag">${escapeHtml(it.type)}</span>${it.bonus ? ` <span class="tag">${escapeHtml(it.bonus)}</span>` : ''}
          <div class="muted">${escapeHtml(it.ability)}</div>
        </div>`).join('')
    : `<p class="muted">Sin objetos mágicos adjuntos todavía.</p>`;

  const improvementsHtml = (pc.improvements && pc.improvements.length)
    ? `<section class="block"><h2>Mejoras de nivel</h2><ul class="clean">${pc.improvements.map(i => `<li>Nivel ${i.level}: ${escapeHtml(i.desc)}</li>`).join('')}</ul></section>`
    : '';

  const notesHtml = pc.notes
    ? `<section class="block"><h2>Notas</h2><p class="muted">${escapeHtml(pc.notes)}</p></section>`
    : '';

  const body = `
  <header>
    <div class="eyebrow">Ficha de Personaje · D&amp;D 5ª Edición (2024)</div>
    <h1>${escapeHtml(pc.name)}</h1>
    <div class="subtitle">${escapeHtml(pc.speciesName)} · ${escapeHtml(pc.className)}${pc.subclassName ? ' (' + escapeHtml(pc.subclassName) + ')' : ''} · Nivel ${pc.level} · Trasfondo: ${escapeHtml(pc.backgroundName)}</div>
  </header>

  <div class="primer">
    <h2>Cómo leer esta ficha (para jugadores nuevos)</h2>
    <ul>
      <li><b>Modificador:</b> el número entre paréntesis junto a cada característica. Se suma a las tiradas relacionadas con ella.</li>
      <li><b>Para atacar:</b> tira 1d20 + el bono de ataque indicado. Si el resultado iguala o supera la CA del objetivo, impactas.</li>
      <li><b>Para salvar (tirada de salvación):</b> tira 1d20 + tu bono de esa característica y compáralo con la CD que te indique el DJ.</li>
      <li><b>Ventaja / Desventaja:</b> tira 2d20 y usa el mayor (ventaja) o el menor (desventaja).</li>
      <li><b>En tu turno</b> puedes moverte hasta tu velocidad y hacer una acción (atacar, lanzar un conjuro, ayudar a un aliado...); algunas clases también dan una acción adicional.</li>
      <li><b>Si llegas a 0 Puntos de Golpe</b> caes inconsciente y empiezas a hacer tiradas de salvación contra la muerte.</li>
      <li>Los puntos <b>●</b> en las tablas de abajo marcan competencias (se suma tu Bono de Competencia a esa tirada).</li>
    </ul>
  </div>

  ${abilitiesBlockHtml(pc.stats)}

  <div class="top-grid">
    <div class="stat-box"><div class="label">Clase de Armadura</div><div class="value">${finalAC}</div></div>
    <div class="stat-box"><div class="label">Puntos de Golpe</div><div class="value">${pc.hp}</div></div>
    <div class="stat-box"><div class="label">Dado de golpe</div><div class="value">d${pc.hitDie}</div></div>
    <div class="stat-box"><div class="label">Velocidad</div><div class="value">${pc.speed} m</div></div>
    <div class="stat-box"><div class="label">Iniciativa</div><div class="value">${modStr(initiative)}</div></div>
    <div class="stat-box"><div class="label">Bono de Competencia</div><div class="value">${modStr(pc.pb)}</div></div>
  </div>

  <div class="two-col">
    <section class="block">
      <h2>Tiradas de salvación</h2>
      <table>${savesHtml}</table>
    </section>
    <section class="block">
      <h2>Habilidades <span class="muted" style="font-family:'Spectral',serif;text-transform:none;letter-spacing:0;">(Percepción pasiva: ${passivePerception})</span></h2>
      <table>${skillsHtml}</table>
    </section>
  </div>

  <div class="two-col">
    <section class="block">
      <h2>Rasgos de ${escapeHtml(pc.speciesName)}</h2>
      <ul class="clean">${(pc.traits || []).map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
    </section>
    <section class="block">
      <h2>Trasfondo: ${escapeHtml(pc.backgroundName)}</h2>
      <ul class="clean">
        <li>Habilidades de trasfondo: ${bg.skills.join(', ')}</li>
        <li>Herramienta: ${bg.tool}</li>
        <li>Dote inicial: ${bg.feat}</li>
      </ul>
    </section>
  </div>

  ${improvementsHtml}

  <section class="block">
    <h2>Equipo inicial</h2>
    <ul class="clean">${(pc.gear || []).map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>
  </section>

  ${spellSection}

  <section class="block">
    <h2>Objetos mágicos</h2>
    ${itemsHtml}
    ${(itemBonus.ac || itemBonus.atk || itemBonus.dmg) ? `<p class="muted">Estos objetos ya están sumados: Ataque ${modStr(itemBonus.atk)} · Daño ${modStr(itemBonus.dmg)} · CA ${modStr(itemBonus.ac)} (incluida arriba).</p>` : ''}
  </section>

  ${notesHtml}
  `;

  return wrapSheetDocument(`${pc.name} — Ficha de personaje`, body);
}

/* -------- ficha de PNJ -------- */
function buildNPCSheetDocument(npc) {
  const notesHtml = npc.notes
    ? `<section class="block"><h2>Notas</h2><p class="muted">${escapeHtml(npc.notes)}</p></section>`
    : '';

  let shopHtml = '';
  if (npc.shopType && npc.shopStock) {
    const { mundane, services, magicItems } = npc.shopStock;
    const rows = (arr) => `<table>${(arr || []).map(r => `<tr><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join('')}</table>`;
    let mundaneHtml = '';
    if (Array.isArray(mundane)) {
      mundaneHtml = rows(mundane);
    } else if (mundane) {
      mundaneHtml = Object.entries(mundane).map(([cat, arr]) => `<h3>${escapeHtml(cat)}</h3>${rows(arr)}`).join('');
    }
    const svc = services || SHOPSERVICES[npc.jobId] || [];
    shopHtml = `
      <section class="block">
        <h2>Tienda</h2>
        ${mundaneHtml}
        ${svc.length ? `<h3>Servicios</h3>${rows(svc)}` : ''}
        ${(magicItems && magicItems.length) ? `<h3>Objetos especiales</h3><table>${magicItems.map(m => `<tr><td>${escapeHtml(m.item)}</td><td>${escapeHtml(m.rarity)}</td></tr>`).join('')}</table>` : ''}
      </section>`;
  }

  const itemsHtml = (npc.items && npc.items.length)
    ? npc.items.map(it => `
        <div class="item-card">
          <b>${escapeHtml(it.name)}</b> <span class="tag">${escapeHtml(it.type)}</span>${it.bonus ? ` <span class="tag">${escapeHtml(it.bonus)}</span>` : ''}
          <div class="muted">${escapeHtml(it.ability)}</div>
        </div>`).join('')
    : '';

  const body = `
  <header>
    <div class="eyebrow">Ficha de PNJ · D&amp;D 5ª Edición (2024)</div>
    <h1>${escapeHtml(npc.name)}</h1>
    <div class="subtitle">${escapeHtml(npc.raceName)} · ${escapeHtml(npc.jobName)} · Nivel ${npc.level}</div>
  </header>

  <div class="primer">
    <h2>Para quien reciba esta ficha</h2>
    <ul>
      <li>Es un personaje no jugador: pensado para que el Dungeon Master lo interprete, no para jugarlo como personaje propio.</li>
      <li><b>Para atacar:</b> tira 1d20 + el bono de ataque indicado. <b>Para salvar:</b> tira 1d20 + el modificador de esa característica.</li>
      <li>Los puntos <b>●</b> en la tabla de salvaciones marcan competencia (se suma el Bono de Competencia).</li>
    </ul>
  </div>

  ${abilitiesBlockHtml(npc.stats)}

  <div class="top-grid">
    <div class="stat-box"><div class="label">Clase de Armadura</div><div class="value">${npc.ac}</div></div>
    <div class="stat-box"><div class="label">Puntos de Golpe</div><div class="value">${npc.hp}</div></div>
    <div class="stat-box"><div class="label">Velocidad</div><div class="value">${npc.speed} m</div></div>
    <div class="stat-box"><div class="label">Tamaño</div><div class="value">${npc.size}</div></div>
    <div class="stat-box"><div class="label">Iniciativa</div><div class="value">${modStr(abilityMod(npc.stats.dex))}</div></div>
    <div class="stat-box"><div class="label">Bono de Competencia</div><div class="value">${modStr(npc.pb)}</div></div>
  </div>

  <div class="two-col">
    <section class="block">
      <h2>Rasgos de ${escapeHtml(npc.raceName)}</h2>
      <ul class="clean">${(npc.traits || []).map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
    </section>
    <section class="block">
      <h2>Equipo</h2>
      <ul class="clean">
        <li>Armadura: ${escapeHtml(npc.armorHint)}</li>
        <li>Arma: ${escapeHtml(npc.weaponHint)} (${modStr(npc.atkBonus)} para golpear, aprox.)</li>
      </ul>
      ${(npc.skills && npc.skills.length) ? `<p class="muted" style="margin-top:8px;">Habilidades destacadas: ${npc.skills.map(escapeHtml).join(', ')}</p>` : ''}
    </section>
  </div>

  ${itemsHtml ? `<section class="block"><h2>Objetos</h2>${itemsHtml}</section>` : ''}

  ${shopHtml}

  ${notesHtml}
  `;

  return wrapSheetDocument(`${npc.name} — Ficha de PNJ`, body);
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadCharacterSheetHTML(pc) {
  downloadTextFile(`${slugify(pc.name)}-ficha.html`, buildCharacterSheetDocument(pc), 'text/html');
}
function downloadCurrentCharacterSheetHTML() {
  if (!lastPCData) return;
  downloadCharacterSheetHTML(lastPCData);
}

function downloadNPCSheetHTML(npc) {
  downloadTextFile(`${slugify(npc.name)}-ficha.html`, buildNPCSheetDocument(npc), 'text/html');
}
function downloadCurrentNPCSheetHTML() {
  if (!lastNPCData) return;
  downloadNPCSheetHTML(lastNPCData);
}

/* -------- exportar / importar UN solo personaje en JSON (mismo formato que el backup completo) -------- */
function downloadPCDataJSON(pc) {
  downloadJSON(`${slugify(pc.name)}-datos.json`, { pc: [pc] });
}
function downloadCurrentPCDataJSON() {
  if (!lastPCData) return;
  downloadPCDataJSON(lastPCData);
}

async function importSinglePCFile(file) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); }
  catch { alert('El archivo no es un JSON válido.'); return; }

  const list = Array.isArray(data.pc) ? data.pc : (data.name && data.stats ? [data] : null);
  if (!list) { alert('Este archivo no contiene un personaje reconocible.'); return; }

  for (const it of list) {
    if (!it.id) it.id = `pc-${Date.now()}-${rnd(100000)}`;
    it.savedAt = Date.now();
    await savePCData(it);
  }
  refreshSavedList();
  if (list[0]) { lastPCData = list[0]; activateTab('pc'); document.getElementById('pc-result').innerHTML = pcDataToHtml(list[0], { hideSave: true, showDelete: true }); }
}
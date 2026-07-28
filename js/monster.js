function encounterMultiplier(n) {
  if (n <= 1) return 1;
  if (n <= 2) return 1.5;
  if (n <= 6) return 2;
  if (n <= 10) return 2.5;
  if (n <= 14) return 3;
  return 4;
}

function suggestedCount(players, level, difficulty, monsterXp) {
  const perChar = XPTHRESHOLDS[Math.min(20, Math.max(1, level))][DIFFINDEX[difficulty]];
  const totalBudget = perChar * players;
  let bestCount = 1;

  for (let n = 1; n <= 15; n++) {
    const mult = encounterMultiplier(n);
    const needed = n * monsterXp * mult;
    if (needed <= totalBudget) bestCount = n;
    else break;
  }

  return { count: bestCount, totalBudget };
}

/* -------- multiataque: repartir el daño/asalto de la tabla de CR entre varios golpes -------- */

/* cuántos golpes distintos "debería" tener una criatura de este CR si no se especifica nada */
function desiredAttackCount(crn) {
  if (crn < 1) return 1;
  if (crn < 5) return 2;
  return 3;
}

/* reparte un total entero entre n golpes, sin que ninguno baje de 1 */
function splitDamage(total, n) {
  n = Math.max(1, n);
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, i) => Math.max(1, base + (i < rem ? 1 : 0)));
}

/* construye la lista de golpes {name, bonus, dmg} a partir de uno o varios nombres de ataque */
function buildAttacks(names, totalDmg, attackBonus) {
  const list = (names && names.length ? names : ['Ataque']);
  const dmgs = splitDamage(totalDmg, list.length);
  return list.map((name, i) => ({ name, bonus: attackBonus, dmg: dmgs[i] }));
}

/* decide los nombres de ataque a usar para un monstruo base: su multiattack curado si lo tiene,
   o su attackName repetido tantas veces como sugiera el CR si no lo tiene */
function attackNamesForBase(base, crn) {
  if (base.multiattack && base.multiattack.length) return base.multiattack;
  if (base.multiattack === null) return [base.attackName || 'Ataque'];
  const count = desiredAttackCount(crn);
  const single = base.attackName || 'Ataque';
  return count > 1 ? Array(count).fill(single) : [single];
}

function scaleMonsterToCR(base, row) {
  const dmgAvg = Math.round((row.dmg[0] + row.dmg[1]) / 2);
  const hpAvg = Math.round((row.hp[0] + row.hp[1]) / 2);
  const names = attackNamesForBase(base, row.crn);

  return {
    name: base.name,
    type: base.type,
    cr: row.cr,
    ac: row.ac,
    hp: hpAvg,
    hpRange: row.hp,
    attackBonus: row.atk,
    dmgPerRound: dmgAvg,
    dmgRange: row.dmg,
    saveDC: row.dc,
    prof: row.prof,
    traits: base.traits || [],
    attackName: base.attackName || 'Ataque',
    attacks: buildAttacks(names, dmgAvg, row.atk),
    legendary: legendaryActionsForCR(row.crn),
    lairAction: lairActionForCR(row.crn),
  };
}

function buildRandomMonster(row) {
  const attackNamePool = ['Garras', 'Mordisco', 'Aguijón', 'Golpe', 'Zarpazo', 'Latigazo de cola', 'Embestida', 'Cornada', 'Aplastamiento'];
  const count = desiredAttackCount(row.crn);
  const names = pickN(attackNamePool, Math.min(count, attackNamePool.length));
  const dmgAvg = Math.round((row.dmg[0] + row.dmg[1]) / 2);

  return {
    name: `${pick(RANDOMADJ)} ${pick(RANDOMNOUN)}`,
    type: pick(RANDOMTYPES),
    cr: row.cr,
    ac: row.ac,
    hp: Math.round((row.hp[0] + row.hp[1]) / 2),
    hpRange: row.hp,
    attackBonus: row.atk,
    dmgPerRound: dmgAvg,
    dmgRange: row.dmg,
    saveDC: row.dc,
    prof: row.prof,
    traits: pickN([
      'Visión en la oscuridad 18 m',
      'Resistencia a un tipo de daño a elegir',
      'Ventaja en Percepción',
      'Regeneración menor',
      'Inmune a asustado',
      'Salto potenciado',
      'Sentido sísmico 9 m'
    ], 2),
    attackName: names[0],
    attacks: buildAttacks(names, dmgAvg, row.atk),
    legendary: legendaryActionsForCR(row.crn),
    lairAction: lairActionForCR(row.crn),
  };
}

function monsterFromBaseAsIs(base, row) {
  const scaled = scaleMonsterToCR(base, row);
  if (!base.manual) return scaled;
  const m = base.manual;
  const attackBonus = m.attackBonus ?? scaled.attackBonus;
  const dmgPerRound = m.dmgPerRound ?? scaled.dmgPerRound;
  const rebuiltAttacks = (m.attackBonus != null || m.dmgPerRound != null)
    ? buildAttacks(attackNamesForBase(base, row.crn), dmgPerRound, attackBonus)
    : scaled.attacks;
  return {
    ...scaled,
    ac: m.ac ?? scaled.ac,
    hp: m.hp ?? scaled.hp,
    hpRange: m.hp ? [m.hp, m.hp] : scaled.hpRange,
    attackBonus,
    dmgPerRound,
    dmgRange: m.dmgPerRound ? [m.dmgPerRound, m.dmgPerRound] : scaled.dmgRange,
    saveDC: m.saveDC ?? scaled.saveDC,
    attacks: rebuiltAttacks,
  };
}

/* -------- render -------- */

function attackBlockHtml(mon) {
  const attacks = mon.attacks && mon.attacks.length ? mon.attacks : [{ name: mon.attackName, bonus: mon.attackBonus, dmg: mon.dmgPerRound }];
  if (attacks.length <= 1) {
    const a = attacks[0];
    return `
      <div class="section-title">Ataque</div>
      <div class="attack-block">
        <b>${escapeHtml(a.name)}</b>. ${modStr(a.bonus)} para impactar. Impacto ${a.dmg} de daño.
      </div>`;
  }
  const names = attacks.map(a => a.name);
  const uniqueNames = [...new Set(names)];
  const multiDesc = uniqueNames.length < names.length
    ? `La criatura realiza ${names.length} ataques de ${escapeHtml(uniqueNames.join(' y '))}.`
    : `La criatura realiza ${names.length} ataques: ${escapeHtml(names.join(', '))}.`;
  return `
    <div class="section-title">Multiataque</div>
    <div class="attack-block">${multiDesc}</div>
    ${attacks.map(a => `
      <div class="attack-block">
        <b>${escapeHtml(a.name)}</b>. ${modStr(a.bonus)} para impactar. Impacto ${a.dmg} de daño.
      </div>`).join('')}
  `;
}

function legendarySectionHtml(mon) {
  let html = '';
  if (mon.legendary) {
    html += `
      <div class="section-title">Acciones Legendarias</div>
      <div class="attack-block">Puede realizar ${mon.legendary.count} acciones legendarias al final del turno de otra criatura, eligiendo entre las opciones de abajo (una a la vez, salvo que se indique lo contrario). Recupera las opciones gastadas al inicio de su turno.</div>
      <ul class="clean">${mon.legendary.options.map(o => `<li>${o}</li>`).join('')}</ul>`;
  }
  if (mon.lairAction) {
    html += `
      <div class="section-title">Acción de Guarida</div>
      <div class="attack-block">${mon.lairAction}</div>`;
  }
  return html;
}

function monsterSheetHtml(mon, extra = '') {
  return `
    <div class="sheet">
      <div class="sheet-head">
        <div>
          <div class="sheet-name">${escapeHtml(mon.name)}</div>
          <div class="sheet-sub">${escapeHtml(mon.type)} · CR ${mon.cr}</div>
        </div>
        <div class="sheet-tag">Monstruo</div>
      </div>

      <div class="stat-line">
        <span><b>CA</b> ${mon.ac}</span>
        <span><b>PG</b> ${mon.hp} <span style="opacity:.6;">(rango ${mon.hpRange[0]}-${mon.hpRange[1]})</span></span>
        <span><b>Bono comp.</b> ${modStr(mon.prof)}</span>
        <span><b>CD salvación</b> ${mon.saveDC}</span>
      </div>

      <div class="section-title">Rasgos</div>
      <ul class="clean">${mon.traits.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>

      ${attackBlockHtml(mon)}

      ${legendarySectionHtml(mon)}

      ${extra}
    </div>
  `;
}

function renderMonsterSheet(mon, extra = '') {
  document.getElementById('mon-result').innerHTML = monsterSheetHtml(mon, extra);
}

function generateMonster(opts) {
  const players = opts.players;
  const level = opts.level;

  if (opts.mode === 'mixed') {
    generateMixedEncounter(opts);
    return;
  }

  if (opts.mode === 'random') {
    let targetCrn = parseCrInput(opts.targetCr);
    if (targetCrn == null) targetCrn = level;
    const row = crRowByNumber(targetCrn);
    const mon = buildRandomMonster(row);
    const sug = suggestedCount(players, level, opts.difficulty, row.xp);

    const extra = `
      <div class="section-title">Encuentro sugerido</div>
      <div class="stat-line">
        <span><b>Cantidad</b> ${sug.count}</span>
        <span><b>Presupuesto XP grupal</b> ${sug.totalBudget}</span>
        <span><b>XP por criatura</b> ${row.xp}</span>
      </div>
      <div class="note-box">Genera desde cero un monstruo nuevo con las estadísticas típicas de su CR.</div>
    `;

    renderMonsterSheet(mon, extra);
    return;
  }

  const base = getMonsterById(opts.baseId) || pick(MONSTERS);
  const baseRow = crRowById(base.cr);

  if (opts.scaleMethod === 'cr') {
    let targetCrn = parseCrInput(opts.targetCr);
    if (targetCrn == null) targetCrn = level;
    const row = crRowByNumber(targetCrn);
    const mon = scaleMonsterToCR(base, row);
    const sug = suggestedCount(players, level, opts.difficulty, row.xp);

    renderMonsterSheet(mon, `
      <div class="section-title">Escalado desde CR base ${base.cr} a CR ${row.cr}</div>
      <div class="stat-line">
        <span><b>Cantidad sugerida</b> ${sug.count}</span>
        <span><b>Presupuesto XP grupal</b> ${sug.totalBudget}</span>
        <span><b>XP por criatura</b> ${row.xp}</span>
      </div>
      <div class="note-box">Estadísticas ajustadas usando la tabla de creación de monstruos por CR.</div>
    `);
    return;
  }

  const sug = suggestedCount(players, level, opts.difficulty, baseRow.xp);
  const mon = monsterFromBaseAsIs(base, baseRow);

  renderMonsterSheet(mon, `
    <div class="section-title">Presupuesto de encuentro</div>
    <div class="stat-line">
      <span><b>Cantidad sugerida</b> ${sug.count}</span>
      <span><b>Presupuesto XP grupal</b> ${sug.totalBudget}</span>
      <span><b>XP por criatura</b> ${baseRow.xp}</span>
    </div>
    <div class="note-box">${base.manual ? 'Se han usado tus estadísticas propias del Taller; se ajusta la cantidad para tus jugadores.' : 'El monstruo conserva su CR original; se ajusta la cantidad para tus jugadores.'}</div>
  `);
}

/* -------- encuentro mixto: varios tipos de monstruo a la vez -------- */

function renderMixedMonsterPicker() {
  const el = document.getElementById('mon-mixed-list');
  if (!el) return;
  const all = getAllMonstersMerged();
  el.innerHTML = all.map(m => `
    <div class="mixed-row">
      <span class="mixed-row-name">${escapeHtml(m.name)} <span style="opacity:.6;">· CR ${m.cr}${m.custom ? ' · personalizado' : ''}</span></span>
      <input type="number" class="mixed-row-qty" data-monster-id="${m.id}" min="0" max="20" value="0">
    </div>`).join('');
}

function collectMixedSelections() {
  const inputs = document.querySelectorAll('#mon-mixed-list .mixed-row-qty');
  const selections = [];
  inputs.forEach(inp => {
    const qty = Number(inp.value) || 0;
    if (qty > 0) {
      const monster = getMonsterById(inp.dataset.monsterId);
      if (monster) selections.push({ monster, qty });
    }
  });
  return selections;
}

function computeMixedEncounter(selections, players, level, difficulty, scaleToParty) {
  const totalCount = selections.reduce((s, x) => s + x.qty, 0);
  const mult = encounterMultiplier(totalCount);
  let totalXP = 0;

  const built = selections.map(({ monster, qty }) => {
    const row = scaleToParty ? crRowByNumber(level) : crRowById(monster.cr);
    const mon = monsterFromBaseAsIs(monster, row);
    totalXP += row.xp * qty;
    return { monster, qty, mon, row };
  });

  const effectiveXP = Math.round(totalXP * mult);
  const perCharBudget = XPTHRESHOLDS[Math.min(20, Math.max(1, level))][DIFFINDEX[difficulty]];
  const totalBudget = perCharBudget * players;

  return { built, totalCount, mult, totalXP, effectiveXP, totalBudget };
}

function generateMixedEncounter(opts) {
  const resultEl = document.getElementById('mon-result');
  const selections = opts.selections || [];

  if (!selections.length) {
    resultEl.innerHTML = '<div class="empty-state">Pon una cantidad mayor que 0 en al menos un monstruo de la lista.</div>';
    return;
  }

  const calc = computeMixedEncounter(selections, opts.players, opts.level, opts.difficulty, opts.scaleToParty);

  let verdict, verdictClass;
  if (calc.effectiveXP < calc.totalBudget * 0.7) { verdict = 'Por debajo de la dificultad elegida'; verdictClass = 'verdict-low'; }
  else if (calc.effectiveXP > calc.totalBudget * 1.3) { verdict = 'Por encima de la dificultad elegida'; verdictClass = 'verdict-high'; }
  else { verdict = 'Ajustado a la dificultad elegida'; verdictClass = 'verdict-ok'; }

  const DIFF_ES = { easy: 'Fácil', medium: 'Media', hard: 'Difícil', deadly: 'Mortal' };

  let html = `
    <div class="sheet">
      <div class="sheet-head">
        <div>
          <div class="sheet-name">Encuentro mixto</div>
          <div class="sheet-sub">${calc.totalCount} criaturas de ${calc.built.length} tipo(s) · Dificultad objetivo: ${DIFF_ES[opts.difficulty] || opts.difficulty}</div>
        </div>
        <div class="sheet-tag">Encuentro</div>
      </div>

      <div class="stat-line">
        <span><b>Presupuesto XP grupal</b> ${calc.totalBudget}</span>
        <span><b>XP total (sin multiplicador)</b> ${calc.totalXP}</span>
        <span><b>Multiplicador (${calc.totalCount} criaturas)</b> ×${calc.mult}</span>
        <span><b>XP efectivo</b> ${calc.effectiveXP}</span>
      </div>
      <div class="note-box ${verdictClass}"><b>${verdict}</b>${opts.scaleToParty ? ' · Todas las criaturas se han escalado al nivel medio del grupo.' : ' · Cada criatura conserva su CR original.'}</div>
    </div>
  `;

  calc.built.forEach(({ monster, qty, mon }) => {
    html += monsterSheetHtml(mon, `<div class="note-box">Cantidad en este encuentro: <b>${qty}</b></div>`);
  });

  resultEl.innerHTML = html;
}

/* -------- visibilidad del formulario -------- */

function refreshMonsterModeUI() {
  const mode = document.querySelector('input[name="monmode"]:checked').value;
  document.getElementById('mon-existing-field').style.display = mode === 'existing' ? 'block' : 'none';
  document.getElementById('mon-scale-fieldset').style.display = mode === 'existing' ? 'block' : 'none';
  document.getElementById('mon-mixed-field').style.display = mode === 'mixed' ? 'block' : 'none';
  if (mode === 'mixed') renderMixedMonsterPicker();
  refreshMonsterScaleUI();
}

function refreshMonsterScaleUI() {
  const mode = document.querySelector('input[name="monmode"]:checked').value;
  const scaleMethod = document.querySelector('input[name="scalemethod"]:checked').value;
  const showCr = mode === 'existing' && scaleMethod === 'cr';
  const showDifficulty = mode !== 'existing' || scaleMethod === 'budget';

  document.getElementById('mon-cr-field').style.display = showCr ? 'block' : 'none';
  document.getElementById('mon-difficulty-field').style.display = showDifficulty ? 'block' : 'none';
}
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

function scaleMonsterToCR(base, row) {
  const dmgAvg = Math.round((row.dmg[0] + row.dmg[1]) / 2);
  const hpAvg = Math.round((row.hp[0] + row.hp[1]) / 2);

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
    attackName: base.attackName || 'Ataque'
  };
}

function buildRandomMonster(row) {
  return {
    name: `${pick(RANDOMADJ)} ${pick(RANDOMNOUN)}`,
    type: pick(RANDOMTYPES),
    cr: row.cr,
    ac: row.ac,
    hp: Math.round((row.hp[0] + row.hp[1]) / 2),
    hpRange: row.hp,
    attackBonus: row.atk,
    dmgPerRound: Math.round((row.dmg[0] + row.dmg[1]) / 2),
    dmgRange: row.dmg,
    saveDC: row.dc,
    prof: row.prof,
    traits: pickN([
      'Visión en la oscuridad 18 m',
      'Resistencia a un tipo de daño a elegir',
      'Ataque múltiple 2 golpes',
      'Ventaja en Percepción',
      'Regeneración menor',
      'Inmune a asustado',
      'Salto potenciado',
      'Sentido sísmico 9 m'
    ], 2),
    attackName: pick(['Garras', 'Mordisco', 'Aguijón', 'Golpe', 'Zarpazo', 'Latigazo de cola', 'Embestida'])
  };
}

function monsterFromBaseAsIs(base, row) {
  const scaled = scaleMonsterToCR(base, row);
  if (!base.manual) return scaled;
  const m = base.manual;
  return {
    ...scaled,
    ac: m.ac ?? scaled.ac,
    hp: m.hp ?? scaled.hp,
    hpRange: m.hp ? [m.hp, m.hp] : scaled.hpRange,
    attackBonus: m.attackBonus ?? scaled.attackBonus,
    dmgPerRound: m.dmgPerRound ?? scaled.dmgPerRound,
    dmgRange: m.dmgPerRound ? [m.dmgPerRound, m.dmgPerRound] : scaled.dmgRange,
    saveDC: m.saveDC ?? scaled.saveDC,
  };
}

function renderMonsterSheet(mon, extra = '') {
  const html = `
    <div class="sheet">
      <div class="sheet-head">
        <div>
          <div class="sheet-name">${mon.name}</div>
          <div class="sheet-sub">${mon.type} · CR ${mon.cr}</div>
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
      <ul class="clean">${mon.traits.map(t => `<li>${t}</li>`).join('')}</ul>

      <div class="section-title">Ataque</div>
      <div class="attack-block">
        <b>${mon.attackName}</b>. ${modStr(mon.attackBonus)} para impactar. Impacto ${mon.dmgPerRound} de daño.
      </div>

      ${extra}
    </div>
  `;

  document.getElementById('mon-result').innerHTML = html;
}

function generateMonster(opts) {
  const players = opts.players;
  const level = opts.level;

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

function refreshMonsterModeUI() {
  const mode = document.querySelector('input[name="monmode"]:checked').value;
  document.getElementById('mon-existing-field').style.display = mode === 'existing' ? 'block' : 'none';
  document.getElementById('mon-scale-fieldset').style.display = mode === 'existing' ? 'block' : 'none';
  refreshMonsterScaleUI();
}

function refreshMonsterScaleUI() {
  const mode = document.querySelector('input[name="monmode"]:checked').value;
  const scaleMethod = document.querySelector('input[name="scalemethod"]:checked').value;
  const showCr = mode === 'random' ? true : scaleMethod === 'cr';
  const showDifficulty = mode === 'random' ? true : scaleMethod === 'budget';

  document.getElementById('mon-cr-field').style.display = showCr ? 'block' : 'none';
  document.getElementById('mon-difficulty-field').style.display = showDifficulty ? 'block' : 'none';
}
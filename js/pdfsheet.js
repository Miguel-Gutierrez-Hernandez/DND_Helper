/* ================= HOJA DE PERSONAJE OFICIAL EN PDF (PNJ y PJ) ================= */
/* Usa la plantilla rellenable de Wizards of the Coast, incrustada en base64 en
   js/pdftemplate.js (ver ese fichero), y la librería pdf-lib (lib/pdf-lib.min.js). */

/* convierte el base64 de la plantilla en bytes binarios reales, sin pasar por fetch() */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* especie del generador -> valor de exportación del desplegable "Race" de la plantilla oficial
   (algunas especies del generador, como aasimar o goliat, no existen en la plantilla de 2014;
   para esas se intenta escribir el nombre igualmente, porque el desplegable admite texto libre) */
const PDF_RACE_MAP = {
  humano: 'human',
  elfo: '2',
  enano: '1',
  mediano: 'lhalf',
  gnomo: 'rgnome',
  draconido: 'dragonborn',
  semiorco: 'horc',
  tiefling: 'tiefling',
};

/* oficio del PNJ -> trasfondo más parecido de la plantilla oficial (solo por sabor, aproximado) */
const PDF_BACKGROUND_MAP = {
  herrero: 'artisan', alquimista: 'artisan', mercader: 'artisan', joyero: 'artisan', sastre: 'artisan',
  sacerdote: 'Acólito',
  guardia: 'Soldado',
  erudito: 'Sabio', encantador: 'Sabio',
  herborista: 'Ermitaño',
  cazador: 'Forastero',
  marinero: 'Marinero',
  ladron: 'Criminal',
  noble: 'Noble',
  tabernero: 'folkhero', granjero: 'folkhero',
};

/* habilidad del generador -> {campo de texto, campo de casilla} de la plantilla oficial */
const PDF_SKILL_FIELD_MAP = {
  'Acrobacias': { text: 'Acrobatics', prof: 'acroPROF' },
  'Trato con Animales': { text: 'AnHan', prof: 'anhanPROF' },
  'Arcanos': { text: 'Arcana', prof: 'arcanaPROF' },
  'Atletismo': { text: 'Athletics', prof: 'athPROF' },
  'Engaño': { text: 'Deception', prof: 'decepPROF' },
  'Historia': { text: 'History', prof: 'histPROF' },
  'Perspicacia': { text: 'Insight', prof: 'insightPROF' },
  'Intimidación': { text: 'Intimidation', prof: 'intimPROF' },
  'Investigación': { text: 'Investigation', prof: 'investPROF' },
  'Medicina': { text: 'Medicine', prof: 'medPROF' },
  'Naturaleza': { text: 'Nature', prof: 'naturePROF' },
  'Percepción': { text: 'Perception', prof: 'perPROF' },
  'Interpretación': { text: 'Performance', prof: 'perfPROF' },
  'Persuasión': { text: 'Persuasion', prof: 'persPROF' },
  'Religión': { text: 'Religion', prof: 'religPROF' },
  'Juego de Manos': { text: 'SleightofHand', prof: 'sohPROF' },
  'Sigilo': { text: 'Stealth', prof: 'stealthPROF' },
  'Supervivencia': { text: 'Survival', prof: 'survPROF' },
};

/* trasfondo del PJ (BACKGROUNDS) -> valor del desplegable "Background" de la plantilla oficial
   (la plantilla es de 2014 y solo tiene 13 opciones; el resto de trasfondos 2024 del generador
   se aproximan al más parecido, igual que se hace con el oficio del PNJ más arriba) */
const PDF_PC_BACKGROUND_MAP = {
  acolito: 'Acólito',
  artista: 'Artista',
  artesano: 'artisan',
  campesino: 'folkhero',
  criminal: 'Criminal',
  'ermitaño': 'Ermitaño',
  erudito: 'Sabio',
  forastero: 'Forastero',
  granjero: 'folkhero',
  guardia: 'Soldado',
  guia: 'Forastero',
  marinero: 'Marinero',
  mercader: 'artisan',
  noble: 'Noble',
  sabio: 'Sabio',
  soldado: 'Soldado',
};

/* característica de lanzamiento -> valor de exportación del desplegable "SpellAbility" */
const PDF_SPELL_ABILITY_CODE = { int: '1', wis: '2', cha: '3' };

/* clase -> valor de exportación del desplegable "SpellClass" (la plantilla de 2014 solo
   incluye estas 7 clases lanzadoras; bardo y druida se dejan sin seleccionar) */
const PDF_SPELL_CLASS_MAP = {
  clerigo: 'cleric',
  paladin: 'paladin',
  explorador: 'ranger',
  hechicero: 'sorc',
  brujo: 'warlock',
  mago: 'wizard',
};

/* reparte los 100 campos "SpellsN" de la plantilla en sus 10 niveles (0-9) según el número
   de líneas real que tiene cada bloque en el PDF: 8 trucos, 12/13/13/13 en niveles 1-4,
   9/9/9 en niveles 5-7 y 7/7 en niveles 8-9 */
const PDF_SPELL_LEVEL_FIELDS = (() => {
  const counts = [8, 12, 13, 13, 13, 9, 9, 9, 7, 7];
  const fields = {};
  let n = 1;
  counts.forEach((count, level) => {
    fields[level] = Array.from({ length: count }, () => `Spells${n++}`);
  });
  return fields;
})();

/* agrupa los hechizos conocidos del PJ por nivel (trucos ya vienen separados en pc.spells.cantrips;
   el resto se resuelve contra la biblioteca de hechizos para saber a qué nivel pertenece cada uno) */
function pcSpellsByLevel(pc) {
  const byLevel = { 0: [...(pc.spells?.cantrips || [])] };
  (pc.spells?.spells || []).forEach(name => {
    const s = resolveSpellByName(name);
    const lvl = s.level || 1;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(name);
  });
  return byLevel;
}

let pdfTemplateBytesCache = null;
async function loadPdfTemplateBytes() {
  if (pdfTemplateBytesCache) return pdfTemplateBytesCache;
  if (typeof PDF_TEMPLATE_BASE64 !== 'string' || !PDF_TEMPLATE_BASE64.length) {
    throw new Error('No se encuentra la plantilla PDF (falta cargar js/pdftemplate.js antes que js/pdfsheet.js).');
  }
  pdfTemplateBytesCache = base64ToBytes(PDF_TEMPLATE_BASE64);
  return pdfTemplateBytesCache;
}

/* helpers defensivos: si un campo no existe en la plantilla o el valor no es válido, se deja en
   blanco en vez de romper el relleno completo del documento */
function pdfSetText(form, name, value) {
  try { form.getTextField(name).setText(value == null ? '' : String(value)); } catch (e) { /* ignorar */ }
}
function pdfSetCheck(form, name, checked) {
  try { const f = form.getCheckBox(name); checked ? f.check() : f.uncheck(); } catch (e) { /* ignorar */ }
}
function pdfSetChoice(form, name, value) {
  if (!value) return;
  try { form.getDropdown(name).select(value); } catch (e) { /* opción no disponible en este campo */ }
}

function npcHitDieFace(npc) {
  const job = OFICIOS.find(o => o.id === npc.jobId);
  return job ? job.hitDie : 8;
}

async function fillNPCPdfSheet(npc) {
  const { PDFDocument } = window.PDFLib;
  const bytes = await loadPdfTemplateBytes();
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();

  const itemBonus = (typeof computeItemBonuses === 'function') ? computeItemBonuses(npc.items) : { ac: 0, atk: 0, dmg: 0 };
  const finalAC = npc.ac + itemBonus.ac;
  const finalAtkBonus = npc.atkBonus + itemBonus.atk;

  // --- encabezado ---
  pdfSetText(form, 'CharacterName', npc.name);
  pdfSetText(form, 'CharacterName 2', npc.name);
  pdfSetText(form, 'ClassLevel', `${npc.jobName} — Nivel ${npc.level}`);
  pdfSetChoice(form, 'Race', PDF_RACE_MAP[npc.raceId] || npc.raceName);
  pdfSetChoice(form, 'Background', PDF_BACKGROUND_MAP[npc.jobId] || '');

  // --- características y modificadores ---
  const ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const PDF_ABIL_PREFIX = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  ABILS.forEach(a => {
    const prefix = PDF_ABIL_PREFIX[a];
    pdfSetText(form, `${prefix}score`, npc.stats[a]);
    pdfSetText(form, `${prefix}bonus`, modStr(abilityMod(npc.stats[a])));
    // el PNJ no tiene lista formal de salvaciones con competencia: se deja el modificador base sin marcar
    pdfSetText(form, `${prefix}save`, modStr(abilityMod(npc.stats[a])));
  });

  // --- combate ---
  pdfSetText(form, 'AC', finalAC);
  pdfSetText(form, 'Init', modStr(abilityMod(npc.stats.dex)));
  pdfSetText(form, 'Speed', `${npc.speed} m`);
  pdfSetText(form, 'HPMax', npc.hp);
  pdfSetText(form, 'CurrentHP', npc.hp);
  pdfSetText(form, 'HitDiceTotal', `${npc.level}d${npcHitDieFace(npc)}`);
  pdfSetText(form, 'ProfBonus', modStr(npc.pb));
  pdfSetText(form, 'PWP', 10 + abilityMod(npc.stats.wis) + (npc.skills.includes('Percepción') ? npc.pb : 0));

  // --- habilidades ---
  Object.entries(PDF_SKILL_FIELD_MAP).forEach(([skill, fieldNames]) => {
    const ability = SKILL_ABILITY_MAP[skill];
    const prof = npc.skills.includes(skill);
    const bonus = abilityMod(npc.stats[ability]) + (prof ? npc.pb : 0);
    pdfSetText(form, fieldNames.text, modStr(bonus));
    pdfSetCheck(form, fieldNames.prof, prof);
  });

  // --- ataque y equipo ---
  pdfSetText(form, 'Attack1', npc.weaponHint);
  pdfSetText(form, 'AtkBonus1', modStr(finalAtkBonus));
  pdfSetText(form, 'ArmorWorn', npc.armorHint);

  const equipmentLines = [`Armadura: ${npc.armorHint}`, `Arma: ${npc.weaponHint}`];
  (npc.items || []).forEach(it => equipmentLines.push(`${it.name} (${it.type}${it.bonus ? ', ' + it.bonus : ''}): ${it.ability}`));
  pdfSetText(form, 'Equipment', equipmentLines.join('\n'));

  // --- personalidad ---
  if (npc.personality) {
    pdfSetText(form, 'PersonalityTraits', npc.personality.trait);
    pdfSetText(form, 'Ideals', npc.personality.ideal);
    pdfSetText(form, 'Bonds', npc.personality.bond);
    pdfSetText(form, 'Flaws', npc.personality.flaw);
  }

  // --- rasgos y notas ---
  const featuresLines = [...(npc.traits || [])];
  if (npc.personality) featuresLines.push(`Frase: ${npc.personality.quote}`);
  pdfSetText(form, 'FeaturesTraits', featuresLines.join('\n'));
  if (npc.notes) pdfSetText(form, 'Backstory', npc.notes);

  // --- tienda (si el oficio lleva una) ---
  if (npc.shopType && npc.shopStock) {
    const parts = [];
    const { services, magicItems } = npc.shopStock;
    if (services && services.length) parts.push('Servicios: ' + services.map(s => s[0]).join(', '));
    if (magicItems && magicItems.length) parts.push('Objetos especiales: ' + magicItems.map(m => m.item).join(', '));
    if (parts.length) pdfSetText(form, 'Treasure', parts.join('\n'));
  }

  return pdfDoc.save();
}

async function downloadNPCPdfSheet(npc) {
  try {
    const bytes = await fillNPCPdfSheet(npc);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${slugify(npc.name)}-hoja-oficial.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert('No se pudo generar el PDF. Comprueba que js/pdftemplate.js y lib/pdf-lib.min.js están cargados correctamente en index.html.');
  }
}

async function downloadCurrentNPCPdfSheet() {
  if (!lastNPCData) return;
  await downloadNPCPdfSheet(lastNPCData);
}

/* ================= HOJA DE PERSONAJE OFICIAL EN PDF (PJ) ================= */

async function fillPCPdfSheet(pc) {
  const { PDFDocument } = window.PDFLib;
  const bytes = await loadPdfTemplateBytes();
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();

  const itemBonus = (typeof computeItemBonuses === 'function') ? computeItemBonuses(pc.items) : { ac: 0, atk: 0, dmg: 0 };
  const finalAC = pc.ac + itemBonus.ac;

  // --- encabezado ---
  pdfSetText(form, 'CharacterName', pc.name);
  pdfSetText(form, 'CharacterName 2', pc.name);
  pdfSetText(form, 'ClassLevel', `${pc.className}${pc.subclassName ? ` (${pc.subclassName})` : ''} — Nivel ${pc.level}`);
  pdfSetChoice(form, 'Race', PDF_RACE_MAP[pc.speciesId] || pc.speciesName);
  pdfSetChoice(form, 'Background', PDF_PC_BACKGROUND_MAP[pc.backgroundId] || pc.backgroundName);

  // --- características, modificadores y salvaciones ---
  const ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const PDF_ABIL_PREFIX = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  ABILS.forEach(a => {
    const prefix = PDF_ABIL_PREFIX[a];
    const prof = (pc.saves || []).includes(a);
    const saveBonus = abilityMod(pc.stats[a]) + (prof ? pc.pb : 0);
    pdfSetText(form, `${prefix}score`, pc.stats[a]);
    pdfSetText(form, `${prefix}bonus`, modStr(abilityMod(pc.stats[a])));
    pdfSetText(form, `${prefix}save`, modStr(saveBonus));
    pdfSetCheck(form, `${prefix}savePROF`, prof);
  });

  // --- combate ---
  pdfSetText(form, 'AC', finalAC);
  pdfSetText(form, 'Init', modStr(abilityMod(pc.stats.dex)));
  pdfSetText(form, 'Speed', `${pc.speed} m`);
  pdfSetText(form, 'HPMax', pc.hp);
  pdfSetText(form, 'CurrentHP', pc.hp);
  pdfSetText(form, 'HitDiceTotal', `${pc.level}d${pc.hitDie}`);
  pdfSetText(form, 'ProfBonus', modStr(pc.pb));
  pdfSetText(form, 'PWP', 10 + abilityMod(pc.stats.wis) + ((pc.skills || []).includes('Percepción') ? pc.pb : 0));

  // --- habilidades ---
  Object.entries(PDF_SKILL_FIELD_MAP).forEach(([skill, fieldNames]) => {
    const ability = SKILL_ABILITY_MAP[skill];
    const prof = (pc.skills || []).includes(skill);
    const bonus = abilityMod(pc.stats[ability]) + (prof ? pc.pb : 0);
    pdfSetText(form, fieldNames.text, modStr(bonus));
    pdfSetCheck(form, fieldNames.prof, prof);
  });

  // --- equipo ---
  pdfSetText(form, 'ArmorWorn', pc.armor);
  pdfSetCheck(form, 'shieldyes', (pc.armor || '').includes('escudo'));

  const equipmentLines = [...(pc.gear || [])];
  (pc.items || []).forEach(it => equipmentLines.push(`${it.name} (${it.type}${it.bonus ? ', ' + it.bonus : ''}): ${it.ability}`));
  pdfSetText(form, 'Equipment', equipmentLines.join('\n'));

  // --- lanzamiento de conjuros ---
  if (pc.casterInfo && pc.spells) {
    const ci = pc.casterInfo;
    const dc = 8 + pc.pb + abilityMod(pc.stats[ci.ability]);
    const atkBonus = pc.pb + abilityMod(pc.stats[ci.ability]);

    pdfSetChoice(form, 'SpellAbility', PDF_SPELL_ABILITY_CODE[ci.ability]);
    pdfSetChoice(form, 'SpellClass', PDF_SPELL_CLASS_MAP[pc.classId]);
    pdfSetText(form, 'SpellSaveDC', dc);
    pdfSetText(form, 'SAB', modStr(atkBonus));
    pdfSetText(form, 'AttacksSpellsMisc', `Aptitud mágica: ${ABILITY_LABEL[ci.ability]} · CD para salvar contra tus conjuros: ${dc} · Bono de ataque con conjuro: ${modStr(atkBonus)}`);

    const byLevel = pcSpellsByLevel(pc);
    Object.entries(PDF_SPELL_LEVEL_FIELDS).forEach(([lvlStr, fieldNames]) => {
      const lvl = Number(lvlStr);
      const names = byLevel[lvl] || [];
      fieldNames.forEach((fname, i) => pdfSetText(form, fname, names[i] || ''));

      if (lvl >= 1) {
        let totalSlots = 0;
        if (ci.pactSlots) totalSlots = lvl === ci.pactLevel ? ci.pactSlots : 0;
        else if (ci.slots) totalSlots = ci.slots[lvl - 1] || 0;
        if (totalSlots) pdfSetText(form, `SlotsTot${lvl}`, totalSlots);
      }
    });
  }

  // --- rasgos y notas ---
  const featuresLines = [...(pc.traits || [])];
  if (pc.subclassName) featuresLines.push(`Subclase: ${pc.subclassName}`);
  const bg = (typeof backgroundById === 'function') ? backgroundById(pc.backgroundId) : null;
  if (bg) featuresLines.push(`Dote de trasfondo: ${bg.feat}`);
  if (pc.improvements && pc.improvements.length) {
    pc.improvements.forEach(i => featuresLines.push(`Nivel ${i.level}: ${i.desc}`));
  }
  pdfSetText(form, 'FeaturesTraits', featuresLines.join('\n'));
  if (pc.notes) pdfSetText(form, 'Backstory', pc.notes);

  return pdfDoc.save();
}

async function downloadPCPdfSheet(pc) {
  try {
    const bytes = await fillPCPdfSheet(pc);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${slugify(pc.name)}-hoja-oficial.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert('No se pudo generar el PDF. Comprueba que js/pdftemplate.js y lib/pdf-lib.min.js están cargados correctamente en index.html.');
  }
}

async function downloadCurrentPCPdfSheet() {
  if (!lastPCData) return;
  await downloadPCPdfSheet(lastPCData);
}
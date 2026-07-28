/* ================= HOJA DE PERSONAJE OFICIAL EN PDF (PNJ) ================= */
/* Usa la plantilla rellenable de Wizards of the Coast (assets/hoja-personaje-dnd.pdf)
   y la librería pdf-lib (lib/pdf-lib.min.js), ambas incluidas dentro del proyecto. */

const PDF_TEMPLATE_PATH = 'assets/hoja-personaje-dnd.pdf';

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

let pdfTemplateBytesCache = null;
async function loadPdfTemplateBytes() {
  if (pdfTemplateBytesCache) return pdfTemplateBytesCache;
  const res = await fetch(PDF_TEMPLATE_PATH);
  if (!res.ok) throw new Error(`No se pudo cargar la plantilla PDF (${res.status})`);
  pdfTemplateBytesCache = await res.arrayBuffer();
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
    alert('No se pudo generar el PDF. Si has abierto la app haciendo doble clic en index.html, prueba a servirla con un servidor local (ver README) para que el navegador pueda cargar la plantilla.');
  }
}

async function downloadCurrentNPCPdfSheet() {
  if (!lastNPCData) return;
  await downloadNPCPdfSheet(lastNPCData);
}
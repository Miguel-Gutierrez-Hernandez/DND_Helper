const MEMORYSTORE = {
  npc: [],
  pc: [],
  cmonster: [],
  citem: [],
  cspell: []
};

let storageBackend = 'memory';

async function storeSave(ns, data) {
  try {
    if (window.storage) {
      const res = await window.storage.set(ns + ':' + data.id, JSON.stringify(data), false);
      if (res) storageBackend = 'storage';
      return { ok: true, backend: 'storage' };
    }
  } catch (e) {
    console.warn('Almacenamiento persistente no disponible, usando memoria de sesión.', e);
  }

  storageBackend = 'memory';
  const arr = MEMORYSTORE[ns];
  const idx = arr.findIndex(n => n.id === data.id);
  if (idx >= 0) arr[idx] = data;
  else arr.push(data);
  return { ok: true, backend: 'memory' };
}

async function storeList(ns) {
  try {
    if (window.storage) {
      const res = await window.storage.list(ns + ':', false);
      if (res && res.keys) {
        const items = [];
        for (const k of res.keys) {
          try {
            const r = await window.storage.get(k, false);
            if (r && r.value) items.push(JSON.parse(r.value));
          } catch {}
        }
        storageBackend = 'storage';
        items.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        return items;
      }
    }
  } catch (e) {
    console.warn('Almacenamiento persistente no disponible, usando memoria de sesión.', e);
  }

  storageBackend = 'memory';
  return [...MEMORYSTORE[ns]].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

async function storeDelete(ns, id) {
  try {
    if (window.storage) {
      await window.storage.delete(ns + ':' + id, false);
      return;
    }
  } catch {}

  const arr = MEMORYSTORE[ns];
  const idx = arr.findIndex(n => n.id === id);
  if (idx >= 0) arr.splice(idx, 1);
}

async function saveNPCData(d) { return storeSave('npc', d); }
async function listSavedNPCs() { return storeList('npc'); }
async function deleteSavedNPC(id) { return storeDelete('npc', id); }

async function savePCData(d) { return storeSave('pc', d); }
async function listSavedPCs() { return storeList('pc'); }
async function deleteSavedPC(id) { return storeDelete('pc', id); }

async function saveCustomMonster(d) { return storeSave('cmonster', d); }
async function listCustomMonsters() { return storeList('cmonster'); }
async function deleteCustomMonster(id) { return storeDelete('cmonster', id); }

async function saveCustomItem(d) { return storeSave('citem', d); }
async function listCustomItems() { return storeList('citem'); }
async function deleteCustomItem(id) { return storeDelete('citem', id); }

async function saveCustomSpell(d) { return storeSave('cspell', d); }
async function listCustomSpells() { return storeList('cspell'); }
async function deleteCustomSpell(id) { return storeDelete('cspell', id); }

async function refreshCustomSpellsCache() {
  window.CUSTOMSPELLSCACHE = await listCustomSpells();
}
// Capa de persistencia local (localStorage). Todo vive en el dispositivo del usuario.
const Storage = (() => {
  const SETTINGS_KEY = "pesalo_settings_v1";
  const LOG_PREFIX = "pesalo_log_";
  const LEGACY_RECENT_KEY = "pesalo_recent_v1";
  const RECENT_KEY = "pesalo_recent_v2";
  const FAVS_KEY = "pesalo_favs_v1";
  const CREATED_KEY = "pesalo_created_v1";
  const SCHEMA_KEY = "pesalo_schema_v2";

  const DEFAULT_SETTINGS = {
    goalKcal: 2000,
    macroPct: { protein: 30, carbs: 40, fat: 30 }
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function todayKey(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ---------- Ajustes ----------
  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) };
  }

  function saveSettings(settings) {
    writeJson(SETTINGS_KEY, settings);
  }

  // ---------- Diario ----------
  function getLog(dateKey) {
    return readJson(LOG_PREFIX + dateKey, []);
  }

  function saveLog(dateKey, entries) {
    writeJson(LOG_PREFIX + dateKey, entries);
  }

  function hasLog(dateKey) {
    return getLog(dateKey).length > 0;
  }

  function addEntry(dateKey, entry) {
    const entries = getLog(dateKey);
    entries.push(entry);
    saveLog(dateKey, entries);
    return entries;
  }

  function updateEntry(dateKey, entryId, entry) {
    const entries = getLog(dateKey).map(e => (e.id === entryId ? entry : e));
    saveLog(dateKey, entries);
    return entries;
  }

  function removeEntry(dateKey, entryId) {
    const entries = getLog(dateKey).filter(e => e.id !== entryId);
    saveLog(dateKey, entries);
    return entries;
  }

  function allLogKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOG_PREFIX)) keys.push(k.slice(LOG_PREFIX.length));
    }
    return keys.sort();
  }

  // ---------- Recientes: { food, sel, label, kcal, ts } ----------
  function getRecents() {
    return readJson(RECENT_KEY, []);
  }

  function pushRecent(rec) {
    const key = rec.food.name.toLowerCase();
    const list = getRecents().filter(r => r.food.name.toLowerCase() !== key);
    list.unshift(rec);
    writeJson(RECENT_KEY, list.slice(0, 300));
  }

  // ---------- Favoritos (snapshots de alimentos) ----------
  function getFavs() {
    return readJson(FAVS_KEY, []);
  }

  function isFav(name) {
    const key = name.toLowerCase();
    return getFavs().some(f => f.name.toLowerCase() === key);
  }

  function toggleFav(food) {
    const key = food.name.toLowerCase();
    const favs = getFavs();
    const exists = favs.some(f => f.name.toLowerCase() === key);
    const next = exists ? favs.filter(f => f.name.toLowerCase() !== key) : [food, ...favs];
    writeJson(FAVS_KEY, next);
    return !exists;
  }

  // ---------- Alimentos creados por el usuario ----------
  function getCreated() {
    return readJson(CREATED_KEY, []);
  }

  function addCreated(food) {
    const key = food.name.toLowerCase();
    const list = getCreated().filter(f => f.name.toLowerCase() !== key);
    list.unshift(food);
    writeJson(CREATED_KEY, list.slice(0, 300));
  }

  // Alimentos propios (creados + escaneados) para el buscador y el escaner.
  function getPersonalFoods() {
    const seen = new Set();
    const out = [];
    const push = f => {
      const k = f.name.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(f); }
    };
    getCreated().forEach(push);
    getRecents().filter(r => r.food.source !== "common").forEach(r => push(r.food));
    return out;
  }

  function findByBarcode(barcode) {
    if (!barcode) return null;
    const pools = [getCreated(), getRecents().map(r => r.food), getFavs()];
    for (const pool of pools) {
      const hit = pool.find(f => f.barcode === barcode);
      if (hit) return hit;
    }
    return null;
  }

  // ---------- Migracion ----------
  function isMigrated() { return !!localStorage.getItem(SCHEMA_KEY); }
  function markMigrated() { localStorage.setItem(SCHEMA_KEY, "1"); }
  function getLegacyRecents() { return readJson(LEGACY_RECENT_KEY, []); }
  function dropLegacyRecents() { localStorage.removeItem(LEGACY_RECENT_KEY); }
  function setRecents(list) { writeJson(RECENT_KEY, list); }

  function clearAll() {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("pesalo_")) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }

  return {
    todayKey, getSettings, saveSettings,
    getLog, saveLog, hasLog, addEntry, updateEntry, removeEntry, allLogKeys,
    getRecents, pushRecent, setRecents,
    getFavs, isFav, toggleFav,
    getCreated, addCreated, getPersonalFoods, findByBarcode,
    isMigrated, markMigrated, getLegacyRecents, dropLegacyRecents,
    clearAll
  };
})();

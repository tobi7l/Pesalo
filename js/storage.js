// Capa de persistencia local (localStorage). Todo vive en el dispositivo del usuario.
const Storage = (() => {
  const SETTINGS_KEY = "pesalo_settings_v1";
  const LOG_PREFIX = "pesalo_log_";
  const RECENT_KEY = "pesalo_recent_v1";

  const DEFAULT_SETTINGS = {
    goalKcal: 2000,
    macroPct: { protein: 30, carbs: 40, fat: 30 }
  };

  function todayKey(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function getLog(dateKey) {
    try {
      const raw = localStorage.getItem(LOG_PREFIX + dateKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLog(dateKey, entries) {
    localStorage.setItem(LOG_PREFIX + dateKey, JSON.stringify(entries));
  }

  function addEntry(dateKey, entry) {
    const entries = getLog(dateKey);
    entries.push(entry);
    saveLog(dateKey, entries);
    return entries;
  }

  function removeEntry(dateKey, entryId) {
    const entries = getLog(dateKey).filter(e => e.id !== entryId);
    saveLog(dateKey, entries);
    return entries;
  }

  function getRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addRecent(food) {
    // Esto funciona como la base de datos propia del usuario: cada alimento
    // manual o ya usado queda guardado (sin limite chico) para futuras busquedas.
    let recent = getRecent().filter(f => f.name.toLowerCase() !== food.name.toLowerCase());
    recent.unshift(food);
    recent = recent.slice(0, 300);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }

  function findByBarcode(barcode) {
    if (!barcode) return null;
    return getRecent().find(f => f.barcode === barcode) || null;
  }

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
    getLog, saveLog, addEntry, removeEntry,
    getRecent, addRecent, findByBarcode,
    clearAll
  };
})();

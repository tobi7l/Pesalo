(() => {
  const MEALS = [
    { key: "desayuno", label: "Desayuno" },
    { key: "almuerzo", label: "Almuerzo" },
    { key: "merienda", label: "Merienda" },
    { key: "cena", label: "Cena" }
  ];
  const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
  const CAL_PER_GRAM = { Protein: 4, Carbs: 4, Fat: 9 };

  const SVG_FLAME = '<svg class="ic-flame" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.500 2s.8 3.300-1 5.800C9.800 10 8 11.500 8 14.200c0 .6.100 1.100.3 1.600C7 15 6.300 13.600 6.500 12 5.200 13.500 4.500 15.200 4.500 17c0 3.200 3.200 5 7.500 5s7.500-1.800 7.500-5c0-3.300-2.300-5.200-3.600-7.300-.8.900-1.700 1.200-2.400 1-.1-1.800.2-4-.8-6.400-.3-.8-.7-1.600-1.200-2.300z"/></svg>';
  const SVG_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>';
  const SVG_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4.500v15M4.500 12h15"/></svg>';

  const SVG_TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.500 7h15M9.500 7V4.800h5V7M6.500 7l.8 12.200h9.400L17.500 7M10 11v5.500M14 11v5.500"/></svg>';

  const $ = (id) => document.getElementById(id);
  // El icono se deriva siempre del nombre (asi se corrigen los guardados con reglas viejas).
  const iconOf = (storedIcon, name) => FoodApi.iconFor(name);
  const mealLabel = (key) => MEALS.find(m => m.key === key).label;
  const fmtInt = (n) => Math.round(n).toLocaleString("es-AR");
  const fmtG = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: n < 10 ? 1 : 0 });

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function guessMealByTime(date) {
    const h = (date || new Date()).getHours();
    if (h >= 5 && h < 11) return "desayuno";
    if (h >= 11 && h < 16) return "almuerzo";
    if (h >= 16 && h < 20) return "merienda";
    return "cena";
  }

  const state = {
    currentDate: new Date(),
    settings: Storage.getSettings(),
    selectedMeal: null,   // comida preseleccionada al entrar a Buscar
    searchTab: "db",
    showAllRecents: false,
    sheet: null,          // alimento abierto en la hoja de detalle
    pendingBarcode: null, // codigo escaneado esperando carga manual
    mealPreview: null,    // comida reciente abierta en el modal
    linkBarcode: null     // codigo escaneado que se va a vincular a un alimento
  };

  // ---------- Fechas ----------
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function sundayOf(d) {
    return addDays(d, -d.getDay());
  }

  function sameDay(a, b) {
    return a.toDateString() === b.toDateString();
  }

  function dateLabel(d) {
    const today = new Date();
    if (sameDay(d, today)) return "Hoy";
    if (sameDay(d, addDays(today, -1))) return "Ayer";
    if (sameDay(d, addDays(today, 1))) return "Mañana";
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  }

  const dateKey = (d) => Storage.todayKey(d);

  function parseKey(k) {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // ---------- Datos viejos (esquema anterior) ----------
  const LEGACY_QUALS = new Set(["crudo", "cocido", "con hueso", "sin hueso"]);

  // "Chuleta de cerdo (crudo, con hueso)" -> { base, quals }
  function parseLegacyName(full) {
    const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(full);
    if (m) {
      const parts = m[2].split(",").map(s => s.trim().toLowerCase());
      if (parts.every(p => LEGACY_QUALS.has(p))) return { base: m[1].trim(), quals: parts };
    }
    return { base: full, quals: [] };
  }

  // Reconstruye alimento + seleccion a partir de una entrada guardada en el esquema viejo.
  function resolveLegacyEntry(entry) {
    const { base, quals } = parseLegacyName(entry.name);
    const norm = FoodApi.normalize;
    let food = FoodApi.findCommon(base)
      || Storage.getPersonalFoods().find(f => norm(f.name) === norm(entry.name));
    if (!food) {
      const k = entry.grams > 0 ? 100 / entry.grams : 0;
      food = FoodApi.makeCustomFood({
        name: base, kcal: entry.kcal * k, protein: entry.protein * k,
        carbs: entry.carbs * k, fat: entry.fat * k, source: "created"
      });
    }
    const sel = FoodApi.defaultSelection(food);
    sel.qty = entry.grams;
    sel.portion = "gramos";
    if (food.variants) sel.variant = quals.includes("cocido") ? "cocido" : "crudo";
    if (food.boneFraction) sel.bone = quals.includes("sin hueso") ? "sin" : "con";
    if (food.unitGrams && entry.grams > 0 && entry.grams % food.unitGrams === 0) {
      sel.portion = "unidad";
      sel.qty = entry.grams / food.unitGrams;
    }
    return { food, sel };
  }

  function migrateLegacy() {
    if (Storage.isMigrated()) return;

    Storage.getLegacyRecents().forEach(item => {
      if (FoodApi.findCommon(parseLegacyName(item.name).base)) return;
      Storage.addCreated(FoodApi.makeCustomFood({
        name: item.name, kcal: item.kcal, protein: item.protein,
        carbs: item.carbs, fat: item.fat, barcode: item.barcode, source: "created"
      }));
    });

    const entries = [];
    Storage.allLogKeys().forEach(k => Storage.getLog(k).forEach(e => { if (!e.food) entries.push(e); }));
    entries.sort((a, b) => String(b.time).localeCompare(String(a.time)));
    const recents = [];
    const seen = new Set();
    for (const e of entries) {
      const { food, sel } = resolveLegacyEntry(e);
      const key = food.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      recents.push({ food, sel, label: FoodApi.qtyLabel(food, sel), kcal: e.kcal, ts: e.time });
      if (recents.length >= 40) break;
    }
    Storage.setRecents(recents);
    Storage.dropLegacyRecents();
    Storage.markMigrated();
  }

  function mealOf(entry) {
    return entry.meal || guessMealByTime(new Date(entry.time));
  }

  // Los alimentos genericos guardados antes toman las propiedades nuevas (hueso,
  // cascara, etc.) de la lista actual, completando lo que falte de la seleccion.
  function refreshCommon(food, sel) {
    const out = { food, sel: { ...(sel || FoodApi.defaultSelection(food)) } };
    if (food.source !== "common") return out;
    const fresh = FoodApi.findCommon(food.name);
    if (!fresh) return out;
    const def = FoodApi.defaultSelection(fresh);
    ["variant", "bone", "peel"].forEach(k => { if (def[k] && !out.sel[k]) out.sel[k] = def[k]; });
    out.food = fresh;
    return out;
  }

  // food + seleccion de una entrada (nueva o del esquema viejo)
  function resolveEntry(entry) {
    return entry.food ? refreshCommon(entry.food, entry.sel) : resolveLegacyEntry(entry);
  }

  function buildEntryData(food, sel, meal) {
    const calc = FoodApi.compute(food, sel);
    return {
      name: food.name,
      icon: iconOf(food.icon, food.name),
      qualifiers: FoodApi.qualifiersOf(food, sel),
      grams: calc.grams,
      qty: sel.qty,
      portion: sel.portion,
      label: FoodApi.qtyLabel(food, sel),
      kcal: calc.kcal, protein: calc.protein, carbs: calc.carbs, fat: calc.fat,
      food,
      sel: { ...sel },
      meal
    };
  }

  function newEntry(data, done) {
    return {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      time: new Date().toISOString(),
      done: done !== false,
      ...data
    };
  }

  // Datos para mostrar una entrada (nueva o del esquema viejo).
  function entryView(e) {
    if (e.food) {
      return { name: e.name, icon: iconOf(e.icon || e.food.icon, e.name), quals: e.qualifiers || [], label: e.label };
    }
    const { base, quals } = parseLegacyName(e.name);
    const { food, sel } = resolveLegacyEntry(e);
    return { name: base, icon: iconOf(food.icon, base), quals, label: FoodApi.qtyLabel(food, sel) };
  }

  // ---------- Navegacion ----------
  // Orden de las pantallas en la barra: define desde que lado entra cada una.
  const SCREEN_ORDER = { hoy: 0, buscar: 1, ajustes: 2 };
  let currentScreen = "hoy";
  let navTimer = null;

  function showScreen(name, meal) {
    const prev = $("screen-" + currentScreen);
    const next = $("screen-" + name);
    const dir = SCREEN_ORDER[name] - SCREEN_ORDER[currentScreen];
    const y = window.scrollY;

    clearTimeout(navTimer);
    document.querySelectorAll(".screen").forEach(s => {
      s.classList.remove("active", "enter-right", "enter-left", "leaving", "leave-left", "leave-right");
      s.style.top = "";
    });
    next.classList.add("active");
    if (dir !== 0) {
      // La anterior sigue visible, quieta donde estaba, mientras sale por el lado opuesto.
      prev.style.top = -y + "px";
      prev.classList.add("leaving", dir > 0 ? "leave-left" : "leave-right");
      next.classList.add(dir > 0 ? "enter-right" : "enter-left");
      navTimer = setTimeout(() => {
        prev.classList.remove("leaving", "leave-left", "leave-right");
        prev.style.top = "";
        next.classList.remove("enter-right", "enter-left");
      }, 300);
    }
    currentScreen = name;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.screen === name));
    window.scrollTo(0, 0);

    if (name === "buscar") {
      clearLink();
      state.selectedMeal = meal || guessMealByTime();
      $("buscarTitle").textContent = "Agregar a " + mealLabel(state.selectedMeal);
      $("searchInput").value = "";
      state.searchTab = "db";
      state.showAllRecents = false;
      renderSearch();
    }
    if (name === "ajustes") loadSettingsIntoForm();
    if (name === "hoy") renderPlan();
  }

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });
  $("closeBuscar").addEventListener("click", () => showScreen("hoy"));
  $("editGoalsBtn").addEventListener("click", () => showScreen("ajustes"));
  $("kcalTitleBtn").addEventListener("click", () => showScreen("ajustes"));
  document.querySelectorAll(".sc-macro").forEach(b => b.addEventListener("click", () => showScreen("ajustes")));

  // ---------- Plan: tira semanal ----------
  function renderWeekStrip() {
    const strip = $("weekStrip");
    strip.innerHTML = "";
    const sunday = sundayOf(state.currentDate);
    for (let i = 0; i < 7; i++) {
      const d = addDays(sunday, i);
      const sel = sameDay(d, state.currentDate);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wd" + (sel ? " sel" : "");
      btn.innerHTML = `<span class="wd-letter">${DAY_LETTERS[i]}</span><span class="wd-num">${d.getDate()}</span>` +
        `<span class="wd-dot${Storage.hasLog(dateKey(d)) ? " has" : ""}"></span>`;
      btn.addEventListener("click", () => { state.currentDate = d; renderPlan(); });
      strip.appendChild(btn);
    }
  }

  let swipeX = null;
  $("weekStrip").addEventListener("touchstart", (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
  $("weekStrip").addEventListener("touchend", (e) => {
    if (swipeX === null) return;
    const dx = e.changedTouches[0].clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) < 50) return;
    state.currentDate = addDays(state.currentDate, dx < 0 ? 7 : -7);
    renderPlan();
  }, { passive: true });

  $("datePicker").addEventListener("change", (e) => {
    const [y, m, d] = e.target.value.split("-").map(Number);
    if (!y) return;
    state.currentDate = new Date(y, m - 1, d);
    renderPlan();
  });

  // ---------- Plan: resumen con arco ----------
  const BZ = [[10, 54], [150, 6], [290, 54]];

  function bezPoint(u) {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [
      a * BZ[0][0] + b * BZ[1][0] + c * BZ[2][0],
      a * BZ[0][1] + b * BZ[1][1] + c * BZ[2][1]
    ];
  }

  const BZ_TABLE = (() => {
    const table = [{ u: 0, len: 0 }];
    let prev = bezPoint(0);
    let acc = 0;
    for (let i = 1; i <= 200; i++) {
      const u = i / 200;
      const p = bezPoint(u);
      acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      table.push({ u, len: acc });
      prev = p;
    }
    return table;
  })();
  const BZ_LEN = BZ_TABLE[BZ_TABLE.length - 1].len;

  // El arco se llena de forma lineal: llegar a la meta lo completa.
  // Amarillo hasta el 90% de la meta, verde entre el 90% y el 110%, rojo si se pasa.
  function renderGauge(eaten, goal) {
    const fill = $("gaugeFill");
    const fraction = goal > 0 ? Math.min(1, eaten / goal) : 0;
    fill.style.strokeDasharray = `${(fraction * BZ_LEN).toFixed(2)} ${BZ_LEN.toFixed(2)}`;
    fill.style.opacity = eaten > 0 ? 1 : 0;
    fill.style.stroke = eaten > goal * 1.1 ? "var(--red)" : eaten >= goal * 0.9 ? "var(--green)" : "var(--accent)";

    $("gaugeTicks").innerHTML = "";
    const labels = $("gaugeLabels");
    labels.innerHTML = "";
    [[BZ[0][0], 0], [BZ[2][0], goal]].forEach(([x, value]) => {
      const label = document.createElement("span");
      label.className = "gauge-label";
      label.style.left = (x / 300 * 100) + "%";
      label.textContent = fmtInt(value);
      labels.appendChild(label);
    });
  }

  function computeMacroTargets(settings) {
    const goal = settings.goalKcal;
    const pct = settings.macroPct;
    return {
      proteinG: Math.round((goal * pct.protein / 100) / 4),
      carbsG: Math.round((goal * pct.carbs / 100) / 4),
      fatG: Math.round((goal * pct.fat / 100) / 9)
    };
  }

  function sumEntries(list) {
    return list.reduce((acc, e) => {
      acc.kcal += e.kcal; acc.protein += e.protein; acc.carbs += e.carbs; acc.fat += e.fat;
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function setMacro(key, value, target) {
    $("mv" + key).innerHTML = `${Math.round(value)} / ${target}<span class="unit"> g</span>`;
    $("mb" + key).style.width = (target > 0 ? Math.min(100, value / target * 100) : 0) + "%";
  }

  function renderMini(totals, goal, targets) {
    const col = (name, val, ratio, cls) =>
      `<div class="mini-col"><span class="mc-name">${name}</span><span class="mc-val">${val}</span>` +
      `<span class="bar-track"><span class="bar-fill ${cls}" style="width:${Math.min(100, Math.max(0, ratio * 100))}%"></span></span></div>`;
    const ratio = (v, t) => (t > 0 ? v / t : 0);
    $("miniSummary").innerHTML =
      col("kcal", `${fmtInt(totals.kcal)} / ${fmtInt(goal)}`, ratio(totals.kcal, goal), "kcal") +
      col("Proteínas", `${Math.round(totals.protein)} / ${targets.proteinG} g`, ratio(totals.protein, targets.proteinG), "protein") +
      col("Carbs", `${Math.round(totals.carbs)} / ${targets.carbsG} g`, ratio(totals.carbs, targets.carbsG), "carbs") +
      col("Grasas", `${Math.round(totals.fat)} / ${targets.fatG} g`, ratio(totals.fat, targets.fatG), "fat");
  }

  // ---------- Plan: comidas ----------
  const SWIPE_OPEN = 84;

  function closeSwipes(except) {
    document.querySelectorAll(".entry-wrap.open").forEach(w => {
      if (w === except) return;
      w.classList.remove("open");
      w.querySelector(".entry-row").style.transform = "";
    });
  }

  function attachSwipe(wrap, row) {
    let sx = 0, sy = 0, base = 0, cur = 0, horiz = null;
    row.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      base = wrap.classList.contains("open") ? -SWIPE_OPEN : 0;
      cur = base;
      horiz = null;
      row.style.transition = "none";
    }, { passive: true });
    row.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (horiz === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        horiz = Math.abs(dx) > Math.abs(dy);
        if (horiz) closeSwipes(wrap);
      }
      if (!horiz) return;
      cur = Math.max(-SWIPE_OPEN - 16, Math.min(0, base + dx));
      row.style.transform = `translateX(${cur}px)`;
    }, { passive: true });
    row.addEventListener("touchend", () => {
      row.style.transition = "";
      if (!horiz) return;
      const open = cur < -SWIPE_OPEN / 2;
      wrap.classList.toggle("open", open);
      row.style.transform = open ? `translateX(${-SWIPE_OPEN}px)` : "";
      wrap._swipedAt = Date.now();
    }, { passive: true });
  }

  function entryRow(entry, dk) {
    const v = entryView(entry);
    const done = entry.done !== false;
    const wrap = document.createElement("div");
    wrap.className = "entry-wrap";
    wrap.innerHTML =
      `<button class="er-del" type="button" aria-label="Eliminar">${SVG_TRASH}</button>` +
      `<div class="entry-row${done ? "" : " off"}">` +
        `<button class="er-main" type="button">` +
          `<span class="er-icon">${v.icon}</span>` +
          `<span class="er-name-wrap"><span class="er-name">${esc(v.name)}</span>` +
            (v.quals.length ? `<span class="er-qual">${esc(v.quals.join(" · "))}</span>` : "") +
          `</span>` +
          `<span class="er-right"><span class="er-qty">${esc(v.label)}</span><span class="er-kcal">${Math.round(entry.kcal)} kcal</span></span>` +
        `</button>` +
        `<button class="er-check${done ? " on" : ""}" type="button" aria-label="Marcar como comido">${SVG_CHECK}</button>` +
      `</div>`;

    const row = wrap.querySelector(".entry-row");
    attachSwipe(wrap, row);

    const guarded = (fn) => () => {
      if (wrap.classList.contains("open")) { closeSwipes(); return; }
      if (Date.now() - (wrap._swipedAt || 0) < 350) return;
      fn();
    };

    wrap.querySelector(".er-main").addEventListener("click", guarded(() => {
      const { food, sel } = resolveEntry(entry);
      openSheet({ food, sel, mode: "edit", entry, dateKey: dk, meal: mealOf(entry) });
    }));
    wrap.querySelector(".er-check").addEventListener("click", guarded(() => {
      Storage.updateEntry(dk, entry.id, { ...entry, done: !done });
      renderPlan();
    }));
    wrap.querySelector(".er-del").addEventListener("click", () => {
      Storage.removeEntry(dk, entry.id);
      renderPlan();
      showToast("Eliminado");
    });
    return wrap;
  }

  function renderMeals(entries, dk) {
    const box = $("mealsContainer");
    box.innerHTML = "";
    MEALS.forEach(meal => {
      const list = entries.filter(e => mealOf(e) === meal.key);
      const t = sumEntries(list.filter(e => e.done !== false));
      const card = document.createElement("div");
      card.className = "meal-card";
      card.innerHTML =
        `<div class="mc-head"><h3>${meal.label}</h3>` +
        `<div class="mc-sub">${SVG_FLAME}<span>${Math.round(t.kcal)} kcal &bull; ${Math.round(t.protein)} P | ${Math.round(t.carbs)} C | ${Math.round(t.fat)} G</span></div></div>` +
        `<div class="entries"></div>` +
        `<button class="meal-add" type="button" aria-label="Agregar a ${meal.label}">${SVG_PLUS}</button>`;
      const entriesBox = card.querySelector(".entries");
      list.forEach(e => entriesBox.appendChild(entryRow(e, dk)));
      card.querySelector(".meal-add").addEventListener("click", () => showScreen("buscar", meal.key));
      box.appendChild(card);
    });
  }

  function renderPlan() {
    const dk = dateKey(state.currentDate);
    const entries = Storage.getLog(dk);
    const goal = state.settings.goalKcal;
    const targets = computeMacroTargets(state.settings);
    const totals = sumEntries(entries.filter(e => e.done !== false));

    $("dateLabel").textContent = dateLabel(state.currentDate);
    $("datePicker").value = dk;
    renderWeekStrip();

    $("kcalEaten").textContent = fmtInt(totals.kcal);
    $("kcalGoal").textContent = fmtInt(goal);
    renderGauge(totals.kcal, goal);
    setMacro("Protein", totals.protein, targets.proteinG);
    setMacro("Carbs", totals.carbs, targets.carbsG);
    setMacro("Fat", totals.fat, targets.fatG);
    renderMini(totals, goal, targets);
    renderMeals(entries, dk);
    updateMiniSummary();
  }

  // El resumen compacto aparece de a poco cuando la informacion de la tarjeta grande
  // (sobre todo los macros, en su parte de abajo) se esta tapando bajo la tira de dias.
  const MINI_START_PX = 40;  // arranca cuando el borde inferior de la tarjeta esta a este margen de la tira
  const MINI_FADE_PX = 50;   // y queda completo tras este tramo de scroll

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function updateMiniSummary() {
    const mini = $("miniSummary");
    const card = $("summaryCard");
    const cover = document.querySelector(".status-cover");
    if (!card.offsetParent) { cover.style.opacity = ""; return; }

    const sticky = $("weekStrip").parentElement;
    const stuckTop = parseFloat(getComputedStyle(sticky).top) || 0;

    // 1) La tira de dias toma el fondo de vidrio justo cuando queda fija arriba
    //    (el titulo "Hoy" ya salio de pantalla).
    const headerBottom = document.querySelector(".diary-top").getBoundingClientRect().bottom;
    const glass = clamp01((stuckTop + 10 - headerBottom) / 16);
    sticky.style.setProperty("--glass", glass.toFixed(3));
    cover.style.opacity = (1 - glass).toFixed(3); // el tapon solido de la barra de estado cede al vidrio

    // 2) Despues el panel crece y muestra los objetivos, a medida que la tarjeta grande se tapa.
    //    Borde inferior de la tira ya fija (no donde esta al inicio, con el titulo encima).
    const stuckBottom = stuckTop + sticky.offsetHeight;
    const p = clamp01((stuckBottom + MINI_START_PX - card.getBoundingClientRect().bottom) / MINI_FADE_PX);
    mini.style.visibility = p > 0 ? "visible" : "hidden";
    mini.style.opacity = p.toFixed(3);
    mini.style.clipPath = `inset(0 0 ${((1 - p) * 100).toFixed(1)}% 0)`;
    sticky.style.setProperty("--ext", (mini.offsetHeight * p).toFixed(1) + "px");
  }

  window.addEventListener("scroll", updateMiniSummary, { passive: true });
  window.addEventListener("resize", updateMiniSummary);

  // ---------- Buscar ----------
  function foodRow(food, sel, onClick) {
    const calc = FoodApi.compute(food, sel);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "food-row";
    btn.innerHTML =
      `<span class="fr-icon">${iconOf(food.icon, food.name)}</span>` +
      `<span class="fr-main"><span class="fr-name">${esc(food.name)}</span><span class="fr-sub">${esc(food.subtitle)}</span></span>` +
      `<span class="fr-right"><span class="fr-qty">${esc(FoodApi.qtyLabel(food, sel))}</span><span class="fr-kcal">${Math.round(calc.kcal)} kcal</span></span>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function openFood(food, sel) {
    const r = refreshCommon(food, sel);
    openSheet({ food: r.food, sel: r.sel, mode: "add" });
  }

  function emptyState(text) {
    const d = document.createElement("div");
    d.className = "empty-state";
    d.textContent = text;
    return d;
  }

  function createButton() {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "create-btn";
    b.textContent = "+ Crear alimento";
    b.addEventListener("click", () => { state.pendingBarcode = null; openManualModal(); });
    return b;
  }

  function renderSearch() {
    document.querySelectorAll("#searchTabs .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === state.searchTab));
    const box = $("tabContent");
    box.innerHTML = "";
    const q = $("searchInput").value.trim();

    if (state.searchTab === "db") {
      if (q) {
        const personal = Storage.getPersonalFoods();
        const results = FoodApi.search(q, personal);
        if (Products.isLoaded()) {
          const owned = new Set(personal.map(f => f.barcode).filter(Boolean));
          Products.search(q, 40).forEach(f => { if (!owned.has(f.barcode)) results.push(f); });
        } else {
          Products.load().then(() => {
            if (state.searchTab === "db" && $("searchInput").value.trim() === q) renderSearch();
          });
        }
        if (!results.length) {
          box.appendChild(emptyState("No encontramos ese alimento. Podés crearlo con los datos de la etiqueta."));
        } else {
          results.forEach(f => box.appendChild(foodRow(f, FoodApi.defaultSelection(f), () => openFood(f))));
        }
        box.appendChild(createButton());
        return;
      }
      const title = document.createElement("div");
      title.className = "recent-title";
      title.textContent = "Ingresado recientemente";
      box.appendChild(title);
      const recents = Storage.getRecents();
      if (!recents.length) {
        box.appendChild(emptyState("Todavía no registraste alimentos. Buscá arriba o usá el escáner."));
      }
      recents.slice(0, state.showAllRecents ? 30 : 5).forEach(r => {
        box.appendChild(foodRow(r.food, r.sel, () => openFood(r.food, r.sel)));
      });
      if (recents.length > 5) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "pill-btn";
        more.textContent = state.showAllRecents ? "VER MENOS ▴" : "VER MÁS ▾";
        more.addEventListener("click", () => { state.showAllRecents = !state.showAllRecents; renderSearch(); });
        box.appendChild(more);
      }

      const mealsTitle = document.createElement("div");
      mealsTitle.className = "recent-title";
      mealsTitle.textContent = "Comidas recientes";
      box.appendChild(mealsTitle);
      const meals = recentMeals();
      if (!meals.length) {
        const empty = emptyState("No hay comidas recientes");
        empty.style.padding = "8px 2px 4px";
        empty.style.textAlign = "left";
        box.appendChild(empty);
      }
      meals.forEach(m => box.appendChild(mealRow(m)));
    } else if (state.searchTab === "favs") {
      const favs = Storage.getFavs();
      if (!favs.length) {
        box.appendChild(emptyState("Todavía no tenés favoritos. Tocá el corazón dentro de un alimento para guardarlo acá."));
      }
      favs.forEach(f => box.appendChild(foodRow(f, FoodApi.defaultSelection(f), () => openFood(f))));
    } else {
      box.appendChild(createButton());
      const created = Storage.getCreated();
      if (!created.length) box.appendChild(emptyState("Los alimentos que crees van a aparecer acá."));
      created.forEach(f => box.appendChild(foodRow(f, FoodApi.defaultSelection(f), () => openFood(f))));
    }
  }

  $("searchInput").addEventListener("input", () => {
    state.searchTab = "db";
    renderSearch();
  });
  document.querySelectorAll("#searchTabs .tab").forEach(t => {
    t.addEventListener("click", () => { state.searchTab = t.dataset.tab; renderSearch(); });
  });

  // ---------- Comidas recientes (varios alimentos de una misma comida) ----------
  function recentMeals() {
    const out = [];
    const seen = new Set();
    for (const k of Storage.allLogKeys().reverse()) {
      const entries = Storage.getLog(k);
      for (const meal of MEALS) {
        const list = entries.filter(e => mealOf(e) === meal.key);
        if (list.length < 2) continue;
        const signature = list.map(e => entryView(e).name.toLowerCase()).sort().join("|");
        if (seen.has(signature)) continue;
        seen.add(signature);
        out.push({ dateKey: k, meal: meal.key, list });
        if (out.length >= 6) return out;
      }
    }
    return out;
  }

  function mealRow(m) {
    const views = m.list.map(entryView);
    const total = m.list.reduce((acc, e) => acc + e.kcal, 0);
    const names = views.slice(0, 2).map(v => v.name).join(", ") + (views.length > 2 ? ` +${views.length - 2}` : "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "food-row";
    btn.innerHTML =
      `<span class="fr-icon">${views[0].icon}</span>` +
      `<span class="fr-main"><span class="fr-name">${mealLabel(m.meal)} &middot; ${esc(dateLabel(parseKey(m.dateKey)))}</span>` +
      `<span class="fr-sub">${esc(names)}</span></span>` +
      `<span class="fr-right"><span class="fr-qty">${m.list.length} alimentos</span><span class="fr-kcal">${fmtInt(total)} kcal</span></span>`;
    btn.addEventListener("click", () => openMealModal(m));
    return btn;
  }

  function openMealModal(m) {
    state.mealPreview = m;
    const total = m.list.reduce((acc, e) => acc + e.kcal, 0);
    $("mealModalTitle").textContent = `${mealLabel(m.meal)} · ${dateLabel(parseKey(m.dateKey))}`;
    $("mealModalSub").textContent = `${m.list.length} alimentos`;
    const list = $("mealModalList");
    list.innerHTML = "";
    m.list.forEach(e => {
      const v = entryView(e);
      const row = document.createElement("div");
      row.className = "mm-row";
      row.innerHTML =
        `<span class="mm-icon">${v.icon}</span>` +
        `<span class="mm-name">${esc(v.name)}${v.quals.length ? `<small>${esc(v.quals.join(" · "))}</small>` : ""}</span>` +
        `<span class="mm-right">${esc(v.label)}<span>${Math.round(e.kcal)} kcal</span></span>`;
      list.appendChild(row);
    });
    const totalRow = document.createElement("div");
    totalRow.className = "mm-total";
    totalRow.innerHTML = `<span>Total</span><span>${fmtInt(total)} kcal</span>`;
    list.appendChild(totalRow);
    $("mealModalAdd").textContent = "Agregar a " + mealLabel(state.selectedMeal || guessMealByTime());
    $("mealModal").hidden = false;
  }

  function closeMealModal() {
    $("mealModal").hidden = true;
    state.mealPreview = null;
  }

  $("mealModalCancel").addEventListener("click", closeMealModal);
  $("mealModal").addEventListener("click", (e) => { if (e.target === $("mealModal")) closeMealModal(); });
  $("mealModalAdd").addEventListener("click", () => {
    const m = state.mealPreview;
    if (!m) return;
    const target = state.selectedMeal || guessMealByTime();
    const dk = dateKey(state.currentDate);
    m.list.forEach(e => {
      const { food, sel } = resolveEntry(e);
      const data = buildEntryData(food, sel, target);
      Storage.addEntry(dk, newEntry(data, e.done));
      Storage.pushRecent({ food, sel: { ...sel }, label: data.label, kcal: data.kcal, ts: new Date().toISOString() });
    });
    closeMealModal();
    showToast(`${m.list.length} alimentos agregados a ${mealLabel(target)}`);
    showScreen("hoy");
  });

  // ---------- Menu del dia (boton "...") ----------
  function closeDayMenu() { $("dayMenu").hidden = true; }

  $("moreGoalsBtn").addEventListener("click", () => { $("dayMenu").hidden = false; });
  $("menuCancel").addEventListener("click", closeDayMenu);
  $("dayMenu").addEventListener("click", (e) => { if (e.target === $("dayMenu")) closeDayMenu(); });
  $("menuGoals").addEventListener("click", () => { closeDayMenu(); showScreen("ajustes"); });

  $("menuCopyPrev").addEventListener("click", () => {
    closeDayMenu();
    const prev = Storage.getLog(dateKey(addDays(state.currentDate, -1)));
    if (!prev.length) { showToast("El día anterior no tiene comidas"); return; }
    const dk = dateKey(state.currentDate);
    prev.forEach(e => {
      const { food, sel } = resolveEntry(e);
      Storage.addEntry(dk, newEntry(buildEntryData(food, sel, mealOf(e)), e.done));
    });
    renderPlan();
    showToast(`${prev.length} alimentos copiados`);
  });

  $("menuClearDay").addEventListener("click", () => {
    closeDayMenu();
    const dk = dateKey(state.currentDate);
    if (!Storage.getLog(dk).length) { showToast("No hay comidas para borrar"); return; }
    if (!confirm("¿Borrar todas las comidas de este día?")) return;
    Storage.saveLog(dk, []);
    renderPlan();
    showToast("Día borrado");
  });

  // ---------- Hoja de detalle del alimento ----------
  function openSheet({ food, sel, mode, entry, dateKey: dk, meal }) {
    state.sheet = {
      food, sel, mode,
      entry: entry || null,
      dateKey: dk || null,
      meal: meal || state.selectedMeal || guessMealByTime()
    };

    const icon = iconOf(food.icon, food.name);
    $("sheetHero").style.setProperty("--tint", FoodApi.tintFor(icon));
    $("sheetIcon").textContent = icon;
    $("sheetName").textContent = food.name;
    $("sheetSub").textContent = food.subtitle;
    $("sheetDelete").hidden = mode !== "edit";
    $("sheetFav").classList.toggle("fav-on", Storage.isFav(food.name));

    const portion = $("sheetPortion");
    portion.innerHTML = "";
    if (food.unitGrams) portion.add(new Option(`${food.unitName} (${food.unitGrams} g)`, "unidad"));
    portion.add(new Option("gramos", "gramos"));

    $("sheetVariantWrap").hidden = !food.variants;
    $("sheetBoneWrap").hidden = !food.boneFraction;
    $("sheetPeelWrap").hidden = !food.peelFraction;
    $("sheetMeal").value = state.sheet.meal;

    syncSheetInputs();
    updateSheet();
    clearTimeout(sheetCloseTimer);
    $("foodSheet").classList.remove("closing");
    resetSheetDrag();
    $("foodSheet").hidden = false;
    $("foodSheet").querySelector(".sheet-scroll").scrollTop = 0;
  }

  function syncSheetInputs() {
    const { sel } = state.sheet;
    $("sheetQty").value = sel.qty;
    $("sheetPortion").value = sel.portion;
    if (sel.variant) $("sheetVariant").value = sel.variant;
    if (sel.bone) $("sheetBone").value = sel.bone;
    if (sel.peel) $("sheetPeel").value = sel.peel;
  }

  function updateSheet() {
    const { food, sel, mode, meal } = state.sheet;
    const calc = FoodApi.compute(food, sel);

    let data = "Datos por " + FoodApi.qtyLabel(food, sel);
    if (food.variants) data += ` - peso ${sel.variant}`;
    if (food.boneFraction) data += sel.bone === "con" ? ", con hueso" : ", sin hueso";
    if (food.peelFraction) data += sel.peel === "con" ? ", con cáscara" : ", sin cáscara";
    $("sheetData").textContent = data;

    $("stKcal").textContent = fmtInt(calc.kcal);
    $("stProtein").textContent = fmtG(calc.protein) + " g";
    $("stCarbs").textContent = fmtG(calc.carbs) + " g";
    $("stFat").textContent = fmtG(calc.fat) + " g";

    const cal = { protein: calc.protein * 4, carbs: calc.carbs * 4, fat: calc.fat * 9 };
    const total = cal.protein + cal.carbs + cal.fat;
    const bar = $("distBar");
    const legend = $("distLegend");
    bar.innerHTML = "";
    legend.innerHTML = "";
    if (total > 0) {
      [["protein", "Proteínas"], ["carbs", "Carbs"], ["fat", "Grasas"]].forEach(([key, name]) => {
        if (cal[key] <= 0) return;
        const seg = document.createElement("span");
        seg.className = "dist-seg " + key;
        seg.style.flex = String(cal[key]);
        bar.appendChild(seg);
        const item = document.createElement("span");
        item.className = "dist-item";
        item.innerHTML = `<span class="dot ${key}"></span>${name} ${Math.round(cal[key] / total * 100)}%`;
        legend.appendChild(item);
      });
    }

    const per = FoodApi.macrosPer100(food, sel);
    $("nutriTable").innerHTML =
      `<tr><th></th><th>Por 100 g</th><th>Esta porción</th></tr>` +
      `<tr><td>Calorías</td><td>${fmtInt(per.kcal)} kcal</td><td>${fmtInt(calc.kcal)} kcal</td></tr>` +
      `<tr><td>Proteínas</td><td>${fmtG(per.protein)} g</td><td>${fmtG(calc.protein)} g</td></tr>` +
      `<tr><td>Carbohidratos</td><td>${fmtG(per.carbs)} g</td><td>${fmtG(calc.carbs)} g</td></tr>` +
      `<tr><td>Grasas</td><td>${fmtG(per.fat)} g</td><td>${fmtG(calc.fat)} g</td></tr>`;

    $("sheetAdd").textContent = mode === "edit" ? "Guardar cambios" : "Agregar a " + mealLabel(meal);
  }

  function resetSheetDrag() {
    const sheet = document.querySelector("#foodSheet .sheet");
    sheet.style.transition = "";
    sheet.style.transform = "";
  }

  let sheetCloseTimer = null;

  function finishCloseSheet() {
    clearTimeout(sheetCloseTimer);
    const overlay = $("foodSheet");
    overlay.classList.remove("closing");
    overlay.hidden = true;
    resetSheetDrag();
  }

  // Baja con animacion (animate=false la oculta de inmediato).
  function closeSheet(animate) {
    const overlay = $("foodSheet");
    state.sheet = null;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animate === false || overlay.hidden || reduce) { finishCloseSheet(); return; }
    overlay.classList.add("closing");
    clearTimeout(sheetCloseTimer);
    sheetCloseTimer = setTimeout(finishCloseSheet, 210);
  }

  $("sheetQty").addEventListener("input", (e) => {
    state.sheet.sel.qty = parseFloat(e.target.value) || 0;
    updateSheet();
  });

  $("sheetPortion").addEventListener("change", (e) => {
    const { food, sel } = state.sheet;
    const grams = FoodApi.gramsOf(food, sel);
    sel.portion = e.target.value;
    sel.qty = sel.portion === "unidad"
      ? (grams > 0 ? Math.round(grams / food.unitGrams * 100) / 100 : 1)
      : Math.round(grams);
    syncSheetInputs();
    updateSheet();
  });

  $("sheetVariant").addEventListener("change", (e) => { state.sheet.sel.variant = e.target.value; updateSheet(); });
  $("sheetBone").addEventListener("change", (e) => { state.sheet.sel.bone = e.target.value; updateSheet(); });
  $("sheetPeel").addEventListener("change", (e) => { state.sheet.sel.peel = e.target.value; updateSheet(); });
  $("sheetMeal").addEventListener("change", (e) => { state.sheet.meal = e.target.value; updateSheet(); });

  $("sheetFav").addEventListener("click", () => {
    const on = Storage.toggleFav(state.sheet.food);
    $("sheetFav").classList.toggle("fav-on", on);
    showToast(on ? "Agregado a favoritos" : "Quitado de favoritos");
  });

  $("sheetDelete").addEventListener("click", () => {
    const s = state.sheet;
    if (!confirm("¿Eliminar este alimento del diario?")) return;
    Storage.removeEntry(s.dateKey, s.entry.id);
    closeSheet();
    renderPlan();
    showToast("Eliminado");
  });

  $("sheetClose").addEventListener("click", closeSheet);

  // Deslizar hacia abajo (desde el tope de la hoja) para cerrarla.
  (function enableSheetSwipeDown() {
    const sheet = document.querySelector("#foodSheet .sheet");
    const scroller = sheet.querySelector(".sheet-scroll");
    let startY = 0, dy = 0, tracking = false, dragging = false;

    sheet.addEventListener("touchstart", (e) => {
      tracking = !e.target.closest(".sheet-footer") && scroller.scrollTop <= 0;
      dragging = false;
      dy = 0;
      startY = e.touches[0].clientY;
    }, { passive: true });

    sheet.addEventListener("touchmove", (e) => {
      if (!tracking) return;
      dy = e.touches[0].clientY - startY;
      if (!dragging) {
        if (dy < 8) { if (dy < -8) tracking = false; return; }
        dragging = true;
        sheet.style.transition = "none";
      }
      e.preventDefault();
      sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    }, { passive: false });

    sheet.addEventListener("touchend", () => {
      if (!dragging) return;
      dragging = false;
      tracking = false;
      sheet.style.transition = "transform .2s ease";
      if (dy > 110) {
        sheet.style.transform = "translateY(100%)";
        setTimeout(() => closeSheet(false), 190);
      } else {
        sheet.style.transform = "";
      }
    }, { passive: true });
  })();

  // Al tocar un campo numerico con valor se vacia (el valor anterior queda en gris):
  // se escribe directo sin tener que seleccionar y borrar. Si se sale sin escribir, vuelve.
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== "number" || t.value === "") return;
    t.dataset.prev = t.value;
    t.dataset.ph = t.placeholder || "";
    t.placeholder = t.value;
    t.value = "";
  });
  document.addEventListener("focusout", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.dataset.prev === undefined) return;
    if (t.value === "") t.value = t.dataset.prev;
    t.placeholder = t.dataset.ph;
    delete t.dataset.prev;
    delete t.dataset.ph;
  });
  $("foodSheet").addEventListener("click", (e) => { if (e.target === $("foodSheet")) closeSheet(); });

  $("sheetAdd").addEventListener("click", () => {
    const s = state.sheet;
    if (FoodApi.gramsOf(s.food, s.sel) <= 0) { showToast("Ingresá una cantidad"); return; }
    if (state.linkBarcode && s.mode === "add") {
      s.food = withBarcode(s.food, state.linkBarcode);
      clearLink();
      showToast("Código vinculado: la próxima vez se reconoce solo");
    }
    const data = buildEntryData(s.food, s.sel, s.meal);

    if (s.mode === "edit") {
      Storage.updateEntry(s.dateKey, s.entry.id, { ...s.entry, ...data });
      showToast("Cambios guardados");
    } else {
      Storage.addEntry(dateKey(state.currentDate), newEntry(data));
      Storage.pushRecent({ food: s.food, sel: { ...s.sel }, label: data.label, kcal: data.kcal, ts: new Date().toISOString() });
      if (!$("toast").textContent.startsWith("Código")) showToast("Agregado a " + mealLabel(s.meal));
    }
    closeSheet();
    showScreen("hoy");
  });

  // ---------- Compartir alimento ----------
  $("sheetShare").addEventListener("click", async () => {
    const { food, sel } = state.sheet;
    const c = FoodApi.compute(food, sel);
    const text = `${food.name} (${FoodApi.qtyLabel(food, sel)}): ${fmtInt(c.kcal)} kcal · ` +
      `${fmtG(c.protein)} g proteínas · ${fmtG(c.carbs)} g carbs · ${fmtG(c.fat)} g grasas - Pesalo`;
    try {
      if (navigator.share) {
        await navigator.share({ title: food.name, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast("Copiado al portapapeles");
      } else {
        showToast("No se puede compartir desde acá");
      }
    } catch (err) {
      // el usuario cancelo el menu de compartir
    }
  });

  // ---------- Crear alimento ----------
  function openManualModal(hint) {
    ["manName", "manKcal", "manProtein", "manCarbs", "manFat"].forEach(id => $(id).value = "");
    $("manualHint").textContent = hint || "Valores por cada 100 g del alimento";
    $("manualModal").hidden = false;
  }

  $("manualCancel").addEventListener("click", () => { $("manualModal").hidden = true; state.pendingBarcode = null; });

  $("manualNext").addEventListener("click", () => {
    const name = $("manName").value.trim();
    if (!name) { $("manName").focus(); return; }
    const food = FoodApi.makeCustomFood({
      name,
      kcal: parseFloat($("manKcal").value) || 0,
      protein: parseFloat($("manProtein").value) || 0,
      carbs: parseFloat($("manCarbs").value) || 0,
      fat: parseFloat($("manFat").value) || 0,
      barcode: state.pendingBarcode,
      source: "created"
    });
    state.pendingBarcode = null;
    Storage.addCreated(food);
    $("manualModal").hidden = true;
    renderSearch();
    openFood(food);
  });

  // ---------- Escaner de codigo de barras ----------
  $("sbScan").addEventListener("click", () => {
    $("scannerModal").hidden = false;
    $("scannerStatus").textContent = "Apunta la camara al codigo de barras";
    Barcode.start("scannerVideo", onBarcodeDetected, onScannerError);
  });

  $("scannerClose").addEventListener("click", closeScanner);

  function closeScanner() {
    Barcode.stop();
    $("scannerModal").hidden = true;
  }

  function onScannerError() {
    $("scannerStatus").textContent = "No se pudo acceder a la camara. Revisa los permisos.";
  }

  async function onBarcodeDetected(code) {
    closeScanner();

    const saved = Storage.findByBarcode(code);
    if (saved) {
      openFood(saved);
      return;
    }

    showToast("Buscando producto...");
    await Products.load();
    const known = Products.findByBarcode(code);
    if (known) {
      openFood(known);
      return;
    }

    try {
      const product = await Barcode.lookup(code);
      if (product) {
        openFood(FoodApi.makeCustomFood({ ...product, source: "barcode" }));
      } else {
        openNotFound(code, "No está en la base de productos ni en Open Food Facts.");
      }
    } catch (err) {
      openNotFound(code, "No hay conexión para buscarlo online.");
    }
  }

  // ---------- Producto no encontrado: vincular el codigo o cargarlo ----------
  function withBarcode(food, code) {
    const prev = Storage.getRecents().find(r => r.food.name.toLowerCase() === food.name.toLowerCase());
    const codes = new Set([...(food.barcodes || []), ...((prev && prev.food.barcodes) || [])]);
    [food.barcode, prev && prev.food.barcode, code].forEach(c => { if (c) codes.add(c); });
    return { ...food, barcodes: [...codes] };
  }

  function clearLink() {
    state.linkBarcode = null;
    $("linkBanner").hidden = true;
  }

  function openNotFound(code, reason) {
    state.pendingBarcode = code;
    $("notFoundText").textContent = `Código ${code}. ${reason} Podés buscarlo por nombre y lo vinculamos a este código, o cargarlo con los datos de la etiqueta.`;
    $("notFoundModal").hidden = false;
  }

  function closeNotFound() { $("notFoundModal").hidden = true; }

  $("nfCancel").addEventListener("click", () => { closeNotFound(); state.pendingBarcode = null; });
  $("notFoundModal").addEventListener("click", (e) => {
    if (e.target === $("notFoundModal")) { closeNotFound(); state.pendingBarcode = null; }
  });
  $("nfCreate").addEventListener("click", () => {
    closeNotFound();
    openManualModal("Cargalo con los datos de la etiqueta (por 100 g) y lo vamos a recordar para la próxima.");
  });
  $("nfSearch").addEventListener("click", () => {
    closeNotFound();
    state.linkBarcode = state.pendingBarcode;
    state.pendingBarcode = null;
    $("linkBannerText").textContent = `Buscá el producto y agregalo: le vinculamos el código ${state.linkBarcode}.`;
    $("linkBanner").hidden = false;
    state.searchTab = "db";
    $("searchInput").value = "";
    renderSearch();
    $("searchInput").focus();
  });
  $("linkBannerClose").addEventListener("click", clearLink);

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2000);
  }

  // ---------- Ajustes ----------
  // El % exacto de cada macro vive aca (con decimales): asi los gramos que escribis
  // vuelven siempre iguales. Los sliders y las etiquetas muestran el % redondeado.
  const formPct = { Protein: 0, Carbs: 0, Fat: 0 };
  const MACRO_KEYS = ["Protein", "Carbs", "Fat"];

  function loadSettingsIntoForm() {
    const s = state.settings;
    $("goalKcal").value = s.goalKcal;
    formPct.Protein = s.macroPct.protein;
    formPct.Carbs = s.macroPct.carbs;
    formPct.Fat = s.macroPct.fat;
    refreshMacroUi();
  }

  function showPct(key) {
    const slider = $("slider" + key);
    const rounded = Math.round(formPct[key]);
    slider.value = Math.max(parseInt(slider.min, 10), Math.min(parseInt(slider.max, 10), rounded));
    $("pct" + key).textContent = rounded + "%";
  }

  // Cada macro es independiente: tocar una no mueve las otras. La suma de %
  // puede dar cualquier cosa (menos o mas de 100%) y no se corrige sola.
  function refreshOneMacro(key) {
    const goal = parseFloat($("goalKcal").value) || 0;
    showPct(key);
    $("grams" + key).value = Math.round(goal * formPct[key] / 100 / CAL_PER_GRAM[key]);
  }

  function updateSumHint() {
    const sum = MACRO_KEYS.reduce((acc, key) => acc + formPct[key], 0);
    $("sumHint").textContent = "Suma: " + Math.round(sum) + "%";
  }

  function refreshMacroUi() {
    MACRO_KEYS.forEach(refreshOneMacro);
    updateSumHint();
  }

  MACRO_KEYS.forEach(key => {
    $("slider" + key).addEventListener("input", () => {
      formPct[key] = parseInt($("slider" + key).value, 10);
      refreshOneMacro(key);
      updateSumHint();
    });
  });

  // Cambiar la meta de calorias recalcula los gramos de las 3 (mismo % de cada una,
  // nueva base), pero no toca los porcentajes que el usuario eligio.
  $("goalKcal").addEventListener("input", refreshMacroUi);

  // Tipear gramos (al salir del campo) solo recalcula el % de ESA macro, sin redondearlo.
  MACRO_KEYS.forEach(key => {
    $("grams" + key).addEventListener("change", () => {
      const goal = parseFloat($("goalKcal").value) || 0;
      const grams = Math.max(0, parseFloat($("grams" + key).value) || 0);
      formPct[key] = goal > 0 ? grams * CAL_PER_GRAM[key] * 100 / goal : 0;
      showPct(key);
      updateSumHint();
    });
  });

  $("saveSettingsBtn").addEventListener("click", () => {
    const goalKcal = Math.max(0, parseInt($("goalKcal").value, 10) || 2000);
    const exact = (key) => Math.round(formPct[key] * 10000) / 10000;

    state.settings = {
      goalKcal,
      macroPct: { protein: exact("Protein"), carbs: exact("Carbs"), fat: exact("Fat") }
    };
    Storage.saveSettings(state.settings);
    showToast("Ajustes guardados");
    showScreen("hoy");
  });

  $("clearDataBtn").addEventListener("click", () => {
    if (confirm("Esto borra todo lo cargado (comidas y ajustes) en este dispositivo. Continuar?")) {
      Storage.clearAll();
      state.settings = Storage.getSettings();
      renderPlan();
      showToast("Datos borrados");
    }
  });

  // ---------- Service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
    });
  }

  // ---------- Init ----------
  migrateLegacy();
  renderPlan();
  setTimeout(() => Products.load(), 1500);
})();

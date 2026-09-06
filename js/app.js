(() => {
  const MEALS = [
    { key: "desayuno", label: "Desayuno" },
    { key: "almuerzo", label: "Almuerzo" },
    { key: "merienda", label: "Merienda" },
    { key: "cena", label: "Cena" }
  ];

  function guessMealByTime(date) {
    const h = (date || new Date()).getHours();
    if (h >= 5 && h < 11) return "desayuno";
    if (h >= 11 && h < 16) return "almuerzo";
    if (h >= 16 && h < 20) return "merienda";
    return "cena";
  }

  let state = {
    currentDate: new Date(),
    settings: Storage.getSettings(),
    pendingFood: null,   // alimento seleccionado esperando confirmar porcion
    pendingMeal: "desayuno", // comida elegida dentro del modal de porcion
    selectedMeal: null,  // comida preseleccionada al entrar a Buscar
    manualDraft: null,   // datos de alimento manual antes de pedir porcion
    searchDebounce: null
  };

  const $ = (id) => document.getElementById(id);

  // ---------- Navegacion entre pantallas ----------
  function showScreen(name, meal) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $("screen-" + name).classList.add("active");
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.screen === name);
    });
    if (name === "buscar") {
      state.selectedMeal = meal || guessMealByTime();
      const mealLabel = MEALS.find(m => m.key === state.selectedMeal).label;
      $("buscarTitle").textContent = "Agregar a " + mealLabel;
      $("searchInput").value = "";
      $("resultsList").innerHTML = "";
      $("commonTitle").hidden = true;
      $("searchStatus").hidden = true;
      setTimeout(() => $("searchInput").focus(), 200);
    }
    if (name === "ajustes") loadSettingsIntoForm();
  }

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });
  $("fabAdd").addEventListener("click", () => showScreen("buscar"));
  $("closeBuscar").addEventListener("click", () => showScreen("hoy"));

  // ---------- Fecha ----------
  function fmtDateLabel(date) {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return "Hoy";
    const yest = new Date(today); yest.setDate(today.getDate() - 1);
    if (date.toDateString() === yest.toDateString()) return "Ayer";
    return date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  }

  $("prevDay").addEventListener("click", () => {
    state.currentDate.setDate(state.currentDate.getDate() - 1);
    renderToday();
  });
  $("nextDay").addEventListener("click", () => {
    const today = new Date();
    if (state.currentDate.toDateString() === today.toDateString()) return;
    state.currentDate.setDate(state.currentDate.getDate() + 1);
    renderToday();
  });

  // ---------- Render pantalla Hoy ----------
  function computeMacroTargets(settings) {
    const goal = settings.goalKcal;
    const pct = settings.macroPct;
    return {
      proteinG: Math.round((goal * pct.protein / 100) / 4),
      carbsG: Math.round((goal * pct.carbs / 100) / 4),
      fatG: Math.round((goal * pct.fat / 100) / 9)
    };
  }

  function renderToday() {
    $("dateLabel").textContent = fmtDateLabel(state.currentDate);
    const dateKey = Storage.todayKey(state.currentDate);
    const entries = Storage.getLog(dateKey);
    const settings = state.settings;
    const targets = computeMacroTargets(settings);

    const totals = entries.reduce((acc, e) => {
      acc.kcal += e.kcal; acc.protein += e.protein; acc.carbs += e.carbs; acc.fat += e.fat;
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

    const over = totals.kcal > settings.goalKcal;
    $("kcalGoalTxt").textContent = settings.goalKcal;
    $("kcalEatenTxt").textContent = Math.round(totals.kcal);
    $("kcalEatenTxt").style.color = over ? "var(--red)" : "var(--green)";

    const circumference = 389.6;
    const pctEaten = Math.max(0, Math.min(1, totals.kcal / settings.goalKcal));
    const ring = $("calRing");
    ring.style.strokeDashoffset = circumference * (1 - pctEaten);
    ring.style.stroke = over ? "var(--red)" : "var(--green)";

    setBar("Protein", totals.protein, targets.proteinG);
    setBar("Carbs", totals.carbs, targets.carbsG);
    setBar("Fat", totals.fat, targets.fatG);

    renderMeals(entries, dateKey);
  }

  function setBar(key, value, target) {
    const pct = target > 0 ? Math.max(0, Math.min(100, (value / target) * 100)) : 0;
    $("bar" + key).style.width = pct + "%";
    $("txt" + key).textContent = `${Math.round(value)}/${target}g`;
  }

  function mealOf(entry) {
    return entry.meal || guessMealByTime(new Date(entry.time));
  }

  function renderMeals(entries, dateKey) {
    const container = $("mealsContainer");
    container.innerHTML = "";
    MEALS.forEach(meal => {
      const mealEntries = entries.filter(e => mealOf(e) === meal.key);
      const mealTotals = mealEntries.reduce((acc, e) => {
        acc.kcal += e.kcal; acc.protein += e.protein; acc.carbs += e.carbs; acc.fat += e.fat;
        return acc;
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

      const section = document.createElement("div");
      section.className = "meal-section";

      const header = document.createElement("div");
      header.className = "meal-header";
      header.innerHTML = `
        <div class="meal-header-left">
          <span class="meal-name">${meal.label}</span>
          <span class="meal-kcal">${mealEntries.length ? `${Math.round(mealTotals.kcal)} kcal · P${Math.round(mealTotals.protein)} C${Math.round(mealTotals.carbs)} G${Math.round(mealTotals.fat)}` : ""}</span>
        </div>
        <button class="meal-add-btn" aria-label="Agregar a ${meal.label}">+</button>
      `;
      header.querySelector(".meal-add-btn").addEventListener("click", () => showScreen("buscar", meal.key));
      section.appendChild(header);

      if (!mealEntries.length) {
        const empty = document.createElement("div");
        empty.className = "meal-empty";
        empty.textContent = "Sin registros";
        section.appendChild(empty);
      } else {
        const list = document.createElement("div");
        list.className = "food-list";
        mealEntries.slice().reverse().forEach(entry => {
          const div = document.createElement("div");
          div.className = "food-item";
          div.innerHTML = `
            <div class="food-item-main">
              <div class="food-item-name">${escapeHtml(entry.name)}</div>
              <div class="food-item-sub">${entry.grams} g · P ${Math.round(entry.protein)} · C ${Math.round(entry.carbs)} · G ${Math.round(entry.fat)}</div>
            </div>
            <div class="food-item-kcal">${Math.round(entry.kcal)}</div>
            <button class="food-item-del" data-id="${entry.id}" aria-label="Eliminar">&#128465;</button>
          `;
          div.querySelector(".food-item-del").addEventListener("click", () => {
            Storage.removeEntry(dateKey, entry.id);
            renderToday();
          });
          list.appendChild(div);
        });
        section.appendChild(list);
      }

      container.appendChild(section);
    });
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- Busqueda ----------
  $("searchInput").addEventListener("input", (e) => {
    const q = e.target.value;
    clearTimeout(state.searchDebounce);
    if (!q.trim()) {
      $("commonTitle").hidden = true;
      $("searchStatus").hidden = true;
      $("resultsList").innerHTML = "";
      return;
    }
    $("searchStatus").hidden = false;
    $("searchStatus").textContent = "Buscando...";
    state.searchDebounce = setTimeout(async () => {
      const { results, source, error } = await FoodApi.search(q, Storage.getApiKey());
      $("commonTitle").hidden = false;
      $("commonTitle").textContent = "Resultados";
      if (error) {
        $("searchStatus").hidden = false;
        $("searchStatus").textContent = "No se pudo consultar USDA (" + error + "). Mostrando alimentos locales.";
      } else {
        $("searchStatus").hidden = true;
      }
      renderResults(results, source);
    }, 400);
  });

  function renderResults(foods, source) {
    const list = $("resultsList");
    if (!foods.length) {
      list.innerHTML = '<div class="empty-state">Sin resultados. Proba con otro nombre o cargalo manualmente.</div>';
      return;
    }
    list.innerHTML = "";
    foods.forEach(food => {
      const div = document.createElement("div");
      div.className = "result-item";
      div.innerHTML = `
        <div class="result-main">
          <div class="result-name">${escapeHtml(food.name)}</div>
          <div class="result-sub">${Math.round(food.kcal)} kcal · P${Math.round(food.protein)} C${Math.round(food.carbs)} G${Math.round(food.fat)} /100g</div>
        </div>
        <button class="result-add" aria-label="Agregar">+</button>
      `;
      div.querySelector(".result-add").addEventListener("click", () => openPortionModal(food));
      list.appendChild(div);
    });
  }

  // ---------- Modal de porcion ----------
  function setPendingMeal(mealKey) {
    state.pendingMeal = mealKey;
    document.querySelectorAll("#portionMealPills .meal-pill").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.meal === mealKey);
    });
  }

  document.querySelectorAll("#portionMealPills .meal-pill").forEach(btn => {
    btn.addEventListener("click", () => setPendingMeal(btn.dataset.meal));
  });

  function setPendingVariant(variant) {
    state.pendingVariant = variant;
    document.querySelectorAll("#portionVariantPills .meal-pill").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.variant === variant);
    });
    updatePortionPreview();
  }

  document.querySelectorAll("#portionVariantPills .meal-pill").forEach(btn => {
    btn.addEventListener("click", () => setPendingVariant(btn.dataset.variant));
  });

  function currentFoodMacros() {
    const f = state.pendingFood;
    if (!f) return null;
    return f.variants ? f.variants[state.pendingVariant] : f;
  }

  function openPortionModal(food) {
    state.pendingFood = food;
    $("portionFoodName").textContent = food.name;
    $("portionGrams").value = 100;
    if (food.variants) {
      $("portionVariantPills").hidden = false;
      setPendingVariant("cocido");
    } else {
      $("portionVariantPills").hidden = true;
      state.pendingVariant = null;
      updatePortionPreview();
    }
    setPendingMeal(state.selectedMeal || guessMealByTime());
    $("portionModal").hidden = false;
  }

  function updatePortionPreview() {
    const grams = parseFloat($("portionGrams").value) || 0;
    const source = currentFoodMacros();
    if (!source) return;
    const factor = grams / 100;
    $("ppKcal").textContent = Math.round(source.kcal * factor);
    $("ppProtein").textContent = Math.round(source.protein * factor);
    $("ppCarbs").textContent = Math.round(source.carbs * factor);
    $("ppFat").textContent = Math.round(source.fat * factor);
  }

  $("portionGrams").addEventListener("input", updatePortionPreview);
  $("portionCancel").addEventListener("click", () => { $("portionModal").hidden = true; state.pendingFood = null; });

  $("portionConfirm").addEventListener("click", () => {
    const grams = parseFloat($("portionGrams").value) || 0;
    const f = state.pendingFood;
    const source = currentFoodMacros();
    if (!f || !source || grams <= 0) return;
    const factor = grams / 100;
    const displayName = f.variants ? `${f.name} (${state.pendingVariant})` : f.name;
    const entry = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: displayName,
      grams,
      kcal: source.kcal * factor,
      protein: source.protein * factor,
      carbs: source.carbs * factor,
      fat: source.fat * factor,
      meal: state.pendingMeal,
      time: new Date().toISOString()
    };
    const dateKey = Storage.todayKey(state.currentDate);
    Storage.addEntry(dateKey, entry);
    Storage.addRecent({ name: displayName, kcal: source.kcal, protein: source.protein, carbs: source.carbs, fat: source.fat });
    $("portionModal").hidden = true;
    state.pendingFood = null;
    showToast("Agregado a " + fmtDateLabel(state.currentDate));
    showScreen("hoy");
    renderToday();
  });

  // ---------- Alimento manual ----------
  $("manualAddBtn").addEventListener("click", () => {
    ["manName", "manKcal", "manProtein", "manCarbs", "manFat"].forEach(id => $(id).value = "");
    $("manualModal").hidden = false;
  });
  $("manualCancel").addEventListener("click", () => { $("manualModal").hidden = true; });

  $("manualNext").addEventListener("click", () => {
    const name = $("manName").value.trim();
    const kcal = parseFloat($("manKcal").value) || 0;
    const protein = parseFloat($("manProtein").value) || 0;
    const carbs = parseFloat($("manCarbs").value) || 0;
    const fat = parseFloat($("manFat").value) || 0;
    if (!name) { $("manName").focus(); return; }
    $("manualModal").hidden = true;
    openPortionModal({ name, kcal, protein, carbs, fat, source: "manual" });
  });

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
  function loadSettingsIntoForm() {
    const s = state.settings;
    $("goalKcal").value = s.goalKcal;
    $("sliderProtein").value = s.macroPct.protein;
    $("sliderCarbs").value = s.macroPct.carbs;
    $("sliderFat").value = s.macroPct.fat;
    $("apiKeyInput").value = Storage.getApiKey() === "DEMO_KEY" ? "" : Storage.getApiKey();
    updateSlidersUi();
  }

  function updateSlidersUi() {
    const p = parseInt($("sliderProtein").value, 10);
    const c = parseInt($("sliderCarbs").value, 10);
    const f = parseInt($("sliderFat").value, 10);
    $("pctProtein").textContent = p + "%";
    $("pctCarbs").textContent = c + "%";
    $("pctFat").textContent = f + "%";
    const sum = p + c + f;
    $("sumHint").textContent = "Suma: " + sum + "%" + (sum === 100 ? "" : " (se va a normalizar a 100%)");

    const goal = parseFloat($("goalKcal").value) || 0;
    const norm = sum > 0 ? 100 / sum : 1;
    const pn = p * norm, cn = c * norm, fn = f * norm;
    $("macroGramsPreview").innerHTML = `
      <div><b>${Math.round(goal * pn / 100 / 4)}g</b>proteina</div>
      <div><b>${Math.round(goal * cn / 100 / 4)}g</b>carbs</div>
      <div><b>${Math.round(goal * fn / 100 / 9)}g</b>grasa</div>
    `;
  }

  ["sliderProtein", "sliderCarbs", "sliderFat", "goalKcal"].forEach(id => {
    $(id).addEventListener("input", updateSlidersUi);
  });

  $("saveSettingsBtn").addEventListener("click", () => {
    const p = parseInt($("sliderProtein").value, 10);
    const c = parseInt($("sliderCarbs").value, 10);
    const f = parseInt($("sliderFat").value, 10);
    const sum = p + c + f || 1;
    const norm = 100 / sum;
    const goalKcal = Math.max(0, parseInt($("goalKcal").value, 10) || 2000);

    state.settings = {
      goalKcal,
      macroPct: {
        protein: Math.round(p * norm),
        carbs: Math.round(c * norm),
        fat: Math.round(f * norm)
      }
    };
    Storage.saveSettings(state.settings);
    Storage.setApiKey($("apiKeyInput").value);
    showToast("Ajustes guardados");
    showScreen("hoy");
    renderToday();
  });

  $("clearDataBtn").addEventListener("click", () => {
    if (confirm("Esto borra todo lo cargado (comidas, ajustes, API key) en este dispositivo. Continuar?")) {
      Storage.clearAll();
      state.settings = Storage.getSettings();
      renderToday();
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
  renderToday();
})();

// Busqueda de alimentos: USDA FoodData Central + lista local de alimentos comunes (fallback / uso rapido).
const FoodApi = (() => {
  const NUTRIENT_NUMBERS = {
    kcal: "208",
    protein: "203",
    fat: "204",
    carbs: "205"
  };

  // Valores tipicos por 100 g. Sirve como respaldo offline y para busquedas rapidas de uso diario.
  const COMMON_FOODS = [
    { name: "Arroz blanco cocido", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    { name: "Pechuga de pollo cocida", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: "Huevo entero", kcal: 155, protein: 13, carbs: 1.1, fat: 11 },
    { name: "Banana", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    { name: "Manzana", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    { name: "Pan lactal blanco", kcal: 265, protein: 9, carbs: 49, fat: 3.2 },
    { name: "Fideos cocidos", kcal: 158, protein: 5.8, carbs: 31, fat: 0.9 },
    { name: "Papa cocida", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 },
    { name: "Batata cocida", kcal: 90, protein: 2, carbs: 21, fat: 0.1 },
    { name: "Atun al natural", kcal: 116, protein: 26, carbs: 0, fat: 1 },
    { name: "Yogur natural entero", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
    { name: "Leche descremada", kcal: 35, protein: 3.4, carbs: 5, fat: 0.1 },
    { name: "Palta", kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
    { name: "Almendras", kcal: 579, protein: 21, carbs: 22, fat: 50 },
    { name: "Aceite de oliva", kcal: 884, protein: 0, carbs: 0, fat: 100 },
    { name: "Avena", kcal: 389, protein: 17, carbs: 66, fat: 7 },
    { name: "Queso cremoso", kcal: 291, protein: 18, carbs: 3, fat: 24 },
    { name: "Carne vacuna magra cocida", kcal: 217, protein: 26, carbs: 0, fat: 12 },
    { name: "Lentejas cocidas", kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
    { name: "Garbanzos cocidos", kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 },
    { name: "Pan integral", kcal: 247, protein: 13, carbs: 41, fat: 3.4 },
    { name: "Quinoa cocida", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
    { name: "Naranja", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 },
    { name: "Tomate", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
    { name: "Zanahoria", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 },
    { name: "Merluza cocida", kcal: 90, protein: 18, carbs: 0, fat: 1.3 },
    { name: "Jamon cocido", kcal: 145, protein: 21, carbs: 1.5, fat: 6 }
  ];

  function searchCommon(query) {
    const q = query.trim().toLowerCase();
    if (!q) return COMMON_FOODS.slice(0, 8);
    return COMMON_FOODS.filter(f => f.name.toLowerCase().includes(q));
  }

  function extractNutrient(foodNutrients, number) {
    if (!Array.isArray(foodNutrients)) return 0;
    const found = foodNutrients.find(n => String(n.nutrientNumber) === number);
    return found && typeof found.value === "number" ? found.value : 0;
  }

  async function searchUsda(query, apiKey) {
    const key = apiKey || "DEMO_KEY";
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=20&dataType=Foundation,SR%20Legacy,Branded&api_key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 403) throw new Error("API key invalida");
      if (res.status === 429) throw new Error("Limite de consultas alcanzado, proba de nuevo mas tarde");
      throw new Error("Error consultando USDA (" + res.status + ")");
    }
    const data = await res.json();
    const foods = Array.isArray(data.foods) ? data.foods : [];
    return foods.map(f => {
      const kcal = extractNutrient(f.foodNutrients, NUTRIENT_NUMBERS.kcal);
      const protein = extractNutrient(f.foodNutrients, NUTRIENT_NUMBERS.protein);
      const carbs = extractNutrient(f.foodNutrients, NUTRIENT_NUMBERS.carbs);
      const fat = extractNutrient(f.foodNutrients, NUTRIENT_NUMBERS.fat);
      const brand = f.brandName || f.brandOwner || "";
      return {
        name: f.description ? (brand ? `${f.description} (${brand})` : f.description) : "Alimento",
        kcal, protein, carbs, fat,
        source: "usda",
        fdcId: f.fdcId
      };
    }).filter(f => f.kcal > 0 || f.protein > 0 || f.carbs > 0 || f.fat > 0);
  }

  async function search(query, apiKey) {
    const local = searchCommon(query);
    if (!query.trim()) {
      return { results: local, source: "common", error: null };
    }
    try {
      const usdaResults = await searchUsda(query, apiKey);
      const merged = [...local, ...usdaResults];
      return { results: merged, source: "usda", error: null };
    } catch (err) {
      return { results: local, source: "common", error: err.message };
    }
  }

  return { search, searchCommon, COMMON_FOODS };
})();

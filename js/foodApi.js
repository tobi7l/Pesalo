// Busqueda de alimentos: base de datos local propia (sin API externa).
const FoodApi = (() => {
  // Valores por 100 g. Los alimentos cuyo valor nutricional cambia mucho al
  // cocinarse tienen variants {crudo, cocido}; el resto tiene un unico valor
  // (base) porque no aplica esa distincion.
  const COMMON_FOODS = [
    { name: "Arroz blanco", variants: {
        crudo:  { kcal: 365, protein: 7.1, carbs: 80, fat: 0.7 },
        cocido: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }
    }},
    { name: "Pechuga de pollo", variants: {
        crudo:  { kcal: 120, protein: 22.5, carbs: 0, fat: 2.6 },
        cocido: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }
    }},
    { name: "Huevo entero", base: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
    { name: "Banana", base: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
    { name: "Manzana", base: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
    { name: "Pan lactal blanco", base: { kcal: 265, protein: 9, carbs: 49, fat: 3.2 } },
    { name: "Fideos", variants: {
        crudo:  { kcal: 371, protein: 13, carbs: 74, fat: 1.5 },
        cocido: { kcal: 158, protein: 5.8, carbs: 31, fat: 0.9 }
    }},
    { name: "Papa", variants: {
        crudo:  { kcal: 77, protein: 2, carbs: 17, fat: 0.1 },
        cocido: { kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 }
    }},
    { name: "Batata", variants: {
        crudo:  { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
        cocido: { kcal: 90, protein: 2, carbs: 21, fat: 0.1 }
    }},
    { name: "Atun al natural", base: { kcal: 116, protein: 26, carbs: 0, fat: 1 } },
    { name: "Yogur natural entero", base: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
    { name: "Leche descremada", base: { kcal: 35, protein: 3.4, carbs: 5, fat: 0.1 } },
    { name: "Palta", base: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 } },
    { name: "Almendras", base: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
    { name: "Aceite de oliva", base: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
    { name: "Avena", variants: {
        crudo:  { kcal: 389, protein: 17, carbs: 66, fat: 7 },
        cocido: { kcal: 71, protein: 2.5, carbs: 12, fat: 1.5 }
    }},
    { name: "Queso cremoso", base: { kcal: 291, protein: 18, carbs: 3, fat: 24 } },
    { name: "Carne vacuna magra", variants: {
        crudo:  { kcal: 137, protein: 21, carbs: 0, fat: 5 },
        cocido: { kcal: 217, protein: 26, carbs: 0, fat: 12 }
    }},
    { name: "Lentejas", variants: {
        crudo:  { kcal: 353, protein: 25, carbs: 60, fat: 1.1 },
        cocido: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 }
    }},
    { name: "Garbanzos", variants: {
        crudo:  { kcal: 364, protein: 19, carbs: 61, fat: 6 },
        cocido: { kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 }
    }},
    { name: "Pan integral", base: { kcal: 247, protein: 13, carbs: 41, fat: 3.4 } },
    { name: "Quinoa", variants: {
        crudo:  { kcal: 368, protein: 14, carbs: 64, fat: 6 },
        cocido: { kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 }
    }},
    { name: "Naranja", base: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
    { name: "Tomate", base: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
    { name: "Zanahoria", base: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
    { name: "Merluza", variants: {
        crudo:  { kcal: 71, protein: 17, carbs: 0, fat: 0.6 },
        cocido: { kcal: 90, protein: 18, carbs: 0, fat: 1.3 }
    }},
    { name: "Jamon cocido", base: { kcal: 145, protein: 21, carbs: 1.5, fat: 6 } },

    // Cortes de carne vacuna
    { name: "Asado (costillar)", variants: {
        crudo:  { kcal: 250, protein: 17, carbs: 0, fat: 20 },
        cocido: { kcal: 330, protein: 25, carbs: 0, fat: 25 }
    }},
    { name: "Vacio", variants: {
        crudo:  { kcal: 180, protein: 20, carbs: 0, fat: 11 },
        cocido: { kcal: 250, protein: 28, carbs: 0, fat: 15 }
    }},
    { name: "Matambre de vaca", variants: {
        crudo:  { kcal: 200, protein: 19, carbs: 0, fat: 14 },
        cocido: { kcal: 280, protein: 27, carbs: 0, fat: 19 }
    }},
    { name: "Bife de chorizo", variants: {
        crudo:  { kcal: 150, protein: 21, carbs: 0, fat: 7 },
        cocido: { kcal: 210, protein: 27, carbs: 0, fat: 10 }
    }},
    { name: "Bife de lomo", variants: {
        crudo:  { kcal: 135, protein: 21, carbs: 0, fat: 5 },
        cocido: { kcal: 190, protein: 28, carbs: 0, fat: 8 }
    }},
    { name: "Ojo de bife", variants: {
        crudo:  { kcal: 180, protein: 20, carbs: 0, fat: 11 },
        cocido: { kcal: 250, protein: 26, carbs: 0, fat: 15 }
    }},
    { name: "Nalga", variants: {
        crudo:  { kcal: 120, protein: 22, carbs: 0, fat: 3 },
        cocido: { kcal: 175, protein: 29, carbs: 0, fat: 6 }
    }},
    { name: "Cuadrada", variants: {
        crudo:  { kcal: 125, protein: 21, carbs: 0, fat: 4 },
        cocido: { kcal: 180, protein: 28, carbs: 0, fat: 7 }
    }},
    { name: "Peceto", variants: {
        crudo:  { kcal: 115, protein: 22, carbs: 0, fat: 2.5 },
        cocido: { kcal: 170, protein: 29, carbs: 0, fat: 5 }
    }},
    { name: "Paleta", variants: {
        crudo:  { kcal: 150, protein: 20, carbs: 0, fat: 7 },
        cocido: { kcal: 215, protein: 27, carbs: 0, fat: 11 }
    }},
    { name: "Falda", variants: {
        crudo:  { kcal: 170, protein: 20, carbs: 0, fat: 9 },
        cocido: { kcal: 235, protein: 27, carbs: 0, fat: 13 }
    }},
    { name: "Entraña", variants: {
        crudo:  { kcal: 190, protein: 20, carbs: 0, fat: 12 },
        cocido: { kcal: 260, protein: 27, carbs: 0, fat: 16 }
    }},
    { name: "Colita de cuadril", variants: {
        crudo:  { kcal: 140, protein: 21, carbs: 0, fat: 6 },
        cocido: { kcal: 200, protein: 28, carbs: 0, fat: 9 }
    }},
    { name: "Osobuco", variants: {
        crudo:  { kcal: 130, protein: 20, carbs: 0, fat: 5 },
        cocido: { kcal: 190, protein: 27, carbs: 0, fat: 8 }
    }},
    { name: "Carne picada", variants: {
        crudo:  { kcal: 215, protein: 17, carbs: 0, fat: 16 },
        cocido: { kcal: 250, protein: 25, carbs: 0, fat: 17 }
    }},

    // Cortes de cerdo
    { name: "Bondiola de cerdo", variants: {
        crudo:  { kcal: 215, protein: 18, carbs: 0, fat: 15 },
        cocido: { kcal: 280, protein: 24, carbs: 0, fat: 19 }
    }},
    { name: "Carre de cerdo", variants: {
        crudo:  { kcal: 150, protein: 21, carbs: 0, fat: 7 },
        cocido: { kcal: 210, protein: 27, carbs: 0, fat: 10 }
    }},
    { name: "Matambre de cerdo", variants: {
        crudo:  { kcal: 200, protein: 18, carbs: 0, fat: 14 },
        cocido: { kcal: 270, protein: 24, carbs: 0, fat: 18 }
    }},
    { name: "Costillar de cerdo", variants: {
        crudo:  { kcal: 260, protein: 17, carbs: 0, fat: 21 },
        cocido: { kcal: 330, protein: 23, carbs: 0, fat: 26 }
    }},
    { name: "Cuadril de cerdo", variants: {
        crudo:  { kcal: 145, protein: 21, carbs: 0, fat: 6 },
        cocido: { kcal: 205, protein: 27, carbs: 0, fat: 9 }
    }},
    { name: "Nalga de cerdo", variants: {
        crudo:  { kcal: 139, protein: 21, carbs: 0, fat: 5.5 },
        cocido: { kcal: 195, protein: 27, carbs: 0, fat: 8 }
    }},
    { name: "Cuadrada de cerdo", variants: {
        crudo:  { kcal: 140, protein: 21, carbs: 0, fat: 5.5 },
        cocido: { kcal: 200, protein: 27, carbs: 0, fat: 8 }
    }},
    { name: "Vacio de cerdo", variants: {
        crudo:  { kcal: 250, protein: 15, carbs: 0, fat: 21 },
        cocido: { kcal: 330, protein: 20, carbs: 0, fat: 27 }
    }},
    { name: "Solomillo de cerdo", variants: {
        crudo:  { kcal: 120, protein: 22, carbs: 0, fat: 3 },
        cocido: { kcal: 175, protein: 28, carbs: 0, fat: 5 }
    }},

    // Mas cortes de pollo
    { name: "Muslo de pollo", variants: {
        crudo:  { kcal: 120, protein: 17, carbs: 0, fat: 5.7 },
        cocido: { kcal: 180, protein: 24, carbs: 0, fat: 8.5 }
    }},
    { name: "Alitas de pollo", variants: {
        crudo:  { kcal: 200, protein: 18, carbs: 0, fat: 14 },
        cocido: { kcal: 290, protein: 27, carbs: 0, fat: 19 }
    }}
  ];

  function toSearchResult(food) {
    const defaults = food.variants ? food.variants.crudo : food.base;
    return {
      name: food.name,
      kcal: defaults.kcal,
      protein: defaults.protein,
      carbs: defaults.carbs,
      fat: defaults.fat,
      variants: food.variants || null,
      source: "common"
    };
  }

  function searchCommon(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return COMMON_FOODS.filter(f => f.name.toLowerCase().includes(q)).map(toSearchResult);
  }

  // extraFoods: alimentos guardados por el usuario (manuales o ya usados antes),
  // en formato {name, kcal, protein, carbs, fat}. Tienen prioridad sobre la lista
  // comun porque son datos reales que el usuario cargo (ej. de una etiqueta).
  function search(query, extraFoods) {
    const q = query.trim().toLowerCase();
    const extra = (extraFoods || []).filter(f => f.name.toLowerCase().includes(q));
    const common = searchCommon(query).filter(
      f => !extra.some(e => e.name.toLowerCase() === f.name.toLowerCase())
    );
    return { results: [...extra, ...common] };
  }

  return { search, searchCommon, COMMON_FOODS };
})();

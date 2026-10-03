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
    { name: "Huevo entero", base: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 }, unitGrams: 50 },
    { name: "Banana", base: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, unitGrams: 120 },
    { name: "Manzana roja", base: { kcal: 58, protein: 0.3, carbs: 15.2, fat: 0.2 }, unitGrams: 180 },
    { name: "Manzana verde", base: { kcal: 55, protein: 0.3, carbs: 13.8, fat: 0.2 }, unitGrams: 180 },
    { name: "Frutilla", base: { kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 }, unitGrams: 12 },
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
    { name: "Pizza muzzarella con provolone", base: { kcal: 275, protein: 12, carbs: 30, fat: 12 }, unitGrams: 150, unitName: "porción" },
    { name: "Yogur natural entero", base: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
    { name: "Leche descremada", base: { kcal: 35, protein: 3.4, carbs: 5, fat: 0.1 } },
    { name: "Palta", base: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 }, unitGrams: 150 },
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
    { name: "Naranja", base: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 }, unitGrams: 130 },
    { name: "Tomate", base: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
    { name: "Zanahoria", base: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
    { name: "Merluza", variants: {
        crudo:  { kcal: 71, protein: 17, carbs: 0, fat: 0.6 },
        cocido: { kcal: 90, protein: 18, carbs: 0, fat: 1.3 }
    }},
    { name: "Jamon cocido", base: { kcal: 145, protein: 21, carbs: 1.5, fat: 6 } },

    // Cereales, harinas y panificados
    { name: "Arroz integral", variants: {
        crudo:  { kcal: 362, protein: 7.5, carbs: 76, fat: 2.7 },
        cocido: { kcal: 123, protein: 2.7, carbs: 26, fat: 1 }
    }},
    { name: "Polenta", variants: {
        crudo:  { kcal: 365, protein: 8, carbs: 77, fat: 1.5 },
        cocido: { kcal: 70, protein: 1.7, carbs: 15, fat: 0.4 }
    }},
    { name: "Harina de trigo 000", base: { kcal: 364, protein: 10, carbs: 76, fat: 1 } },
    { name: "Pan francés", base: { kcal: 275, protein: 9, carbs: 56, fat: 1.2 }, unitGrams: 60 },
    { name: "Galletitas de agua", base: { kcal: 430, protein: 10, carbs: 72, fat: 11 }, unitGrams: 8 },
    { name: "Choclo", base: { kcal: 86, protein: 3.3, carbs: 19, fat: 1.4 } },

    // Azucares, grasas y dulces
    { name: "Azúcar", base: { kcal: 387, protein: 0, carbs: 100, fat: 0 } },
    { name: "Aceite de girasol", base: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
    { name: "Manteca", base: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 } },
    { name: "Dulce de leche", base: { kcal: 320, protein: 6.5, carbs: 55, fat: 7.5 } },
    { name: "Mermelada", base: { kcal: 250, protein: 0.4, carbs: 64, fat: 0.1 } },
    { name: "Miel", base: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 } },
    { name: "Chocolate con leche", base: { kcal: 535, protein: 7.7, carbs: 59, fat: 30 } },

    // Lacteos
    { name: "Leche entera", base: { kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
    { name: "Queso muzzarella", base: { kcal: 300, protein: 22, carbs: 2.2, fat: 22 } },
    { name: "Queso rallado", base: { kcal: 431, protein: 38, carbs: 4, fat: 29 } },
    { name: "Ricota", base: { kcal: 174, protein: 11, carbs: 3, fat: 13 } },

    // Frutas
    { name: "Pera", base: { kcal: 57, protein: 0.4, carbs: 15, fat: 0.1 }, unitGrams: 180 },
    { name: "Durazno", base: { kcal: 39, protein: 0.9, carbs: 10, fat: 0.3 }, unitGrams: 150 },
    { name: "Mandarina", base: { kcal: 53, protein: 0.8, carbs: 13, fat: 0.3 }, unitGrams: 90 },
    { name: "Kiwi", base: { kcal: 61, protein: 1.1, carbs: 15, fat: 0.5 }, unitGrams: 75 },
    { name: "Uva", base: { kcal: 69, protein: 0.7, carbs: 18, fat: 0.2 } },
    { name: "Sandía", base: { kcal: 30, protein: 0.6, carbs: 8, fat: 0.2 } },
    { name: "Melón", base: { kcal: 34, protein: 0.8, carbs: 8, fat: 0.2 } },
    { name: "Ananá", base: { kcal: 50, protein: 0.5, carbs: 13, fat: 0.1 } },
    { name: "Limón", base: { kcal: 29, protein: 1.1, carbs: 9, fat: 0.3 }, unitGrams: 60 },
    { name: "Pomelo", base: { kcal: 42, protein: 0.8, carbs: 11, fat: 0.1 }, unitGrams: 250 },
    { name: "Arándanos", base: { kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 } },
    { name: "Cereza", base: { kcal: 63, protein: 1, carbs: 16, fat: 0.2 } },
    { name: "Mango", base: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 } },

    // Verduras
    { name: "Cebolla", base: { kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 }, unitGrams: 110 },
    { name: "Lechuga", base: { kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 } },
    { name: "Pepino", base: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
    { name: "Zapallo", base: { kcal: 26, protein: 1, carbs: 6.5, fat: 0.1 } },
    { name: "Brócoli", base: { kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
    { name: "Espinaca", base: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 } },
    { name: "Morrón", base: { kcal: 31, protein: 1, carbs: 6, fat: 0.3 }, unitGrams: 120 },
    { name: "Berenjena", base: { kcal: 25, protein: 1, carbs: 6, fat: 0.2 } },
    { name: "Champiñones", base: { kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 } },

    // Bebidas (por 100 ml)
    { name: "Gaseosa cola", base: { kcal: 42, protein: 0, carbs: 10.6, fat: 0 }, unitGrams: 250, unitName: "vaso" },
    { name: "Jugo de naranja", base: { kcal: 45, protein: 0.7, carbs: 10, fat: 0.2 }, unitGrams: 250, unitName: "vaso" },
    { name: "Cerveza", base: { kcal: 43, protein: 0.5, carbs: 3.6, fat: 0 }, unitGrams: 330, unitName: "lata" },
    { name: "Vino tinto", base: { kcal: 85, protein: 0.1, carbs: 2.6, fat: 0 }, unitGrams: 150, unitName: "copa" },

    // Cortes de carne vacuna
    { name: "Asado (costillar)", boneFraction: 0.28, variants: {
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
    { name: "Osobuco", boneFraction: 0.30, variants: {
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
    { name: "Chuleta de cerdo", boneFraction: 0.15, variants: {
        crudo:  { kcal: 150, protein: 21, carbs: 0, fat: 7 },
        cocido: { kcal: 210, protein: 27, carbs: 0, fat: 10 }
    }},
    { name: "Matambre de cerdo", variants: {
        crudo:  { kcal: 200, protein: 18, carbs: 0, fat: 14 },
        cocido: { kcal: 270, protein: 24, carbs: 0, fat: 18 }
    }},
    { name: "Costillar de cerdo", boneFraction: 0.30, variants: {
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

  // ---------- Modelo de alimento ----------
  // food = { name, icon, source: "common"|"created"|"barcode", subtitle,
  //          base | variants {crudo,cocido}, unitGrams, unitName, boneFraction, barcode? }
  // sel  = { qty, portion: "gramos"|"unidad", variant, bone }

  const ICON_RULES = [
    [/pizza/, "🍕"], [/papas fritas|snack|chizito|palito/, "🍟"],
    [/\bpera\b/, "🍐"], [/\buva\b/, "🍇"], [/durazno|ciruela/, "🍑"], [/mandarina|pomelo/, "🍊"],
    [/kiwi/, "🥝"], [/sandia/, "🍉"], [/melon/, "🍈"], [/anana/, "🍍"], [/limon/, "🍋"],
    [/mango/, "🥭"], [/arandano/, "🫐"], [/cereza/, "🍒"], [/cebolla/, "🧅"], [/lechuga|espinaca/, "🥬"],
    [/pepino/, "🥒"], [/zapallo/, "🎃"], [/brocoli/, "🥦"], [/morron|pimiento/, "🫑"],
    [/berenjena/, "🍆"], [/choclo|polenta/, "🌽"], [/champi/, "🍄"], [/ricota/, "🧀"],
    [/galleta|galletita|alfajor|oreo|bizcocho|criollita|vainilla/, "🍪"],
    [/chocolate|bombon|cacao|barra de cereal/, "🍫"],
    [/yerba|\bmate\b/, "🧉"], [/gaseosa|\bcola\b|jugo|bebida|soda|refresco|energizante/, "🥤"],
    [/cerveza/, "🍺"], [/\bvino\b/, "🍷"], [/\bagua\b/, "💧"], [/azucar|edulcorante/, "🍬"],
    [/harina|premezcla|rebozador|pan rallado/, "🌾"], [/dulce de leche|mermelada|\bmiel\b/, "🍯"],
    [/helado/, "🍦"], [/sopa|caldo/, "🥣"], [/empanada/, "🥟"], [/hamburguesa/, "🍔"],
    [/\bcafe\b/, "☕"], [/\bte\b|saquito/, "🍵"], [/cereal|granola|muesli/, "🥣"],
    [/manteca|margarina/, "🧈"], [/salchicha|morcilla|mortadela|salame|fiambre|paleta cocida/, "🌭"],
    [/huevo/, "🥚"], [/banana/, "🍌"], [/manzana verde/, "🍏"],
    [/manzana/, "🍎"], [/frutilla/, "🍓"], [/naranja/, "🍊"], [/palta/, "🥑"],
    [/tomate/, "🍅"], [/zanahoria/, "🥕"], [/arroz/, "🍚"], [/fideos/, "🍝"],
    [/papa/, "🥔"], [/batata/, "🍠"], [/pan /, "🍞"], [/avena/, "🥣"],
    [/lentejas|garbanzos/, "🫘"], [/quinoa/, "🌾"], [/almendras/, "🌰"],
    [/aceite/, "🫒"], [/queso/, "🧀"], [/yogur|leche/, "🥛"],
    [/atun|merluza/, "🐟"], [/jamon/, "🍖"],
    [/pollo|pechuga|muslo|alitas/, "🍗"],
    [/cerdo|osobuco/, "🍖"], [/carne|asado|vacio|matambre|bife|lomo|nalga|cuadrada|peceto|paleta|falda|entra|colita|chuleta/, "🥩"]
  ];

  const TINTS = {
    "🥚": "#3b2a12", "🍌": "#3b3411", "🍎": "#3b1418", "🍏": "#1f3314", "🍓": "#3b1420",
    "🍊": "#3b2410", "🥑": "#1f3314", "🍅": "#3b1612", "🥕": "#3b2410", "🍚": "#2f2c26",
    "🍝": "#3b3012", "🥔": "#33291a", "🍠": "#3b2216", "🍞": "#3b2a14", "🥣": "#33291a",
    "🫘": "#33241a", "🌾": "#33301a", "🌰": "#33241a", "🫒": "#26301a", "🧀": "#3b3211",
    "🥛": "#262a30", "🐟": "#14283b", "🍖": "#3b1c14", "🍗": "#3b1d10", "🥩": "#3b1616",
    "🍕": "#3b2410", "🍪": "#33291a", "🍫": "#2b1c14", "🥤": "#1f2a33", "🍯": "#3b2a0f",
    "🧉": "#1f3314", "🍟": "#3b3011", "🌭": "#3b1c14", "🍦": "#2f2a33", "🥟": "#33291a",
    "🍬": "#3b1c2b", "🌾": "#33301a", "🍷": "#33141c", "🍺": "#3b3011", "💧": "#14283b"
  };

  function normalize(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  function iconFor(name) {
    const n = normalize(name);
    const rule = ICON_RULES.find(([re]) => re.test(n));
    return rule ? rule[1] : "🍽️";
  }

  function tintFor(icon) {
    return TINTS[icon] || "#26282d";
  }

  function toFood(f) {
    return {
      name: f.name,
      icon: iconFor(f.name),
      source: "common",
      subtitle: "Genérico",
      base: f.base || null,
      variants: f.variants || null,
      unitGrams: f.unitGrams || null,
      unitName: f.unitName || "unidad",
      boneFraction: f.boneFraction || null
    };
  }

  function makeCustomFood({ name, kcal, protein, carbs, fat, barcode, source, brand }) {
    const food = {
      name,
      icon: iconFor(name),
      source: source || "created",
      subtitle: brand || (source === "barcode" ? "Producto" : "Creado por vos"),
      base: { kcal: kcal || 0, protein: protein || 0, carbs: carbs || 0, fat: fat || 0 },
      variants: null,
      unitGrams: null,
      unitName: "unidad",
      boneFraction: null
    };
    if (barcode) food.barcode = barcode;
    return food;
  }

  function findCommon(name) {
    const n = normalize(name);
    const f = COMMON_FOODS.find(c => normalize(c.name) === n);
    return f ? toFood(f) : null;
  }

  function defaultSelection(food) {
    return {
      qty: food.unitGrams ? 1 : 100,
      portion: food.unitGrams ? "unidad" : "gramos",
      variant: food.variants ? "crudo" : null,
      bone: food.boneFraction ? "con" : null
    };
  }

  // Macros por 100 g del peso pesado. Si se peso con hueso, el hueso no aporta
  // nutrientes: se descuenta su fraccion para no sobreestimar.
  function macrosPer100(food, sel) {
    const m = food.variants ? food.variants[sel.variant || "crudo"] : food.base;
    const factor = food.boneFraction && sel.bone === "con" ? 1 - food.boneFraction : 1;
    return { kcal: m.kcal * factor, protein: m.protein * factor, carbs: m.carbs * factor, fat: m.fat * factor };
  }

  function gramsOf(food, sel) {
    const qty = Number(sel.qty) || 0;
    return sel.portion === "unidad" && food.unitGrams ? qty * food.unitGrams : qty;
  }

  function compute(food, sel) {
    const grams = gramsOf(food, sel);
    const per = macrosPer100(food, sel);
    const k = grams / 100;
    return { grams, kcal: per.kcal * k, protein: per.protein * k, carbs: per.carbs * k, fat: per.fat * k };
  }

  function fmtNum(n) {
    return Number(n).toLocaleString("es-AR", { maximumFractionDigits: 1 });
  }

  // "2 unidad (100 g)" / "300 g"
  function qtyLabel(food, sel) {
    const grams = Math.round(gramsOf(food, sel));
    if (sel.portion === "unidad" && food.unitGrams) {
      return `${fmtNum(sel.qty)} ${food.unitName} (${grams} g)`;
    }
    return `${grams} g`;
  }

  function qualifiersOf(food, sel) {
    const q = [];
    if (food.variants) q.push(sel.variant);
    if (food.boneFraction) q.push(sel.bone === "con" ? "con hueso" : "sin hueso");
    return q;
  }

  function searchCommon(query) {
    const q = normalize(query);
    if (!q) return [];
    return COMMON_FOODS.filter(f => normalize(f.name).includes(q)).map(toFood);
  }

  // personalFoods: alimentos creados / escaneados por el usuario. Tienen prioridad
  // sobre la lista comun porque son datos reales que el usuario cargo.
  function search(query, personalFoods) {
    const q = normalize(query);
    if (!q) return [];
    const personal = (personalFoods || []).filter(f => normalize(f.name).includes(q));
    const taken = new Set(personal.map(f => normalize(f.name)));
    const common = searchCommon(query).filter(f => !taken.has(normalize(f.name)));
    return [...personal, ...common];
  }

  return {
    COMMON_FOODS, normalize, iconFor, tintFor, toFood, makeCustomFood, findCommon,
    defaultSelection, macrosPer100, gramsOf, compute, fmtNum, qtyLabel, qualifiersOf,
    searchCommon, search
  };
})();

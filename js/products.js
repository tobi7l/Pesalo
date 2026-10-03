// Base local de productos envasados de Argentina (datos de Open Food Facts, ODbL).
// Se carga una sola vez desde data/ar-products.json y despues funciona sin internet.
const Products = (() => {
  let items = null;
  let loading = null;

  const norm = (s) => FoodApi.normalize(s);

  function load() {
    if (items) return Promise.resolve(items);
    if (loading) return loading;
    const get = (url) => fetch(url).then(r => {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
    // Los cargados a mano (curated) van primero; si fallan, igual sirve la base grande.
    loading = Promise.all([get("data/curated-products.json").catch(() => ({ items: [] })), get("data/ar-products.json")])
      .then(([cur, big]) => {
        items = cur.items.concat(big.items).map(a => ({
          code: a[0], name: a[1], brand: a[2], kcal: a[3], protein: a[4], carbs: a[5], fat: a[6],
          unitGrams: a[7] || null, unitName: a[8] || null,
          nameN: norm(a[1]), hay: norm(a[1] + " " + a[2])
        }));
        return items;
      })
      .catch(() => {
        loading = null;
        return null;
      });
    return loading;
  }

  function isLoaded() {
    return items !== null;
  }

  function toFood(it) {
    return FoodApi.makeCustomFood({
      name: it.name, brand: it.brand, kcal: it.kcal, protein: it.protein,
      carbs: it.carbs, fat: it.fat, barcode: it.code, source: "barcode",
      unitGrams: it.unitGrams, unitName: it.unitName
    });
  }

  // Todas las palabras tienen que aparecer en nombre o marca; primero los que
  // empiezan con lo buscado y despues por popularidad (orden del archivo).
  function search(query, limit) {
    if (!items) return [];
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const first = tokens[0];
    const hits = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!tokens.every(t => it.hay.includes(t))) continue;
      const rank = it.nameN.startsWith(first) ? 0 : (" " + it.nameN).includes(" " + first) ? 1 : 2;
      hits.push({ it, rank, i });
    }
    hits.sort((a, b) => a.rank - b.rank || a.i - b.i);
    return hits.slice(0, limit || 40).map(h => toFood(h.it));
  }

  function findByBarcode(code) {
    if (!items) return null;
    const it = code && items.find(x => x.code === code);
    return it ? toFood(it) : null;
  }

  return { load, isLoaded, search, findByBarcode };
})();

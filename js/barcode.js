// Escaneo de codigo de barras (ZXing) + consulta a Open Food Facts para traer
// la info nutricional del producto automaticamente.
const Barcode = (() => {
  let codeReader = null;

  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.ZXing);
  }

  function start(videoElementId, onDetect, onError) {
    if (!isSupported()) {
      onError && onError(new Error("Este navegador no soporta escanear con la camara."));
      return;
    }
    codeReader = new ZXing.BrowserMultiFormatReader();
    codeReader.decodeFromConstraints(
      { video: { facingMode: "environment" } },
      videoElementId,
      (result) => {
        if (result) {
          const text = result.getText();
          stop();
          onDetect(text);
        }
      }
    ).catch((err) => {
      stop();
      onError && onError(err);
    });
  }

  function stop() {
    if (codeReader) {
      try { codeReader.reset(); } catch (e) {}
      codeReader = null;
    }
  }

  async function lookup(barcode) {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,nutriments`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error consultando Open Food Facts (" + res.status + ")");
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const n = data.product.nutriments || {};
    const kcal = n["energy-kcal_100g"];
    const protein = n["proteins_100g"];
    const carbs = n["carbohydrates_100g"];
    const fat = n["fat_100g"];
    if ([kcal, protein, carbs, fat].every((v) => v === undefined)) return null;

    const rawName = (data.product.product_name || "").trim() || "Producto escaneado";
    const brand = data.product.brands ? data.product.brands.split(",")[0].trim() : "";
    const showBrand = brand && !rawName.toLowerCase().includes(brand.toLowerCase());
    return {
      name: showBrand ? `${rawName} (${brand})` : rawName,
      kcal: kcal || 0,
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
      barcode
    };
  }

  return { isSupported, start, stop, lookup };
})();

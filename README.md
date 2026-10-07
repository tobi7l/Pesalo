# Pesalo

PWA simple para contar calorias y macros diarios (estilo Fitia), instalable en iPhone desde Safari ("Compartir" > "Agregar a inicio").

## Uso

1. Abrir la URL de GitHub Pages en Safari (iPhone).
2. Agregar a inicio para que funcione como app instalada.
3. En **Ajustes**, definir el objetivo de calorias y la distribucion de macros.
4. En **Agregar**, buscar el alimento, indicar los gramos y confirmar. Si no aparece, se puede cargar manualmente con los valores del envase (por 100 g o por porcion) - queda guardado para futuras busquedas.

La base de alimentos es local: una lista propia de alimentos comunes y cortes de carne, mas una base de productos envasados de Argentina (`data/ar-products.json`, derivada de Open Food Facts) y todo lo que el usuario carga manualmente. El escaner de codigos de barras primero busca en esa base local (sin internet) y recien despues consulta Open Food Facts. Todos los datos (comidas cargadas, ajustes, alimentos guardados) se guardan solo en el navegador del dispositivo (localStorage) - no hay backend ni servidor propio.

## Desarrollo local

Servir la carpeta con cualquier servidor estatico, por ejemplo:

```bash
python3 -m http.server 8080
```

y abrir `http://localhost:8080`.

## Base de productos de Argentina

Los datos de `data/ar-products.json` provienen de [Open Food Facts](https://world.openfoodfacts.org) y se usan bajo la licencia ODbL (atribucion requerida; los datos derivados se comparten bajo la misma licencia).

Para regenerarla:

```bash
python3 scripts/fetch_off_ar.py          # lee la exportacion oficial (~1.3 GB, en streaming) y extrae Argentina
python3 scripts/build_ar_products.py     # filtra, deduplica y arma data/ar-products.json
```

# Pesalo

PWA simple para contar calorias y macros diarios (estilo Fitia), instalable en iPhone desde Safari ("Compartir" > "Agregar a inicio").

## Uso

1. Abrir la URL de GitHub Pages en Safari (iPhone).
2. Agregar a inicio para que funcione como app instalada.
3. En **Ajustes**, cargar tu API key gratuita de USDA FoodData Central (https://fdc.nal.usda.gov/api-key-signup) y definir tu objetivo de calorias y distribucion de macros.
4. En **Agregar**, buscar el alimento, indicar los gramos y confirmar. Si no aparece, se puede cargar manualmente con sus valores por 100 g.

Todos los datos (comidas cargadas, ajustes, API key) se guardan solo en el navegador del dispositivo (localStorage) - no hay backend ni servidor propio.

## Desarrollo local

Servir la carpeta con cualquier servidor estatico, por ejemplo:

```bash
python3 -m http.server 8080
```

y abrir `http://localhost:8080`.

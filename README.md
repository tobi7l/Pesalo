# Pesalo

PWA simple para contar calorias y macros diarios (estilo Fitia), instalable en iPhone desde Safari ("Compartir" > "Agregar a inicio").

## Uso

1. Abrir la URL de GitHub Pages en Safari (iPhone).
2. Agregar a inicio para que funcione como app instalada.
3. En **Ajustes**, definir el objetivo de calorias y la distribucion de macros.
4. En **Agregar**, buscar el alimento, indicar los gramos y confirmar. Si no aparece, se puede cargar manualmente con sus valores por 100 g - queda guardado para futuras busquedas.

La base de alimentos es local (sin API externa): una lista propia de alimentos comunes y cortes de carne, mas todo lo que el usuario carga manualmente. Todos los datos (comidas cargadas, ajustes, alimentos guardados) se guardan solo en el navegador del dispositivo (localStorage) - no hay backend ni servidor propio.

## Desarrollo local

Servir la carpeta con cualquier servidor estatico, por ejemplo:

```bash
python3 -m http.server 8080
```

y abrir `http://localhost:8080`.

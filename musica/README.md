# Carpeta /musica

Aquí deposita los archivos de audio que quieras que aparezcan en la sección **Música** del landing.

## Cómo agregar un set

1. Sube tu archivo `.mp3` a esta carpeta (por ejemplo `mix-enero-2026.mp3`).
2. Edita `tracks.json` y añade una entrada:

```json
{
  "title": "Nombre del set o fiesta",
  "artist": "Nombre del DJ",
  "src": "musica/mix-enero-2026.mp3",
  "duration": "1:05:00"
}
```

3. Guarda, sube a Render y recarga la página.

## Notas

- `src` puede ser una ruta relativa (`musica/tu-archivo.mp3`) o una URL externa.
- La música **no se reproduce automáticamente**. El visitante debe activarla.
- Los formatos recomendados son `.mp3` o `.ogg`.

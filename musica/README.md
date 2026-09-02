# Carpeta /musica

Aquí deposita los archivos de audio que quieras que aparezcan en la sección **Música** del landing.

## Cómo agregar sets desde Relay

Si ya tienes sets organizados en `Amarea/Relay/Musica`, corre:

```bash
npm run sync-build
```

Eso copiará `Relay/Musica/**` a esta carpeta y regenerará `tracks.json` automáticamente.

## Cómo agregar un set manual

1. Sube tu archivo `.mp3`, `.wav` o `.ogg` a esta carpeta.
2. Corre `node build-music.js` para regenerar `tracks.json`.
3. Guarda, sube a Render y recarga la página.

## Notas

- `src` puede ser una ruta relativa (`musica/tu-archivo.mp3`) o una URL externa.
- La música **no se reproduce automáticamente**. El visitante elige cuándo activarla.
- El panel incluye volumen, ecualizador 3 bandas, shuffle y autoplay.

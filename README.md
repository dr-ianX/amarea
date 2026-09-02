# AMAREA Landing

Landing page de AMAREA — fiestas inmersivas, música electrónica y experiencias en San José del Cabo, Baja California Sur.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dr-ianX/amarea)

## Características

- Diseño contemporáneo, minimalista y nocturno.
- Pestañas: Inicio, Experiencia, Residentes, Eventos, Radar, Mapa, Brief, Comunidad y Contacto.
- Chat de comunidad persistente en `localStorage`.
- Reproductor de sets con visualizador; la música no inicia sola.
- Radar: noticias DJ y Cabo News.
- Mapa interactivo de San José del Cabo.
- Cuestionario wizard de 161 preguntas para clientes/equipo, con borrador automático.
- Login con roles: invitado, cliente y admin.
- Panel admin privado con respuestas, usuarios y exportación JSON.
- Efectos visuales: partículas, blobs, spotlight y gradientes animados.
- Carpeta `/musica` para que deposites tus sets manualmente.
- Despliegue estático gratuito en Render.

## Stack

- HTML5
- Tailwind CSS (CDN)
- JavaScript vanilla
- Web Audio API (visualizador)

## Estructura

- `index.html` — estructura de la landing
- `styles.css` — estilos, efectos y animaciones
- `app.js` — tabs, chat, música, visualizador, auth, cuestionario y admin
- `cuestionario.js` — datos de las 161 preguntas
- `musica/tracks.json` — lista de sets
- `musica/` — archivos de audio
- `render.yaml` — configuración de despliegue en Render

## Despliegue en Render

1. Crea un repositorio en GitHub.
2. Sube la carpeta `amarea-landing` (o el contenido directo si es repo propio).
3. En [render.com](https://render.com) elige **New → Static Site**.
4. Conecta el repo y usa:
   - **Build Command:** `npm run build`
   - **Publish directory:** `.`

Render generará una URL tipo `https://amarea-landing.onrender.com`.

## Nota sobre datos y admin

En la versión estática todo se guarda en el navegador con `localStorage`:
- Chat, usuarios, borrador del cuestionario y respuestas enviadas **no viajan a un servidor**.
- El admin puede ver solo las respuestas enviadas **desde ese mismo dispositivo/navegador**.
- Si quieres que los 4 integrantes respondan desde sus propios dispositivos y tú veas todo desde el tuyo, se requiere un backend + base de datos (p. ej. Supabase, Firebase o una API en Render).

## Conectar métricas a Google Sheets

1. Crea una hoja de cálculo en Google Sheets vacía.
2. Abre **Extensión → Apps Script** y pega el contenido de `gas/LogToSheet.gs`.
3. Guarda el proyecto (`Ctrl+S`).
4. Ve a **Implementar → Nuevo implementación → Aplicación web**.
5. Configura:
   - **Ejecutar la aplicación como:** tu cuenta.
   - **Acceder a la aplicación web:** Cualquiera, incluso anónimo.
6. Copia la URL de la aplicación web.
7. Abre `https://tu-sitio/privado.html` e inicia sesión como `admin`.
8. Pega la URL del Apps Script en el campo de configuración.

Desde ese momento, chat, registros, logins y cuestionarios se registrarán en la hoja de cálculo. El panel `privado.html` muestra el aviso de privacidad y un dashboard interno exclusivo para el admin.

## Multimedia dinámica

La carpeta `multimedia/` detecta automáticamente fotos, clips y videos. Render ejecuta `npm run build` (que corre `build-media.js`) antes de publicar, generando `multimedia.json`. El navegador lee ese archivo y reproduce un fondo visual aleatorio que cambia en cada carga y cada pocos segundos.

Para usarlo, deposita tus archivos en `multimedia/`:
- Soportados: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`, `.svg`, `.mp4`, `.webm`, `.mov`, `.ogv`, `.mkv`
- En local: corre `node build-media.js` tras añadir archivos.
- En Render: se regenera automáticamente con cada deploy.

El sitio evita cargar clips muy largos con tiempos de rotación de 7-20 segundos. Si un video es largo, simplemente pasa al siguiente clip.

## Seguridad y privacidad

- No se recolectan datos personales. Cada navegador recibe un `deviceId` anónimo persistente en `localStorage`.
- Ese `deviceId` no se muestra a los usuarios, pero sí al administrador en el dashboard para evitar suplantaciones y moderar.
- Las peticiones al Apps Script incluyen un token compartido (`amarea-token-2026-v1`). Los visitantes normales no pueden escribir en la hoja sin ese token.
- El admin puede bloquear dispositivos desde `privado.html` sin crear cuentas.
- El único espacio público entre usuarios es el chat. Las respuestas del cuestionario y los registros solo los ve el admin.

## Sincronización con Relay

Si la multimedia y la música originales están en `Amarea/Relay`, puedes sincronizarlas sin copiar a mano:

```bash
npm run sync-build
```

Esto copia `Relay/fotos`, `Relay/videos` y `Relay/Musica` al sitio, y genera `multimedia.json` y `musica/tracks.json`. Para no subir todo al repo, selecciona una curaduría o usa un CDN/host externo y ajusta las URLs en los manifests.

## Mini-mixer

La sección **Música** ahora incluye un mini-mixer:
- Play/pausa, anterior, siguiente, shuffle, autoplay.
- Volumen y ecualizador de 3 bandas (bass / mid / treble) vía Web Audio API.
- Tres skins visuales: dark, neon y retro.
- Visualizador radial minimalista y contemporáneo.
- La música **nunca inicia sola**. El visitante activa el sonido; autoplay solo aplica tras elegir un track.

## Chat y comunidad

- El chat es **texto plano**.
- Cada usuario elige un nickname y puede responder o borrar sus propios mensajes.
- Los mensajes se mantienen **90 días** en `localStorage`; luego se purgan localmente.
- El admin puede purgar logs de más de 90 días en Google Sheets desde `privado.html`.

## Nota sobre redes sociales

Las redes enlazadas son ejemplos basados en la investigación pública disponible. Actualízalas con los enlaces oficiales reales cuando los tengas.

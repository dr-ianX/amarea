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
   - **Build Command:** (vacío)
   - **Publish directory:** `.`

Render generará una URL tipo `https://amarea-landing.onrender.com`.

## Nota sobre datos y admin

En la versión estática todo se guarda en el navegador con `localStorage`:
- Chat, usuarios, borrador del cuestionario y respuestas enviadas **no viajan a un servidor**.
- El admin puede ver solo las respuestas enviadas **desde ese mismo dispositivo/navegador**.
- Si quieres que los 4 integrantes respondan desde sus propios dispositivos y tú veas todo desde el tuyo, se requiere un backend + base de datos (p. ej. Supabase, Firebase o una API en Render).

## Nota sobre redes sociales

Las redes enlazadas son ejemplos basados en la investigación pública disponible. Actualízalas con los enlaces oficiales reales cuando los tengas.

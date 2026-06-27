# Encender el online con Render (sin terminal)

El "árbitro" (servidor) ya está en este repo (`src/server`, `render.yaml`). Solo
hay que desplegarlo en Render y conectarlo con el sitio. Todo desde el navegador.

## 1. Crear el servicio en Render
1. Entra a **render.com** e inicia sesión con tu GitHub.
2. Arriba a la derecha: **New + → Blueprint**.
3. Elige tu repositorio **Cachos** → **Connect** → **Apply**.
   - Render lee `render.yaml` y crea el servicio **cachos-arbitro** (plan Free) solo.
4. Espera a que el deploy quede en **Live** (~2–4 min la primera vez).

## 2. Copiar la dirección del servidor
En la página del servicio, arriba aparece su URL, algo como:

```
https://cachos-arbitro.onrender.com
```

Cópiala. (Si abres esa URL en el navegador, debe decir "Árbitro del Cacho — OK".)

## 3. Conectar el sitio con el servidor
1. En GitHub → repo **Cachos** → **Settings → Secrets and variables → Actions →
   New repository secret**.
2. Crea uno llamado **`VITE_BACKEND_URL`** con esa URL como valor.
3. Ve a la pestaña **Actions** → workflow **"Deploy PWA a GitHub Pages"** →
   **Run workflow**. Espera ~1–2 min.

## 4. ¡A jugar!
Abre **https://agobantesc.github.io/Cachos/** → **Mesa en línea** → **Crear sala**.
Comparte el **código** por WhatsApp; cada amigo entra con ese código desde su
teléfono. Tú (anfitrión) das **Iniciar**.

---

### Notas
- **No necesitas ninguna API key.** Solo pegas la URL.
- **Plan Free:** el servidor "se duerme" tras ~15 min sin uso; la **primera**
  conexión lo despierta (~30–60 s) y luego va fluido. Las salas viven en memoria
  (ideal para "creo sala y jugamos ahora"); si todos recargan, se puede volver a
  entrar con el mismo código (cada quien recupera su asiento).
- Si algún día quieres que esté siempre despierto, sube el servicio al plan
  pagado de Render (~US$7/mes). No hay que cambiar nada del código.
- Si cambias el motor del juego, Render reconstruye solo en cada push a la rama.

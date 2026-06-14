# Poner el Cacho en el teléfono

Dos partes. La **Parte A** te da el link jugable en el iPhone (modo "pasar el
teléfono") en minutos. La **Parte B** enciende el multijugador real (cada amigo
desde su propio teléfono). Puedes hacer A primero y B después.

---

## Parte A — El link (GitHub Pages, gratis)

Tu repo es público, así que Pages es gratis. El despliegue ya está automatizado
(`.github/workflows/deploy.yml`).

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Ve a la pestaña **Actions** y deja correr el workflow "Deploy PWA a GitHub Pages"
   (corre solo en cada push; si no, dale **Run workflow**).
3. Cuando termine (~1–2 min), tu juego queda en:
   **https://agobantesc.github.io/Cachos/**
4. Abre esa URL en Safari (iPhone) → botón Compartir → **Agregar a pantalla de
   inicio**. ¡Ya tienes el ícono como una app!

> En este punto el modo **"Jugar local (pasar el teléfono)"** ya funciona en el
> teléfono. El modo "Jugar en línea" pedirá configurar el backend (Parte B).

---

## Parte B — El backend (Supabase, gratis)

### B1. Crear el proyecto
1. Entra a **supabase.com**, crea una cuenta y un **New project** (plan free).
2. Elige una región cercana (ej. *South America (São Paulo)*) y guarda la
   contraseña de la base de datos.

### B2. Crear las tablas y la seguridad
1. En el dashboard: **SQL Editor → New query**.
2. Copia y pega TODO el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   y dale **Run**. (Crea las tablas, las reglas de seguridad y el tiempo real.)

### B3. Habilitar el ingreso anónimo
**Authentication → Sign In / Providers → Anonymous** → actívalo. (Así cada
dispositivo entra sin registrarse y sus dados son suyos.)

### B4. Desplegar el "árbitro" (Edge Function) — en un computador con Node
El motor ya va empaquetado y versionado en el repo, así que NO hay que compilar
nada: sólo conectar la CLI y desplegar.
```bash
npx supabase login
npx supabase link --project-ref <TU_REF>   # el REF está en Project Settings → General
npx supabase functions deploy jugar
```
> La función recibe sola las claves `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
> `SUPABASE_SERVICE_ROLE_KEY` (Supabase las inyecta); no hay que configurarlas.
> Si en el futuro cambias el motor, corre `npm run build:engine` y vuelve a
> desplegar.


### B5. Conectar el link con el backend
1. En Supabase: **Project Settings → API**. Copia **Project URL** y la **anon public key**.
2. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**,
   y crea dos:
   - `VITE_SUPABASE_URL` → la Project URL
   - `VITE_SUPABASE_ANON_KEY` → la anon public key
3. Vuelve a **Actions → Run workflow** (o haz cualquier push) para reconstruir.
4. Listo: en https://agobantesc.github.io/Cachos/ ya aparece **"Jugar en línea"**
   funcionando. Crea una sala, comparte el código por WhatsApp y a jugar.

---

## Probarlo en línea desde tu computador (opcional, antes de publicar)
Crea un archivo `.env.local` (copia de `.env.example`) con tus `VITE_SUPABASE_URL`
y `VITE_SUPABASE_ANON_KEY`, y corre `npm run dev`.

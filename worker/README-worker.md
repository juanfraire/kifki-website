# Registro de accesos de Kifki — Worker de Cloudflare

Registra cada visita al sitio (IP, país, ciudad, red/ASN, fuente, dispositivo…)
y expone estadísticas agregadas para `admin.html`, protegidas por un token.

- **`kifki-analytics.js`** — el Worker (dos rutas: `POST /collect`, `GET /api/stats`).
- **`wrangler.toml`** — configuración de despliegue.
- El cliente que envía las balizas es **`../js/track.js`** (ya incluido en `index.html`).
- El panel es **`../admin.html`**.

Todo funciona en el **plan gratuito** de Cloudflare.

## Requisitos

- Una cuenta de Cloudflare (la misma zona de `kifki.ar` ya está en Cloudflare).
- Node.js instalado. Usá `npx wrangler …` (no hace falta instalar nada global).

## Pasos

Desde la carpeta `worker/`:

```bash
cd worker

# 1) Iniciar sesión en Cloudflare
npx wrangler login

# 2) Crear el almacén KV
npx wrangler kv namespace create KIFKI_HITS
#   → copiá el "id" que devuelve y pegalo en wrangler.toml (reemplazá PEGAR_ID_AQUI)

# 3) Definir el token del panel (te lo pide por consola; elegí uno largo)
npx wrangler secret put ADMIN_TOKEN

# 4) Desplegar
npx wrangler deploy
```

Al terminar te da una URL tipo `https://kifki-analytics.TU-CUENTA.workers.dev`.

## Conectar el sitio con el Worker

Tenés dos opciones:

### A) Mismo dominio (recomendado)

Si `kifki.ar` pasa por Cloudflare con la **nube naranja** (proxy activo),
descomentá el bloque `routes` en `wrangler.toml`, volvé a hacer `npx wrangler deploy`,
y dejá `BASE = ""` en `js/track.js` (ya viene así). El panel también usa el mismo origen.
Ventaja: `/collect` y `/api/*` quedan en `kifki.ar`, sin CORS.

> Nota: para servir GitHub Pages con proxy naranja, el registro DNS de `kifki.ar`
> debe estar proxeado en Cloudflare apuntando a GitHub Pages. Las rutas del Worker
> interceptan solo `/collect` y `/api/*`; el resto lo sigue sirviendo Pages.

### B) Subdominio workers.dev (sin tocar el dominio)

No definas `routes`. Copiá la URL `…workers.dev` en dos lugares:

1. `js/track.js` → `const BASE = "https://kifki-analytics.TU-CUENTA.workers.dev";`
2. En `admin.html`, campo **Servidor** de la pantalla de ingreso (se guarda solo).

El Worker ya manda cabeceras CORS, así que funciona entre dominios.

## Usar el panel

Abrí `https://kifki.ar/admin.html`, pegá el **token** (el de `ADMIN_TOKEN`) y,
si usás la opción B, la URL del Worker en **Servidor**. Se guardan en el navegador
para la próxima. Filtros por período, KPIs, países/ciudades/fuentes y la tabla de
últimas visitas con IP.

## Datos y privacidad

- Cada visita se guarda en KV con vencimiento automático a los **200 días**
  (`HIT_TTL_DAYS` en el Worker).
- Se guarda IP y geolocalización aproximada de Cloudflare. Es un registro de
  accesos privado; si publicás un aviso de privacidad, tenelo en cuenta.
- El panel recorre hasta `MAX_SCAN` (5000) visitas por consulta. Para más volumen,
  conviene migrar el almacenamiento a **Cloudflare D1** (SQL) y consultar por fecha.

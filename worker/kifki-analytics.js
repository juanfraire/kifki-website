/* ============================================================
   Kifki · Worker de registro de accesos (Cloudflare)
   ------------------------------------------------------------
   Dos rutas:
     POST /collect        → guarda una visita en KV (agrega IP + geo
                            del lado servidor, desde request.cf).
     GET  /api/stats       → devuelve estadísticas agregadas en JSON,
                            protegido por token (?token=... o header
                            Authorization: Bearer ...).

   Requiere un namespace KV con binding "KIFKI_HITS" (ver wrangler.toml)
   y un secreto/variable ADMIN_TOKEN.

   Desplegar: ver worker/README-worker.md
   ============================================================ */

const MAX_SCAN = 5000;          // techo de visitas a recorrer por consulta
const HIT_TTL_DAYS = 200;       // las visitas se autoborran pasado este plazo
const UA_MAX = 180;             // recorte del user-agent guardado

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const origin = request.headers.get("Origin") || "*";

    // Preflight CORS (por si algún navegador lo dispara).
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (path === "/collect" && request.method === "POST") {
      return handleCollect(request, env, ctx, origin);
    }

    if (path === "/api/stats" && request.method === "GET") {
      return handleStats(request, env, url, origin);
    }

    return json({ ok: false, error: "not found" }, 404, origin);
  },
};

/* ---------- Recolección ---------- */

async function handleCollect(request, env, ctx, origin) {
  let data = {};
  try {
    const text = await request.text();
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = {};
  }

  const cf = request.cf || {};
  const now = Date.now();

  const rec = {
    t: now,
    ip: request.headers.get("CF-Connecting-IP") || "",
    country: cf.country || "",
    region: cf.region || cf.regionCode || "",
    city: cf.city || "",
    postal: cf.postalCode || "",
    lat: cf.latitude || "",
    lon: cf.longitude || "",
    asn: cf.asn || "",
    org: cf.asOrganization || "",
    colo: cf.colo || "",
    tz: cf.timezone || str(data.tz),
    // señales del cliente
    source: str(data.source) || "directo",
    ref: str(data.ref),
    refHost: str(data.refHost),
    medium: str(data.medium),
    campaign: str(data.campaign),
    path: str(data.path) || "/",
    title: str(data.title),
    lang: str(data.lang),
    screen: str(data.screen),
    viewport: str(data.viewport),
    touch: data.touch ? 1 : 0,
    returning: data.returning === 1 ? 1 : (data.returning === 0 ? 0 : ""),
    device: deviceOf(str(data.ua), data.touch),
    ua: str(data.ua).slice(0, UA_MAX),
  };

  // clave cronológica: h:<timestamp>:<aleatorio>
  const key = "h:" + String(now).padStart(15, "0") + ":" + rnd();

  // guardamos el registro en metadata (para listar barato) y en el valor.
  const meta = compact(rec); // metadata KV: máx 1024 bytes
  ctx.waitUntil(
    env.KIFKI_HITS.put(key, JSON.stringify(rec), {
      metadata: meta,
      expirationTtl: HIT_TTL_DAYS * 86400,
    })
  );

  // 1x1 gif transparente por si se usa como pixel; con sendBeacon se ignora.
  return new Response(null, { status: 204, headers: cors(origin) });
}

/* ---------- Estadísticas ---------- */

async function handleStats(request, env, url, origin) {
  const token =
    url.searchParams.get("token") ||
    (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");

  const expected = env.ADMIN_TOKEN || "";
  if (!expected || token !== expected) {
    return json({ ok: false, error: "no autorizado" }, 401, origin);
  }

  const sinceDays = clampInt(url.searchParams.get("days"), 0, 3650, 0);
  const sinceTs = sinceDays ? Date.now() - sinceDays * 86400000 : 0;

  // recorremos KV leyendo solo metadata (sin gets individuales).
  const hits = [];
  let cursor;
  do {
    const list = await env.KIFKI_HITS.list({ prefix: "h:", limit: 1000, cursor });
    for (const k of list.keys) {
      const m = k.metadata;
      if (!m) continue;
      if (sinceTs && (m.t || 0) < sinceTs) continue;
      hits.push(m);
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor && hits.length < MAX_SCAN);

  hits.sort((a, b) => (b.t || 0) - (a.t || 0));

  const stats = aggregate(hits);
  stats.recent = hits.slice(0, 200);
  stats.scanned = hits.length;
  stats.capped = hits.length >= MAX_SCAN;
  stats.ok = true;

  return json(stats, 200, origin);
}

function aggregate(hits) {
  const bySource = {}, byRef = {}, byCountry = {}, byCity = {}, byDevice = {},
        byPath = {}, byDay = {};
  const ips = new Set();
  let returning = 0, newv = 0;

  for (const h of hits) {
    if (h.ip) ips.add(h.ip);
    bump(bySource, h.source || "directo");
    bump(byRef, h.refHost || (h.source === "directo" ? "(directo)" : h.source));
    bump(byCountry, h.country || "??");
    bump(byCity, cityLabel(h));
    bump(byDevice, h.device || "?");
    bump(byPath, h.path || "/");
    bump(byDay, dayKey(h.t));
    if (h.returning === 1) returning++;
    else if (h.returning === 0) newv++;
  }

  return {
    total: hits.length,
    uniqueIps: ips.size,
    newVisitors: newv,
    returningVisitors: returning,
    sources: topN(bySource, 20),
    referrers: topN(byRef, 20),
    countries: topN(byCountry, 30),
    cities: topN(byCity, 30),
    devices: topN(byDevice, 10),
    paths: topN(byPath, 20),
    timeline: Object.keys(byDay).sort().map((d) => ({ day: d, count: byDay[d] })),
  };
}

/* ---------- utilidades ---------- */

function str(v) { return (v == null) ? "" : String(v); }

function deviceOf(ua, touch) {
  ua = (ua || "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return "móvil";
  if (ua) return "escritorio";
  return touch ? "móvil" : "escritorio";
}

function cityLabel(h) {
  const c = h.city || "";
  const cc = h.country || "";
  if (c && cc) return c + ", " + cc;
  return c || cc || "??";
}

function compact(rec) {
  // metadata debe pesar < 1024 bytes: guardamos lo esencial para el panel.
  return {
    t: rec.t, ip: rec.ip, country: rec.country, region: rec.region,
    city: rec.city, asn: rec.asn, org: (rec.org || "").slice(0, 60),
    source: rec.source, refHost: rec.refHost, medium: rec.medium,
    campaign: rec.campaign, path: rec.path, device: rec.device,
    returning: rec.returning, colo: rec.colo, lang: rec.lang,
  };
}

function bump(o, k) { o[k] = (o[k] || 0) + 1; }

function topN(o, n) {
  return Object.keys(o)
    .map((k) => ({ label: k, count: o[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function dayKey(t) {
  const d = new Date(t || 0);
  return d.toISOString().slice(0, 10);
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function rnd() {
  return Math.random().toString(36).slice(2, 9);
}

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...cors(origin || "*"),
    },
  });
}

/* ============================================================
   Kifki · registro de accesos (cliente)
   Manda una "baliza" al Worker de Cloudflare en cada visita.
   El IP, país, ciudad y ASN los agrega el Worker desde
   request.cf (lado servidor); acá solo enviamos lo que el
   navegador conoce: referente, campaña (utm), dispositivo, etc.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Configuración ----------
     Dejalo vacío ("") si el Worker corre en una ruta del propio
     dominio (kifki.ar/collect). Si lo desplegás en un subdominio
     workers.dev, poné acá la base, sin barra final. Ej:
     const BASE = "https://kifki-analytics.tu-cuenta.workers.dev";
  */
  const BASE = "https://kifki-analytics.kifki.workers.dev";

  // No registrar el propio panel de administración.
  if (/\/admin(\.html)?$/i.test(location.pathname)) return;

  const COLLECT = (BASE || "") + "/collect";

  try {
    const q = new URLSearchParams(location.search);
    const nav = navigator;
    const scr = window.screen || {};

    // Fuente legible: utm_source > host del referente > "directo"
    let refHost = "";
    if (document.referrer) {
      try { refHost = new URL(document.referrer).hostname.replace(/^www\./, ""); }
      catch (e) { refHost = ""; }
    }
    const sameSite = refHost && refHost === location.hostname;
    const source =
      q.get("utm_source") ||
      q.get("ref") ||
      (refHost && !sameSite ? refHost : "") ||
      "directo";

    const payload = {
      path: location.pathname + location.search,
      ref: document.referrer || "",
      refHost: sameSite ? "(interno)" : refHost,
      source: source,
      medium: q.get("utm_medium") || "",
      campaign: q.get("utm_campaign") || "",
      title: document.title || "",
      lang: nav.language || "",
      langs: (nav.languages || []).slice(0, 3).join(","),
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
      screen: (scr.width || 0) + "x" + (scr.height || 0),
      viewport: window.innerWidth + "x" + window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      touch: (("ontouchstart" in window) || nav.maxTouchPoints > 0) ? 1 : 0,
      ua: nav.userAgent || "",
      // pista de "nuevo vs. repetido" sin cookies invasivas
      returning: (function () {
        try {
          const seen = localStorage.getItem("kf_seen");
          localStorage.setItem("kf_seen", "1");
          return seen ? 1 : 0;
        } catch (e) { return ""; }
      })(),
    };

    const body = JSON.stringify(payload);

    // text/plain mantiene la petición "simple" (sin preflight CORS),
    // funcione en la misma ruta del dominio o en un subdominio workers.dev.
    if (nav.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      nav.sendBeacon(COLLECT, blob);
    } else {
      fetch(COLLECT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    }
  } catch (e) {
    /* el registro nunca debe romper la página */
  }
})();

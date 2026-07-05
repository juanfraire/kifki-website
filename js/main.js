/* ============================================================
   Kifki · Literatura Infantil — animaciones de la landing
   GSAP + ScrollTrigger + Lenis (todo por CDN, sin build)
   ============================================================ */

(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const params = new URLSearchParams(location.search);
  const shotMode = params.has("shot") || params.has("p"); // modo captura: sin smooth scroll
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll suave (Lenis) ---------- */

  if (!reducedMotion && !shotMode && window.Lenis) {
    const lenis = new Lenis({ lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Encabezado ---------- */

  const head = document.getElementById("siteHead");
  ScrollTrigger.create({
    start: 80,
    onUpdate: (self) => head.classList.toggle("is-solid", self.scroll() > 80),
  });

  /* ============================================================
     Logo: trazos guía que "dibujan" el contorno azul.
     Coordenadas en el espacio 0-375 del SVG del logo.
     Cada guía es un trazo blanco grueso dentro de una máscara:
     al animar su stroke-dashoffset, revela el dibujo real debajo.
     ============================================================ */

  const GUIDES = KIFKI_GUIDES; // definidos en js/guides.js (compartidos con el harness de cobertura)

  const logoState = { svg: null, tl: null };

  function setupLogo(svgText) {
    const mount = document.getElementById("logoMount");
    mount.innerHTML = svgText;
    const svg = mount.querySelector("svg");
    logoState.svg = svg;

    const defs = svg.querySelector("defs");

    // --- Máscara de dibujo para el contorno azul ---
    const mask = document.createElementNS(SVG_NS, "mask");
    mask.setAttribute("id", "mDraw");
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("x", "0");
    mask.setAttribute("y", "0");
    mask.setAttribute("width", "375");
    mask.setAttribute("height", "375");

    const bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", "375");
    bg.setAttribute("height", "375");
    bg.setAttribute("fill", "black");
    mask.appendChild(bg);

    const guidePaths = GUIDES.map((g) => {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", g.d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "white");
      p.setAttribute("stroke-width", g.w);
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      p.setAttribute("pathLength", "1");
      p.style.strokeDasharray = "1 2"; /* gap > 1 evita que el tramo siguiente asome por el extremo */
      p.style.strokeDashoffset = "1";
      mask.appendChild(p);
      return p;
    });

    defs.appendChild(mask);
    svg.querySelector("#contour").setAttribute("mask", "url(#mDraw)");

    // --- Máscara de barrido para el nombre "Kifki" ---
    const maskW = document.createElementNS(SVG_NS, "mask");
    maskW.setAttribute("id", "mWord");
    maskW.setAttribute("maskUnits", "userSpaceOnUse");
    const wRect = document.createElementNS(SVG_NS, "rect");
    wRect.setAttribute("x", "140");
    wRect.setAttribute("y", "242");
    wRect.setAttribute("width", "0");
    wRect.setAttribute("height", "60");
    wRect.setAttribute("fill", "white");
    maskW.appendChild(wRect);
    defs.appendChild(maskW);
    svg.querySelector("#wordmark").setAttribute("mask", "url(#mWord)");

    const body = svg.querySelector("#body");
    const eye = svg.querySelector("#eye");
    const book = svg.querySelector("#book");
    const tagline = svg.querySelector("#tagline");

    if (reducedMotion) {
      // estado final directo, sin animación
      guidePaths.forEach((p) => (p.style.strokeDashoffset = "0"));
      wRect.setAttribute("width", "110");
      return;
    }

    // estados iniciales
    gsap.set(body, { opacity: 0, scale: 0.88, transformOrigin: "50% 60%" });
    gsap.set(eye, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
    gsap.set(book, { opacity: 0, x: 46, y: -64, rotation: 30, scale: 0.4, transformOrigin: "50% 50%" });
    gsap.set(tagline, { opacity: 0, y: 8 });

    // --- Línea de tiempo maestra, atada al scroll ---
    // Con ?p=0..1 se construye pausada (sin pin) para capturar estados exactos.
    const debugSeek = params.has("p");
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      paused: debugSeek,
      scrollTrigger: debugSeek
        ? undefined
        : {
            trigger: "#hero",
            start: "top top",
            end: "+=320%",
            pin: ".hero-stage",
            scrub: 0.6,
            anticipatePin: 1,
          },
    });
    logoState.tl = tl;

    // 1 · el titular se desvanece mientras arranca el dibujo
    // (solo opacity/transform: animar letter-spacing fuerza reflow y parpadea)
    tl.to("#heroLine", { opacity: 0, y: -40, duration: 1.2 }, 0.2);
    tl.to("#scrollCue", { opacity: 0, duration: 0.5 }, 0);

    // 2 · el contorno azul se dibuja trazo a trazo
    const drawDur = 4.2;
    const per = drawDur / GUIDES.length;
    guidePaths.forEach((p, i) => {
      tl.to(p, { strokeDashoffset: 0, duration: per * 1.35 }, 0.5 + i * per * 0.82);
    });

    // 3 · la panza amarilla aparece como tinta
    tl.to(body, { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out" }, drawDur * 0.55);

    // 4 · el ojo parpadea a la vida
    tl.to(eye, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(3)" }, drawDur + 0.4);

    // 5 · el libro llega volando
    tl.to(book, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: 1.4, ease: "back.out(1.6)" }, drawDur + 0.7);

    // 6 · "Kifki" se escribe de izquierda a derecha
    tl.to(wRect, { attr: { width: 110 }, duration: 1.3 }, drawDur + 1.6);

    // 7 · aparece "Literatura Infantil"
    tl.to(tagline, { opacity: 1, y: 0, duration: 0.8 }, drawDur + 2.6);

    // 8 · aleteo suave del libro, guiado por el propio scroll (reversible, sin saltos)
    tl.to(book, { y: -5, rotation: 2.5, duration: 0.6, ease: "sine.inOut" }, drawDur + 2.9);
    tl.to(book, { y: 0, rotation: 0, duration: 0.6, ease: "sine.inOut" }, drawDur + 3.5);

    // 9 · pequeña pausa final con el logo completo
    tl.to({}, { duration: 1.0 });
  }

  fetch("assets/logo-layers.svg")
    .then((r) => r.text())
    .then(setupLogo)
    .then(initScrollJump)
    .catch((e) => {
      console.error("No se pudo cargar el logo:", e);
      document.getElementById("logoMount").innerHTML =
        '<img src="assets/logo-transparent.png" alt="" style="width:100%">';
    });

  /* ============================================================
     Escenas siguientes
     ============================================================ */

  /* ---------- Estrellas del manifiesto y la cita ---------- */

  document.querySelectorAll(".stars").forEach((box) => {
    const few = box.classList.contains("stars--few");
    const n = few ? 22 : 46;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "star" + (Math.random() < 0.25 ? " star--amarilla" : "");
      const size = 1.5 + Math.random() * 2.5;
      s.style.width = s.style.height = size + "px";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 3 + "s";
      s.style.animationDuration = 2.4 + Math.random() * 2.4 + "s";
      box.appendChild(s);
    }
  });

  /* ---------- Manifiesto: líneas que emergen ---------- */

  if (!reducedMotion) {
    gsap.utils.toArray("[data-mani]").forEach((line) => {
      gsap.from(line, {
        opacity: 0,
        y: 60,
        filter: "blur(6px)",
        duration: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: line, start: "top 78%", end: "top 45%", scrub: 0.5 },
      });
    });
  }

  /* ---------- Revelados genéricos ---------- */

  if (!reducedMotion) {
    gsap.utils.toArray("[data-reveal]").forEach((el, i) => {
      gsap.from(el, {
        opacity: 0,
        y: 44,
        duration: 0.9,
        ease: "power3.out",
        delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: el, start: "top 86%" },
      });
    });
  }

  /* ---------- Cita: palabra por palabra ---------- */

  const cita = document.getElementById("citaTexto");
  if (cita) {
    const words = cita.textContent.trim().split(/\s+/);
    cita.innerHTML = words.map((w) => `<span class="palabra">${w} </span>`).join("");
    if (!reducedMotion) {
      gsap.from(cita.querySelectorAll(".palabra"), {
        opacity: 0,
        y: 26,
        rotationX: -40,
        stagger: 0.06,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: cita, start: "top 75%", end: "top 40%", scrub: 0.4 },
      });
    }
  }

  /* ---------- Huellas que cruzan "Encontranos" ---------- */

  const HUELLA_SVG =
    '<svg viewBox="0 0 40 44" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
    '<ellipse cx="20" cy="26" rx="14" ry="16"/>' +
    '<circle cx="8" cy="9" r="4.6"/><circle cx="20" cy="6" r="4.8"/><circle cx="32" cy="9" r="4.6"/>' +
    "</svg>";

  const huellasBox = document.getElementById("huellas");
  if (huellasBox) {
    // caminata que cruza la escena por abajo, sin pisar el texto
    const steps = [
      { x: 3, y: 90, r: 60 }, { x: 10, y: 82, r: 45 },
      { x: 17, y: 88, r: 65 }, { x: 25, y: 80, r: 50 },
      { x: 33, y: 87, r: 70 }, { x: 42, y: 80, r: 55 },
      { x: 52, y: 87, r: 75 }, { x: 62, y: 81, r: 60 },
      { x: 72, y: 88, r: 80 }, { x: 82, y: 82, r: 65 },
      { x: 91, y: 89, r: 85 },
    ];
    steps.forEach((st, i) => {
      const d = document.createElement("div");
      d.className = "huella";
      d.style.left = st.x + "%";
      d.style.top = st.y + "%";
      d.style.transform = `rotate(${st.r - 20}deg)`;
      d.innerHTML = HUELLA_SVG;
      huellasBox.appendChild(d);
    });
    gsap.to(".huella", {
      opacity: 1,
      stagger: reducedMotion ? 0 : 0.14,
      duration: 0.4,
      scrollTrigger: { trigger: "#encontranos", start: "top 70%" },
    });
  }

  /* ---------- Parallax decorativo ---------- */

  if (!reducedMotion) {
    gsap.utils.toArray("[data-speed]").forEach((el) => {
      const sp = parseFloat(el.dataset.speed);
      gsap.to(el, {
        yPercent: sp * 120,
        ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  }

  /* ---------- Modo captura: saltar a un punto del héroe (?p=0..1) ---------- */

  function initScrollJump() {
    if (!params.has("p") || !logoState.tl) return;
    const p = Math.max(0, Math.min(1, parseFloat(params.get("p")) || 0));
    logoState.tl.progress(p).pause();
  }
})();

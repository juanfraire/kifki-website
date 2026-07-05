# Kifki · Literatura Infantil — sitio web

Landing page de Kifki (https://www.instagram.com/kifki_literaturainfantil/), en castellano rioplatense.

- **Stack:** HTML + CSS + JS estáticos, sin build. GSAP + ScrollTrigger y Lenis por CDN.
- **Hosting:** GitHub Pages (rama `main`, raíz). El archivo `.nojekyll` evita el procesamiento Jekyll.
- **Animación estrella:** el logo se "dibuja" al scrollear (héroe fijado ~3 pantallas): el contorno azul se traza con máscaras SVG, la panza amarilla aparece como tinta, el ojo parpadea, el libro llega volando y el nombre se escribe.
- `assets/logo-layers.svg` es el logo de Canva reorganizado en capas con ids (`#body`, `#contour`, `#eye`, `#book`, `#wordmark`, `#tagline`).

## Desarrollo local

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Parámetros útiles para depurar: `?p=0.5` salta a la mitad de la animación del héroe (y desactiva el scroll suave); `?shot` solo desactiva el scroll suave.

Los trazos guía de la máscara de dibujo viven en `js/guides.js` (compartidos entre la página y el harness de cobertura). Para verificar que cubren todo el contorno azul: abrir `assets/_cov.html` (máscara aplicada al 100 %) y `assets/_cov.html?mask=0` (contorno sin máscara); un diff de píxeles entre ambas capturas muestra lo que quede sin cubrir.

## Accesibilidad

Con `prefers-reduced-motion: reduce` no hay pin ni scrubbing: el logo y las secciones se muestran en su estado final.

/* Trazos guía que "dibujan" el contorno azul del logo.
   Coordenadas en el espacio 0-375 del SVG (assets/logo-layers.svg).
   Cada guía se vuelve un trazo blanco dentro de una máscara SVG:
   al animar su stroke-dashoffset se revela el dibujo real debajo.
   El elefante azul es una línea continua: cola → lomo y cabeza →
   espiral de la oreja → cara → trompa colgante con rulo → pata
   delantera → panza → pata trasera. */

const KIFKI_GUIDES = [
  // cola (garabato)
  { d: "M 110 188 Q 112 174 124 179 Q 126 191 113 188 Q 117 174 130 175 Q 137 176 139 181", w: 16 },
  // pata trasera (bajada, pie y subida a la panza)
  { d: "M 138 178 L 138 233 Q 138 241 145 241 L 151 241 Q 157 241 157 233 L 157 216", w: 17 },
  // lomo y cabeza
  { d: "M 139 178 Q 141 164 155 156 Q 166 149 176 145 Q 191 132 211 135 Q 229 140 241 153", w: 17 },
  // oreja (espiral grande hacia adentro)
  { d: "M 215 141 Q 199 149 181 157 Q 169 167 172 180 Q 178 191 190 189 Q 201 185 203 172 Q 203 159 191 158 Q 182 161 184 171 Q 187 180 195 175 Q 199 170 196 165", w: 15 },
  // cara (bajada del frente)
  { d: "M 240 151 Q 246 165 246 181 Q 246 192 244 197", w: 14 },
  // trompa colgante con rulo final
  { d: "M 243 194 Q 247 202 256 204 Q 268 200 275 207 Q 282 217 274 227 Q 263 234 254 224 Q 251 214 259 209 Q 265 206 267 212", w: 17 },
  // debajo de la trompa, pata delantera (bajada, pie)
  { d: "M 257 227 Q 243 223 232 210 Q 226 201 221 199 Q 216 202 216 214 L 216 232 Q 216 240 210 240 L 202 240 Q 196 240 196 232 L 196 219", w: 16 },
  // panza
  { d: "M 199 219 Q 176 225 152 218", w: 14 },
];

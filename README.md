# Taller Responsive — Choose Seats

Diseño de Interfaces Software · UCC · 31 de agosto de 2026

Selección de asiento de avión. **Una sola interfaz**, no dos: lo que cambia entre
móvil y web son los puntos de quiebre.

Abrir `index.html`. No hay build ni instalación.

---

## Mobile first

Las reglas base son las del teléfono. Cada media query solo **agrega** ancho,
nunca lo quita. Tailwind por CDN con la configuración de la clase, más un paso
intermedio propio.

| Punto | Ancho | Qué cambia |
|---|---|---|
| base | < 640 | Una columna. Flecha de volver. Hoja oscura fija abajo. |
| `sm` | 640 | Más aire entre asientos. |
| `md` | 768 | — |
| `bp` | **900** | Punto intermedio propio. El mapa deja de estirarse. |
| `lg` | **1024** | **El giro.** Entra la tarjeta 3D, la leyenda y el pill de check-in; se va la hoja oscura y la flecha de volver; **la grilla de asientos se transpone.** |
| `xl` | 1280 | Asientos y separación más grandes. |
| `2xl` | 1536 | Asientos grandes para monitor o televisor. |

El intermedio de 900px sale de lo que dijo en clase: *"usted puede crear un
intermedio entre ellos, con una longitud X que desde ahí empiece el punto."*

## La grilla se transpone, no se reordena

Es el punto del taller. En móvil no hay ancho, entonces las filas del avión
**bajan**: fila, fila, fila. En web hay ancho, entonces las filas del avión pasan
al eje horizontal y el mapa queda acostado como el avión de arriba.

Cada asiento sabe dos cosas y nada más:

```html
<button class="seat" style="--lp:3; --rp:6">   <!-- letra C, fila 6 -->
```

Y la media query intercambia los ejes:

```css
/* móvil */
.seat { grid-column: calc(var(--lp) + 1); grid-row: calc(var(--rp) + 1); }

/* lg */
@media (min-width: 1024px) {
  .seat { grid-column: calc(var(--rp) + 1); grid-row: calc(var(--lp) + 1); }
}
```

Mismo HTML, misma data, **cero JavaScript**. Las etiquetas de fila y de letra
hacen el mismo intercambio, así que los rótulos siguen a su eje.

## Componentes que aparecen o desaparecen

*"Miren que este componente ni siquiera se ve. ¿Cómo se controla ese tipo de
cosas? Con las media queries."*

| Componente | Móvil | Web |
|---|---|---|
| Tarjeta **3D Rendering** | no se renderiza | desde `lg` |
| Leyenda (disponible / ocupado / selección) | no se renderiza | desde `lg` |
| Pill *Check-in abierto* | no se renderiza | desde `lg` |
| Rótulo `SECTIONS` | no se renderiza | desde `lg` |
| Botones flotantes del avión | no se renderiza | desde `lg` |
| Etiqueta `BUSINESS` sobre el recuadro | no se renderiza | desde `lg` |
| `A320NEO` en el subtítulo | no se renderiza | desde `lg` |
| Hoja oscura fija con total y confirmar | visible | **no se renderiza** desde `lg` |
| Flecha de volver | visible | **no se renderiza** desde `lg` |
| Pie del panel con fichas y total | no se renderiza | desde `lg` |

Y dos que no desaparecen, cambian de forma:

| | Móvil | Web |
|---|---|---|
| Título de la sección | `Premium · Sec 2` | `Section 2 (Premium Economy)` |
| Número de fila | **en el pasillo** | en el borde superior |
| Respaldo del asiento | abajo (avión parado) | a la derecha (avión acostado) |

## Comportamiento

- **Tres secciones** (Business $480, Premium Economy $260, Económica $160),
  8 filas de 6 asientos cada una.
- **El asiento elegido muestra el orden** en que se eligió: 1, 2, 3, 4.
- **El asiento es un componente con reposacabezas adentro**, y el
  reposacabezas gira con la grilla: barra horizontal abajo en móvil (el avión
  va parado) y barra vertical a la derecha en web (el avión está acostado con
  el morro a la izquierda).

  | | Móvil | Web |
  |---|---|---|
  | Cuadro | 50 × 50, radio 12 | 60 × 60, radio 14 |
  | Reposacabezas | 10 de alto, 6 de aire | 10 de ancho, 6 de aire |
  | Número | oculto | 18 px, blanco, centrado |
  | Elegido | `#6644FF` · barra `rgba(209,196,233,.6)` | igual |
  | Libre | `#E3E3E8` · barra `rgba(176,176,186,.55)` | igual |
  | Ocupado | `#C4C4CC` · barra `rgba(138,138,150,.5)` | igual |

  Los 50 y 60 px son el tope: en pantallas angostas el asiento baja
  proporcionalmente para que la cabina nunca empuje la página de costado.
- **Máximo 4 puestos.** El quinto reemplaza al más antiguo y avisa cuál salió.
- **El total cuenta, no salta.** `requestAnimationFrame` con easing cúbico.
- **El avión se anima.** El pin recorre el fuselaje hasta la fila elegida y la
  franja de la sección se desliza al cambiar de sección. De la fila 2 a la 6 se
  ve el recorrido; no aparece de golpe en el destino.
- Los asientos son `<button>` con `aria-pressed` y `aria-label`.
- `prefers-reduced-motion` apaga todas las animaciones.

## Archivos

```
index.html      maqueta + configuración de Tailwind
css/styles.css  avión, animaciones y el mapa de asientos
js/app.js       estado, selección, contador
```

Tailwind entra por CDN (`cdn.tailwindcss.com`), que es el recurso de la
presentación de la clase. El mapa de asientos va en CSS propio a mano: lo que
cambia ahí no es un tamaño sino la dirección de la grilla.

# Taller Responsive — Selección de asientos

Diseño de Interfaces Software · UCC · 2026-08-31

Una sola interfaz de selección de puesto en un avión, construida **mobile first**:
las reglas base son las del teléfono y cada media query solo agrega ancho.

**Demo:** abrir `index.html` (no requiere servidor ni build).

## Puntos de quiebre

Notación de Tailwind, escritos a mano en CSS para que se vea el trabajo, más un
paso intermedio propio en 900px.

| Punto | Ancho | Qué cambia |
|---|---|---|
| base | < 640px | Una columna. Barra inferior fija con total y confirmar. Botón de volver en el encabezado. |
| `sm` | 640px | Asientos y tipografía más grandes. |
| `md` | 768px | Aparece el detalle del vuelo (número, fecha, abordaje). |
| `bp` | **900px** | Paso intermedio propio: la cabina deja de estirarse y se centra. |
| `lg` | 1024px | **El giro.** Dos columnas: cabina + panel de resumen. Desaparece la barra inferior y el botón de volver; aparece la navegación. |
| `xl` | 1280px | Panel más ancho, más aire. |
| `2xl` | 1536px | Se limita el ancho para que la cabina no se vaya a un borde en monitores grandes. |

## Componentes que dependen del ancho

| Componente | Móvil | Web |
|---|---|---|
| Panel de resumen (`.panel`) | no se renderiza | visible desde `lg` |
| Barra inferior fija (`.bar`) | visible | no se renderiza desde `lg` |
| Navegación (check-in, mis vuelos) | no se renderiza | visible desde `lg` |
| Botón de volver | visible | no se renderiza desde `lg` |
| Detalle del vuelo | no se renderiza | visible desde `md` |

## Comportamiento

- **Máximo 4 puestos.** El quinto reemplaza al más antiguo (FIFO) y avisa cuál se cambió.
- **El total cuenta, no salta.** Interpolación con `requestAnimationFrame` y easing cúbico.
- **El indicador viaja hasta la fila.** Se anima la propiedad `top` para que el recorrido
  de la fila 2 a la 5 se vea, en vez de aparecer en el destino.
- **Cabina en dos niveles**, Premium adelante separada por cortina, con precios distintos.
- **Español por defecto, con toggle a inglés**, incluidas las etiquetas de accesibilidad.
- `prefers-reduced-motion` apaga las animaciones.

## Estructura

```
index.html
css/styles.css
js/app.js
```

Vanilla HTML/CSS/JS. Sin frameworks, sin dependencias, sin build.

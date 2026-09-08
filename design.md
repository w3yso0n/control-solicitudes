# Design — control-solicitudes

Fuente de verdad visual de la web. Cualquier decisión de UI (componente existente, pantalla nueva o patrón inédito) se consulta aquí **antes** de maquetar o inventar estilos. Si el patrón no está, se implementa alineado a los que sí existen y se documenta en este archivo.

Tokens y recetas de código: `app/globals.css`, `components/ui.tsx`, skill `.cursor/skills/diseno-plataforma/`. Este archivo manda en **intención y comportamiento**.

---

## Tipografía de títulos

Los `<h1>` / títulos de página usan Inter (`font-sans`), `font-semibold` (no `font-bold`) y `tracking-tight`. No usar `font-display` (Fraunces) en títulos de contenido: quedó para identidad de marca.

---

## Motion: hover, overlays y elementos que desaparecen

Toda la plataforma debe sentirse **smooth**. Referencia: scrollbar overlay del sidebar (`AppShell` + `.sidebar-nav-thumb` en `app/globals.css`). Chrome discreto, aparece cuando hace falta, se esconde sin corte seco.

Aplicar a tooltips, dropdowns, paneles, chips temporales, iconos de acción, scrollbars, hints, overlays y cualquier UI que entre/salga por hover, scroll o timeout.

### Tiempos

- **Aparecer**: `120ms` `ease-out` (`duration-150` en Tailwind).
- **Desaparecer**: `450ms` `ease-out` (`duration-300`–`duration-500`). Ease-out obligatorio al hide.
- No `linear`, no bounce genérico, no `spring` exagerado, no Framer Motion. Excepción: el aviso de éxito (`AvisoExito`) sí usa rebote y trazo de palomita al entrar.

### Comportamiento

- En reposo el chrome extra no se ve. El layout no salta: overlay o espacio estable.
- Hover o interacción lo revelan. Al salir: fade-out ease-out. No `display: none` inmediato ni quitar `width` de golpe.
- Si el nativo no anima (`::-webkit-scrollbar`), overlay propio (`opacity` + `transition`) como el thumb del sidebar.
- Filas, botones y links: `transition-colors` corto. Menús y modales: fade al abrir/cerrar; el hide sigue ease-out.

```css
/* hide */
transition: opacity 0.45s ease-out;
/* show */
transition: opacity 0.12s ease-out;
```

---

## Componentes

Agregar aquí un apartado por componente (existente o nuevo): cuándo usarlo, anatomía, estados (hover, focus, disabled, vacío), motion y qué no hacer.

### Aviso de éxito (tipo confirmación)

Después de una acción que sí persistió (guardar captura, actualizar folio). No SweetAlert ni toasts de librería.

- Overlay `bg-tinta/45 backdrop-blur-[2px]`, Card centrada `max-w-sm`, ícono check en círculo `bg-emerald-100 text-emerald-700`.
- Título `text-sm font-semibold`, cuerpo `text-sm text-zinc-600`. Botón primary “Listo”. Escape, clic en overlay o auto-cierre ~3.2s.
- Motion (excepción al “no bounce” global, solo este aviso): la card entra con rebote `~620ms` (`aviso-exito-bounce`: scale 0.68 → 1.08 → 0.96 → 1). El círculo del ícono hace pop con overshoot. El anillo y la palomita se dibujan (`stroke-dashoffset`). Sale `450ms ease-out` (scale 0.92 + fade), no rebote al cerrar. Respetar `prefers-reduced-motion` (sin animación).
- Copy distinto para alta vs edición. Implementación: `components/AvisoExito.tsx` + keyframes en `app/globals.css`.
- Tras captura (alta o guardar cambios), al cerrar el aviso se navega a Consulta (`/peticiones`). La salida del overlay (450ms) termina antes del cambio de ruta.

### Select / combobox

Canon: el combobox de **Municipio del evento** en Captura de lotes (`MunicipioSelect`). En filtros de listado: `FilterCombobox` (misma anatomía). No usar `<select>` nativo ni el `Select` de `components/ui.tsx` en pantallas nuevas.

**Anatomía**

- En formularios, envolver con `Field` + label uppercase zinc-500.
- Trigger: botón `rounded-2xl`, borde `zinc-200`, hover `zinc-300`, abierto `border-guinda/40 ring-2 ring-magenta/30`. Valor `font-medium text-zinc-900` + meta `text-zinc-400`. Placeholder `text-zinc-400`. ChevronDown 16px, `rotate-180` al abrir.
- Panel `mt-2 rounded-2xl`, sombra de dropdown, buscador interno (`Search` 14px + input sin borde) y lista `max-h-56`.
- Opción activa `bg-guinda/8 text-guinda`; hover `hover:bg-zinc-50`. Cerrar con Escape y clic fuera.
- Motion del panel: aparece `120ms ease-out`, desaparece `450ms ease-out` (opacity). Lista interna: overlay de scrollbar como el sidebar si hace falta.

**Estados:** cerrado / abierto / con valor / vacío “Sin coincidencias”. En filtros, primera opción “Todos…” con `emptyLabel`.

**Qué no hacer:** `<select>`, el `Select` de `ui.tsx`, paneles sin buscador si el catálogo es largo, saltos de layout al abrir.

Si una opción es **Otro (especificar)** (detectada por el texto, no por un id especial), debajo del combobox aparece un `Input` con `Field`. Al guardar se persiste el texto libre, nunca la etiqueta “Otro (especificar)”. En edición, un valor fuera del catálogo abre el combobox en Otro y precarga el input. Componente: `CampoConEspecificar`. Hoy aplica a subcategorías de captura; reutilizarlo en cualquier combobox con esa opción.

Referencia de código: `components/MunicipioSelect.tsx`, `components/FilterCombobox.tsx`, `components/CampoConEspecificar.tsx`. Uso: Captura de lotes (municipio), captura en Bandeja (`bandeja/[loteId]/[docId]`), filtros de Bandeja y Consulta.

### Cabecera de listado con muchos filtros

Cuando hay más de tres filtros, no van al lado del `h1`. El título ocupa su fila (eyebrow + conteo). Debajo: búsqueda a la izquierda y, en una grilla aparte, los combobox a todo el ancho (`grid-cols-2` / `lg:grid-cols-4` / `xl:grid-cols-7`). Referencia: Consulta de peticiones.

### Sidebar / scrollbar overlay

- Nativo oculto. Thumb propio, 4px, blanco semitransparente sobre guinda.
- Visible al hover del sidebar o al hacer scroll; hide con fade `450ms ease-out`.
- Implementación: `.sidebar-shell`, `.sidebar-nav-wrap`, `.sidebar-nav-scroll`, `.sidebar-nav-thumb`.

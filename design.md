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

### WhatsApp desde Consulta

Atajo a WhatsApp Web/app (`wa.me`), no Twilio. Icono SVG color `#128C7E` (no emerald). En la columna Teléfono y junto al teléfono del detalle.

- En Consulta (lista): píldora compacta `rounded-[999px]`, degradado `135deg` `#25D366` → `#128C7E`, texto blanco 13px/500 con el teléfono y el ícono al final, padding `6px 14px`, sombra `0 3px 8px rgba(18,140,126,0.3)`. Si el escenario es D o no hay número, se muestra el texto “Sin teléfono” sin botón.
- En el detalle: botón circular `h-8 w-8`, hover `bg-[#128C7E]/10`.
- Modal `z-[60]` en portal a `document.body` (no vive dentro de la fila de la tabla: si no, el clic del combobox abre el detalle). Overlay tinta, Card `max-w-lg`, combobox de plantilla A/B/C (canon FilterCombobox). Las plantillas disponibles siguen el escenario de captura: A solo A; B permite A y B; C solo C. Si solo hay una opción, el combobox va bloqueado (como en bandeja cuando quien envía es el peticionario).
- Placeholders `{nombre}` `{folio}` `{tema}` `{remitente}` de Configuración → Acuses. El destinatario (peticionario / remitente / ambos) ya no es editable ahí: A y C son un solo textarea, B siempre son dos (peticionario y remitente), D no tiene editor porque no abre chat.

Implementación: `components/peticiones/ModalWhatsApp.tsx`, `lib/whatsapp-acuse.ts`.

### Scroll del body con modales

Los overlays (aviso de éxito, detalle, documento ampliado) bloquean el scroll con un contador (`lib/body-scroll-lock.ts`), no con `overflow: hidden` suelto. Así un modal encima de otro no deja el `body` trabado. Al cambiar de ruta, `AppShell` llama `resetBodyScroll()`. Un overlay que está saliendo (fade 450ms) usa `pointer-events-none` para no comerse la rueda.

### Decisión binaria en modal (Procede / No procede)

Cuando un modal pide elegir entre dos desenlaces excluyentes de una acción (ej. pipeline de campaña: marcar cumplida vs. no procede), no se apilan dos formularios completos uno tras otro. Referencia: `components/cumplimientos/AccionCumplimiento.tsx`.

- Paso 1: dos botones grandes lado a lado (`grid-cols-2`), mismo tamaño, `rounded-2xl border px-4 py-3 text-sm font-semibold`. Icono `Check`/`X` de `lucide-react` + label corto ("Procede" / "No procede"). Sin seleccionar: `border-zinc-200 bg-white text-zinc-700`. Al elegir uno, ese botón toma color de estado (`emerald-600` para la opción positiva, `guinda` para la negativa) con `aria-pressed`; el otro se queda neutro. Tocar el botón activo de nuevo lo deselecciona (colapsa el formulario).
- Paso 2: solo el formulario de la opción elegida aparece debajo, envuelto en una card sutil con el tinte del estado (`border-emerald-100 bg-emerald-50/40` o `border-guinda/15 bg-guinda/[0.03]`). Nunca se muestran los dos formularios a la vez.
- El botón de confirmar del formulario hereda el color de la decisión (verde para cumplida, guinda para no procede), `w-full`, para que quede clara la relación con el botón elegido arriba.
- Acciones previas al paso de decisión (ej. "Pasar a en gestión") van solas, arriba, como un único botón — son un paso distinto, no compiten con la decisión binaria.
- Acciones secundarias que no son parte del desenlace (ej. "Reclasificar complejidad") van colapsadas al fondo del modal detrás de un disclosure discreto (`text-xs text-zinc-500` + `ChevronDown` que rota), fuera del flujo principal.

### Reportes: pantalla densa vs. documento de impresión

Referencia: `app/(app)/reportes/page.tsx`. Un reporte con muchas cifras no se resuelve con una sola vista que sirve para pantalla y para PDF — son dos layouts distintos con el mismo dato de fondo.

**En pantalla** (`print:hidden`): jerarquía en tres niveles, no una tabla plana de números.
- Hero: el KPI que manda (volumen del periodo) grande junto a su delta vs. periodo anterior, con las métricas secundarias como bloque de apoyo, no al mismo nivel visual.
- Proporciones sobre un total (cumplidas/total, intermediarios/total) van en `ArcoProporcion` (donut SVG inline), no como número suelto — el ojo necesita el contexto del total sin leer dos cifras y dividir.
- Comparativos por categoría (zona actual vs. anterior) usan `BarraComparativa`: dos barras horizontales apiladas (gruesa = actual en guinda, delgada = anterior en zinc-300) en vez de columnas de números — se escanea de un vistazo quién subió y quién bajó.
- Rankings (operadores, capturistas, distritos, temas) usan barra mini + valor a la derecha, con el color reservado por tipo de dato: guinda/brasa para volumen ciudadano, ambar para productividad de captura, emerald para cumplimiento de operadores. No mezclar el significado de un color entre secciones.
- Grid `sm:grid-cols-2` para pares de rankings relacionados, cada uno en su propia `Card` — nunca todas las secciones apiladas en una sola columna larga.

**En impresión** (`hidden print:block`, clases `print-report__*` en `globals.css`): documento propio, no una copia de la vista de pantalla con `window.print()`. Página carta (`@page { size: letter portrait; margin: 14mm 16mm }`), tipografía editorial — `font-display` (Fraunces) solo en el título del documento y el número grande de intermediarios, Inter en todo lo demás, tamaños en `pt`. Sin `Card`, sin sombras, sin `rounded-2xl`: hairlines (`border-bottom` 0.5–1.5pt en grises zinc) para separar secciones, como un documento impreso real. Tablas con cabecera uppercase pequeña y alineación numérica a la derecha. `AppShell` oculta sidebar y header con `print:hidden` y quita el padding de `main` con `print:p-0` para que el documento ocupe toda la hoja.

Si se agrega una sección nueva al reporte, se agrega en ambos layouts: la versión escaneable en pantalla y su equivalente editorial en el bloque de impresión.

### Sidebar / scrollbar overlay

- Nativo oculto. Thumb propio, 4px, blanco semitransparente sobre guinda.
- Visible al hover del sidebar o al hacer scroll; hide con fade `450ms ease-out`.
- Implementación: `.sidebar-shell`, `.sidebar-nav-wrap`, `.sidebar-nav-scroll`, `.sidebar-nav-thumb`.

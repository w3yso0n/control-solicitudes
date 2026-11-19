# Rediseño de `/digitales` — Especificación de implementación

Pantalla: **Solicitudes digitales** (revisión de lo que llega del portal público `/solicitar`).
Referencia visual: canvas "Solicitar — Beatriz Mojica", artboard **"/digitales — propuesta de revisión"**.

**Objetivo:** que revisar sea rápido. Hoy el panel es un formulario largo, los botones de acción quedan fuera de pantalla y la lista desaprovecha la mitad izquierda.

**Qué cambia, en resumen:**
1. La lista muestra lo necesario para priorizar (tipo, ubicación, antigüedad, si tiene WhatsApp o foto, si hay parecidas).
2. El panel separa **lo que envió el ciudadano** (solo lectura) de **la clasificación del equipo** (editable).
3. La ubicación llega **sugerida** desde municipio + colonia; el revisor solo confirma.
4. Clasificación compacta en 2 filas.
5. **Barra de acciones fija** que dice qué va a pasar y qué falta.
6. Selección múltiple con barra contextual y atajos de teclado.

> Se mantiene el sidebar, el header "Administrador" y los tokens actuales de la plataforma. No hay que tocar la navegación.

---

## 1. Tokens

Los mismos que `/solicitar` (ver `solicitar-rediseno.md`). Los que se usan aquí:

| Token | Valor |
|---|---|
| `brand` | `#6B1D30` |
| `brand-tint` | `#F3E8EA` |
| `bg` | `#F7F4F1` |
| `surface` | `#FFFFFF` |
| `surface-soft` | `#FBF9F7` |
| `surface-muted` | `#F3EEEA` |
| `border` | `#ECE6E1` / interno `#F0EBE7` |
| `border-input` | `#E3DCD6` |
| `text` / `text-muted` / `text-subtle` / `text-faint` | `#1C1917` / `#57504B` / `#6B635E` / `#8A817B` |
| `success` / `success-bg` / `success-border` | `#1F7A4D` / `#EEF7F1` / `#CFE7D8` |
| `warning-text` / `warning-bg` / `warning-border` | `#7A4E00` (íconos `#8A5A00`) / `#FEF6E7` / `#F6E2B8` |
| `error` | `#B42318` |
| `info-chip` (Comunitaria) | fondo `#E8EEF8`, texto `#2B4C7E` |

Tipografía **Geist** en todo; **Geist Mono** solo para las teclas `<kbd>`.

---

## 2. Layout general

```
[Sidebar existente] | Header "Administrador" (60px, blanco, border-bottom)
                    | main (padding 24px, gap 20px)
                    |   ├─ Encabezado de página (título + pestañas)
                    |   └─ Fila (flex-wrap, gap 20px)
                    |        ├─ Lista        flex: 1 1 340px; max-width: 400px
                    |        └─ Panel        flex: 999 1 520px; min-width: 0
```

En pantallas angostas la lista queda arriba y el panel abajo.

**Recomendado en la implementación real:**
- Panel con `position: sticky; top: 24px; max-height: calc(100vh - 48px)`, el cuerpo con `overflow-y: auto` y el header y footer fijos dentro de él.
- Lista con scroll propio si hay muchas solicitudes.
- Así el revisor nunca pierde de vista los botones.

---

## 3. Encabezado de página

- Eyebrow: **PORTAL PÚBLICO** (12px / 600, `letter-spacing: .12em`, `brand`).
- H1: **Solicitudes digitales** (30px / 600, `letter-spacing: -0.02em`).
- Subtítulo: "Aceptarlas crea la petición con folio. Descartarlas no." (14px, `text-subtle`).
- A la derecha, alineadas abajo: pestañas en un contenedor tipo pastilla (blanco, borde `border`, `padding: 4px`, `radius: 999px`):
  - **Por revisar (n)** | **Aceptadas (n)** | **Descartadas (n)**
  - Activa: fondo `brand`, texto blanco, contador con fondo `rgba(255,255,255,.2)`.
  - Inactiva: transparente, contador con fondo `surface-muted`.
  - `role="tablist"` / `role="tab"` / `aria-selected`.
- El badge del sidebar ("Digitales") muestra el mismo conteo de **Por revisar**.

---

## 4. Lista de solicitudes

### 4.1 Barra superior
- Buscador (40px, ícono de lupa): placeholder "Buscar nombre, colonia o texto". Busca en nombre, colonia, municipio y descripción.
- Botón de filtro **Municipio ▾** (40px, borde `border-input`).

### 4.2 Barra de selección múltiple (solo si hay seleccionadas)
- Reemplaza el texto suelto actual "Descartar selección como spam · 0 seleccionadas".
- Aparece **solo cuando `seleccionadas > 0`**.
- 44px, fondo `#1C1917`, texto blanco 13px.
- Izquierda: "**n seleccionada(s)**". Derecha: **Cancelar** (texto) y **Marcar como spam** (botón blanco).

### 4.3 Tarjeta de solicitud
`padding: 14px 16px; border-radius: 14px; background: #FFF; border: 1px solid border`, con 10px entre tarjetas.

- **Seleccionada (la que está abierta en el panel):** `border: 1px solid brand; box-shadow: 0 0 0 3px rgba(107,29,48,.1)`.
- Checkbox a la izquierda (16px, `accent-color: brand`), independiente de la selección del panel.
- El resto de la tarjeta es un `<button>` que abre la solicitud en el panel.

Contenido:
1. **Fila 1:** nombre (15px / 600, una línea con ellipsis) y, a la derecha, la antigüedad (12px).
   - Menos de 24 h: `text-faint` ("hace 2 h").
   - 24 h o más: `#8A5A00` en 600 ("ayer", "hace 2 días").
2. **Fila 2:** chip de tipo y "Municipio · Colonia" (12px, `text-subtle`).
   - Persona → chip `surface-muted` / `text-muted`: "Persona".
   - Comunitaria → chip azul (`info-chip`): "Comunitaria · ≈ 40 familias".
3. **Fila 3:** descripción en 2 líneas máximo (`-webkit-line-clamp: 2`), 13px, `text-muted`.
4. **Fila 4:** indicadores de 12px con ícono de 13px:
   - Con teléfono → "WhatsApp" en `success`.
   - Sin teléfono → ícono de mensaje tachado + "Sin teléfono" en `text-faint`.
   - Con foto → "Foto".
   - Con posibles duplicados → "Parecidas" en `#8A5A00`.

> **Privacidad:** el teléfono completo **ya no aparece en la lista**. Solo el indicador; en el panel, enmascarado.

### 4.4 Atajos (texto de ayuda bajo la lista)
`J` `K` moverte · `A` aceptar · `D` descartar (12px, `text-faint`, teclas en `<kbd>` con borde `border-input`).

| Tecla | Acción |
|---|---|
| `J` / `↓` | Siguiente solicitud |
| `K` / `↑` | Anterior |
| `A` | Aceptar y generar folio (solo si no falta nada) |
| `D` | Abrir "Descartar…" |
| `X` | Marcar/desmarcar checkbox de la actual |

No activar los atajos mientras el foco esté dentro de un input, select o textarea.

---

## 5. Panel de revisión

Tarjeta blanca, `radius: 20px`, borde `border`, sombra igual a la del formulario público, `overflow: hidden`, columna flex.

### 5.1 Header (fijo)
`padding: 18px 24px; border-bottom: 1px solid #F0EBE7`.
- Avatar de 40px con las iniciales (`brand-tint` / `brand`, 14px / 600).
- Nombre (18px / 600) y debajo "Persona · Recibida hoy, 10:42" o "Comunitaria · ≈ 40 familias · Recibida …" (13px, `text-subtle`).
- Derecha: botones ‹ › de 32px (borde `border-input`) con "1 de 4" entre ellos. Navegan igual que J/K.

### 5.2 Cuerpo, sección A: **LO QUE ENVIÓ** (solo lectura)
- Título de sección: "LO QUE ENVIÓ" (11px / 600, `letter-spacing: .1em`, `text-faint`) y a la derecha el botón de texto **✎ Editar datos** (`brand`, 13px / 600).
- Tarjeta `surface-soft`, borde `#F0EBE7`, `radius: 14px`, `padding: 16px`:
  - `<dl>` en 4 columnas, con dt de 11px en `text-faint` y dd de 14px / 500:
    - **MUNICIPIO** · **COLONIA** · **WHATSAPP** (`··· 6114` o "No dejó") · **TIPO** = "Persona" / **FAMILIAS** = "≈ 40" si es comunitaria.
    - Si es comunitaria, mostrar también **QUIEN LO REGISTRA** (agregar una fila o un tooltip en el nombre).
  - Descripción completa entre comillas (`<blockquote>`, 15px, `line-height: 1.6`). Sin textarea.
  - Si hay foto: botón con miniatura de 56×42 + "Ver foto adjunta" que abre un lightbox.
- **Aviso de parecidas** (si aplica), debajo de la tarjeta: recuadro `warning` con ícono de copiar, el texto "2 solicitudes parecidas en Técpan de Galeana esta semana" y el link **Ver** a la derecha.
  - Criterio sugerido: mismo municipio + misma subcategoría (o similitud de texto) en los últimos 7–30 días.
- **Editar datos:** abre los campos del ciudadano en modo edición (inline o en un modal). Guardar un registro en Auditoría de qué cambió y quién lo cambió.

### 5.3 Cuerpo, sección B: **CLASIFICACIÓN DEL EQUIPO** (editable)

**Ubicación sugerida** (recuadro de 12px de padding, `radius: 12px`):
- **Pendiente:** fondo blanco, borde `1px dashed #D9CFC9`, ícono de pin en un círculo `brand-tint` / `brand`.
  - Caption: "Sugerida a partir de municipio y colonia" (12px).
  - Valor: "Las Águilas, Técpan de Galeana" (14px / 600).
  - Botones: **Cambiar** (secundario) y **Confirmar** (negro `#1C1917`).
- **Confirmada:** fondo `success-bg`, borde `success-border`, ícono en círculo `success` / blanco.
  - Caption: "Ubicación confirmada · Localidad INEGI". Botón de texto **Cambiar**.
- Debajo, en 12px `text-faint`: "¿No es esa? Elige otra en **Localidad INEGI**, **Buscar en Google** o **Pin en el mapa**." Cada link abre el selector que ya existe hoy.
- Lógica de la sugerencia: buscar en el catálogo INEGI del municipio la localidad cuyo nombre sea más parecido a la colonia enviada (normalizar acentos y mayúsculas y quitar prefijos "Col.", "Colonia", "Barrio"). Si no hay coincidencia razonable, mostrar el municipio (cabecera) como sugerencia.

**Campos** (labels de 11px / 600 en MAYÚSCULAS; selects de 42px, `radius: 10px`):
- Fila de 2 columnas: **CATEGORÍA** | **SUBCATEGORÍA**
- Fila de 3 columnas: **COMPLEJIDAD \*** | **TIPO** (Petición / Denuncia) | **URGENCIA**
- Complejidad vacía: borde `#E8B4B0` y fondo `#FFFBFA` como señal de requerido.
- Opciones de complejidad en el diseño: Simple / Gestionable / Compromiso (**confirmar contra el catálogo real**).
- Recomendado: pre-llenar categoría y subcategoría con una sugerencia automática cuando exista; el revisor ajusta.

### 5.4 Footer: barra de acciones (fija)
`padding: 14px 24px; border-top: 1px solid #F0EBE7; background: surface-soft`, `flex-wrap`.

**Izquierda (13px):**
- Con teléfono → en `success`, con ícono de WhatsApp: "Se enviará el folio por WhatsApp a ··· 6114".
- Sin teléfono → en `text-faint`: "Sin teléfono: no se le podrá avisar del folio".
- Si falta algo, debajo y en `error`: "Falta: complejidad y confirmar ubicación" (lista dinámica).

**Derecha:**
- **Descartar…** (texto, `text-muted`) → abre un popover o modal pequeño con el motivo:
  - Fuera de zona · Sin información suficiente · Duplicada · Otro (texto libre).
  - Guardar el motivo con la solicitud descartada.
- **Spam** (botón secundario, borde `border-input`).
- **Aceptar y generar folio** (42px, `brand`, blanco, 600):
  - **Deshabilitado** mientras falte algo requerido. En ese estado: fondo `#E7DCD9`, texto `text-faint`, `cursor: not-allowed`.
  - Requeridos mínimos: complejidad + ubicación confirmada (agregar categoría/subcategoría si también son obligatorias).

**Después de cada acción:**
- La solicitud sale de "Por revisar" y el panel **avanza automáticamente a la siguiente**.
- Toast breve: "Folio F-0123 generado · Deshacer" (5 s) / "Descartada · Deshacer".

---

## 6. Estados vacíos

- **Por revisar vacío:** en el lugar de la lista y el panel, un mensaje centrado: "Todo al día. No hay solicitudes por revisar." con link a "Aceptadas".
- **Búsqueda sin resultados:** "No encontramos solicitudes con «texto». Prueba con otro nombre o colonia."

---

## 7. Datos que necesita la vista

Por solicitud:
`id, tipo ('persona'|'comunitaria'), nombre | nombreGrupo + nombreRegistra, familiasBeneficiadas?, municipio, colonia, telefono?, descripcion, fotoUrl?, createdAt, sugerenciaUbicacion?, posiblesDuplicados (count + ids)`

- El teléfono solo se usa enmascarado en la UI: `'··· ' + tel.slice(-4)`.
- Antigüedad relativa: "hace X h" (menos de 24 h), "ayer", "hace X días".

---

## 8. Accesibilidad

- Tarjetas de la lista como `<button>` reales; checkbox con `aria-label="Seleccionar solicitud de {nombre}"`.
- Botones ‹ › con `aria-label` "Anterior" / "Siguiente".
- Íconos decorativos con `aria-hidden="true"`.
- El botón de aceptar deshabilitado lleva `aria-describedby` apuntando al texto "Falta: …".
- Respetar el orden de foco: lista → header del panel → lo que envió → clasificación → acciones.

---

## 9. Pendientes / decisiones

- [ ] Confirmar opciones reales de **Complejidad** y qué campos son obligatorios para aceptar.
- [ ] Definir el criterio de **posibles duplicados**.
- [ ] Algoritmo de **sugerencia de localidad INEGI** a partir de la colonia.
- [ ] Modal de **motivo de descarte** (no está dibujado en el canvas).
- [ ] Lightbox de la foto.
- [ ] Registro en **Auditoría** al usar "Editar datos" y al aceptar/descartar.
- [ ] Los datos del canvas son de ejemplo (salvo la solicitud de prueba).

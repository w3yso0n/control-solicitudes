# Rediseño de `/solicitar` — Especificación de implementación

Archivo a modificar: `app/solicitar/page.tsx`
Referencia visual: canvas "Solicitar — Beatriz Mojica" (4 pantallas: De una persona, Comunitaria, Modal con teléfono, Modal sin teléfono).

**Objetivo:** que el formulario público tenga la misma vibra que el dashboard (guinda, Geist, tarjetas blancas, etiquetas en mayúsculas) **sin parecer dashboard**. Nada de sidebar ni KPIs.

**Feedback que resuelve:**
- "La tipografía se ve muy Claude" → se elimina la serif del título; todo en **Geist**.
- "Esa F de falta está rara" → era la serif; desaparece con el cambio de fuente.
- "El logo se ve parchado" → logo directo sobre la barra guinda, **sin caja de fondo y sin avatar pegado**.
- "Muy largo el formulario" → formulario compacto en una sola tarjeta, sin secciones numeradas.
- "Confirmación genérica" → modal con foto, palomita y mini seguimiento "¿Qué sigue?".

---

## 1. Tokens de diseño

### Colores

| Token | Valor | Uso |
|---|---|---|
| `brand` | `#6B1D30` | Header, botón primario, etiquetas destacadas, pasos numerados, selector activo |
| `brand-hover` | `#4E1422` | Hover de botón/links |
| `brand-tint` | `#F3E8EA` | Fondos suaves de íconos |
| `bg` | `#F7F4F1` | Fondo de la página |
| `surface` | `#FFFFFF` | Tarjeta del formulario, modal, inputs |
| `surface-muted` | `#F3EEEA` | Fondo del selector Persona/Comunitaria |
| `surface-soft` | `#FBF9F7` | Fondo del recuadro de foto |
| `border` | `#ECE6E1` | Borde de tarjetas, footer |
| `border-input` | `#E3DCD6` | Borde de inputs |
| `border-dashed` | `#D9CFC9` | Recuadro de foto (dashed), botón secundario |
| `divider` | `#E7E0DA` | Línea sobre los pasos del panel izquierdo |
| `text` | `#1C1917` | Texto principal |
| `text-2` | `#44403C` | Texto del checkbox |
| `text-muted` | `#57504B` | Párrafos y etiquetas de campo |
| `text-subtle` | `#6B635E` | Ayudas, descripción de pasos |
| `text-faint` | `#8A817B` | "· opcional", footer, estados deshabilitados |
| `success` | `#1F7A4D` | Palomita y paso completado del modal |
| `error` | `#B42318` (texto) / `#D92D20` (borde) | Validación de teléfono |
| `warning-text` | `#8A5A00` | Aviso de texto corto |

### Tipografía

- Fuente: **Geist** (pesos 400, 500, 600, 800) y **Geist Mono** 500 (opcional). En Next: `import { GeistSans } from 'geist/font/sans'` o `next/font/google` → `Geist`.
- **No usar ninguna serif.**

| Elemento | Tamaño / peso | Extra |
|---|---|---|
| H1 panel izquierdo | 44px / 600 | `line-height: 1.08`, `letter-spacing: -0.03em` |
| Etiqueta sobre título (eyebrow) | 12px / 600 | MAYÚSCULAS, `letter-spacing: 0.14em`, color `brand` |
| Párrafo intro | 16px / 400 | `line-height: 1.6`, `text-muted` |
| Título de paso | 15px / 600 | |
| Descripción de paso | 14px / 400 | `line-height: 1.5`, `text-subtle` |
| Label de campo | 11px / 600 | MAYÚSCULAS, `letter-spacing: 0.08em`, `text-muted` |
| Input / select / textarea | 15px / 400 | |
| Ayudas bajo campos | 13px | `text-subtle` |
| Tips de foto | 12px | `line-height: 1.45` |
| Botón primario | 15px / 600 | |
| H2 del modal | 24px / 600 | `letter-spacing: -0.02em` |

### Radios, alturas y sombras

- Tarjeta del formulario: `border-radius: 20px`, borde `border`, sombra `0 1px 2px rgba(28,25,23,.04), 0 8px 24px rgba(28,25,23,.04)`.
- Modal: `border-radius: 22px`, sombra `0 24px 64px rgba(28,25,23,.28)`.
- Inputs: altura **44px**, `border-radius: 10px`, `padding: 0 14px`.
- Botón primario: altura 48px, `border-radius: 12px`.
- Selector segmentado: contenedor `padding: 4px; border-radius: 12px`, botones de 40px de alto y `border-radius: 9px`.
- Focus de inputs: `border-color: brand` + `box-shadow: 0 0 0 3px rgba(107,29,48,.12)`.

---

## 2. Estructura de la página

```
<header>   barra guinda, 72px
<main>     max-width 1160px, padding 48px 24px 56px
  ├─ Panel izquierdo   (flex: 1 1 340px; max-width: 420px)
  └─ Formulario        (flex: 999 1 520px; min-width: 0)
     gap entre columnas: 48px, flex-wrap: wrap → en móvil se apilan
<footer>
<Modal de confirmación> (fixed, sobre todo)
```

### 2.1 Header

- Fondo `brand`, altura mínima 72px, contenido centrado a `max-width: 1160px`, `padding: 0 24px`, `flex-wrap: wrap`.
- **Izquierda:** logo blanco de Beatriz Mojica (**usar el SVG real**, ~34px de alto, **sin caja de fondo**). Luego un divisor vertical de 1×28px (`rgba(255,255,255,.22)`) y el texto "Canal ciudadano" (13px / 500, `rgba(255,255,255,.78)`).
- **Derecha:** link "Aviso de privacidad" (13px, mismo blanco translúcido) y pastilla "GUERRERO" (11px / 600, `letter-spacing: .14em`, `padding: 6px 12px`, `border-radius: 999px`, fondo `rgba(255,255,255,.1)`).
- Quitar el avatar circular que estaba junto al logo.

### 2.2 Panel izquierdo

1. Foto de Beatriz, círculo de 72px, `box-shadow: 0 0 0 3px #FFF, 0 0 0 4px #E7DCD9` (anillo blanco + línea fina). **Usar la foto original en buena resolución.**
2. Eyebrow: **BEATRIZ MOJICA**
3. H1: **Cuéntanos qué necesitas**
4. Párrafo:
   > Este es un espacio de Beatriz Mojica para escuchar a las personas y comunidades de Guerrero. Aquí puedes registrar tu solicitud para que nuestro equipo la conozca y le dé seguimiento. No es una oficina de gobierno ni un trámite oficial.
5. Pasos (lista `<ol>` **sin tarjeta**, separada por `border-top: 1px solid divider` y `padding-top: 22px`, gap 18px). Cada paso lleva un círculo `brand` de 28px con el número en blanco (13px / 600):
   - **Escribes**: Cuéntanos tu solicitud, personal o de tu comité, colonia o grupo.
   - **Revisamos**: Nuestro equipo lee cada caso antes de registrarlo.
   - **Te informamos**: Si dejas tu teléfono, te enviaremos tu folio por WhatsApp.

### 2.3 Formulario (una sola tarjeta, `padding: 28px`, `gap: 20px` entre bloques)

Sin encabezado de tarjeta ni secciones numeradas. Orden de los bloques:

**a) Tipo de solicitud**
- Label: `¿DE QUIÉN ES LA SOLICITUD?`
- Selector segmentado de 2 columnas: **De una persona** | **Comunitaria**.
  - Activo: fondo `brand`, texto blanco, `box-shadow: 0 1px 2px rgba(28,25,23,.15)`.
  - Inactivo: transparente, texto `text-muted`.
  - Usar `<button type="button">` dentro de un `role="group"` (o radio group accesible).

**b) Quién (cambia según el tipo)**

*De una persona:*
| Label | Placeholder |
|---|---|
| TU NOMBRE | Nombre y apellido |

*Comunitaria* (reemplaza "Tu nombre" por estos tres):
| Label | Placeholder | Layout |
|---|---|---|
| NOMBRE DEL COMITÉ, COLONIA O GRUPO | Ej. Comité de vecinos de la Col. Centro | Ancho completo |
| QUIEN LO REGISTRA | Nombre y apellido | Media columna |
| FAMILIAS BENEFICIADAS | Número aproximado | Media columna, `type="number" min="1"` |

> Las etiquetas de la versión comunitaria se acortaron para que quepan en media columna. Textos completos del brief: "Nombre de quien lo registra" y "¿Cuántas familias se benefician? (número aproximado)". Si prefieren los largos, poner esos dos campos a ancho completo.

Grid: `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px`.

**c) Ubicación y contacto (igual en ambos tipos)** en una fila de 3 columnas: `repeat(auto-fit, minmax(160px, 1fr))`, gap 14px.

| Label | Control | Placeholder |
|---|---|---|
| MUNICIPIO | `<select>` | Elegir (catálogo de los 85 municipios de Guerrero) |
| COLONIA O LOCALIDAD | `<input type="text">` **(campo nuevo)** | Ej. Col. Emiliano Zapata |
| TELÉFONO · OPCIONAL | `<input type="tel" inputmode="numeric" maxlength="10">` | WhatsApp (10 dígitos) |

> Texto completo del brief para el label de colonia: "Colonia, barrio o localidad". En el diseño se acortó a "Colonia o localidad" por espacio.

Debajo de la fila, una sola línea (13px), con un ícono de WhatsApp/mensaje de 14px:
- Normal: **Solo lo usaremos para informarte sobre tu solicitud.** (`text-subtle`)
- Error: **El teléfono debe tener 10 dígitos.** (`error`, con ícono de alerta). El input pasa a borde `#D92D20` + `box-shadow: 0 0 0 3px rgba(217,45,32,.1)`.

**d) ¿Qué solicitas?**
- Label: `¿QUÉ SOLICITAS?`
- `<textarea rows="4">`, `min-height: 104px`, `resize: vertical`.
- Placeholder:
  > ¿Qué pasa, dónde es y desde cuándo? Por ejemplo: "En la calle Morelos no hay alumbrado desde hace tres meses y ya hubo asaltos".
- Aviso de texto corto (ver la sección 3), una línea de 13px en `warning-text` con ícono de foco:
  > Entre más detalles nos compartas, mejor podremos atender tu solicitud.

**e) Foto (opcional)**
Recuadro con `padding: 14px`, `border: 1px dashed border-dashed`, `border-radius: 12px`, fondo `surface-soft`.
- Fila 1: botón **Adjuntar una foto** (40px de alto, blanco, borde `border-dashed`, texto `brand` 14px / 600, ícono de imagen) + texto: "Opcional. Una foto nos ayuda a conocer mejor tu solicitud."
  - El botón es un `<label for="foto">` con un `<input type="file" accept="image/*">` visualmente oculto.
- Fila 2: tips en grid de 3 columnas (`repeat(auto-fit, minmax(150px, 1fr))`, gap 10px). Ícono de línea de 15px en `brand` (**no emojis**), la primera parte en negritas:
  - Ícono cámara: **Con buena luz:** de preferencia de día.
  - Ícono lupa: **Que se vea el problema:** de cerca y sin objetos que estorben.
  - Ícono documento: **Si es un escrito:** completo, derecho y que se lean las firmas.

**f) Envío (consentimiento y botón en la misma fila; `flex-wrap`)**
- Checkbox (18px, `accent-color: brand`) + texto 13px:
  > Leí el [aviso de privacidad] y acepto que usen estos datos para registrar la solicitud y, si dejé teléfono, contactarme.
- Botón primario **Enviar solicitud →** (`flex: 0 1 220px`, 48px). En móvil baja a una fila completa.

### 2.4 Footer

`border-top: 1px solid border`, contenido a 1160px, 13px `text-faint`: "Beatriz Mojica · Guerrero" a la izquierda y el link "Aviso de privacidad" a la derecha.

---

## 3. Comportamiento y validaciones

### Teléfono
- Opcional.
- Al escribir, quitar todo lo que no sea dígito y limitar a 10: `value.replace(/\D/g, '').slice(0, 10)`.
- Es válido si está **vacío** o tiene **exactamente 10 dígitos**.
- Si tiene entre 1 y 9 dígitos y el usuario da **Enviar**, no enviar: mostrar el error y el borde rojo. El error se quita en cuanto el usuario vuelve a escribir en el campo.

### Aviso de texto corto (no bloquea)
- Contar palabras: `text.trim().split(/\s+/).filter(Boolean).length`.
- Mostrar el aviso cuando `palabras > 0 && palabras < 20`.
- **Nunca bloquea el envío.**

### Tipo de solicitud
- Al cambiar a **Comunitaria**, los campos de "Quién" cambian a los tres comunitarios. Teléfono, municipio, colonia, texto y foto se conservan.
- Payload sugerido: agregar `colonia` (ambos tipos) y, para comunitaria, `nombreGrupo`, `nombreRegistra` y `familiasBeneficiadas` (número).

### Envío
- Al enviar con éxito → abrir el **modal de confirmación** (no reemplazar la tarjeta del formulario).
- **Entendido** o la **X** → cierra el modal.
- **Enviar otra solicitud** → cierra el modal y limpia el formulario (vuelve a "De una persona").
- Recomendado: cerrar también con `Esc` y con clic en el fondo, y bloquear el scroll del body mientras el modal está abierto.

---

## 4. Modal de confirmación

**Overlay:** `position: fixed; inset: 0; z-index: 50`, fondo `rgba(28,25,23,.5)`, `backdrop-filter: blur(3px)`, contenido centrado con `padding: 24px`.

**Diálogo:** `role="dialog" aria-modal="true" aria-labelledby="conf-title"`, `max-width: 460px`, blanco, `border-radius: 22px`, `overflow: hidden`.

1. **Franja superior**: 112px de alto, fondo `brand`.
   - Arriba al centro: "BEATRIZ MOJICA" (11px / 600, `letter-spacing: .16em`, `rgba(255,255,255,.75)`).
   - Arriba a la derecha: botón cerrar X (36px, circular, fondo `rgba(255,255,255,.12)`, `aria-label="Cerrar"`).
   - Foto de Beatriz de 80px, centrada y montada sobre el borde inferior (`bottom: -40px`), con anillo blanco de 4px.
   - Encima de la foto, abajo a la derecha: badge verde de 30px (`success`) con palomita blanca y anillo blanco de 3px.
2. **Cuerpo** (`padding: 56px 28px 28px`, gap 20px, texto centrado):
   - H2 `#conf-title`: **Tu solicitud fue recibida**
   - Texto según el caso (ver los textos abajo).
3. **"¿Qué sigue?"**: línea de tiempo vertical sobre un fondo `bg` (`#F7F4F1`), `border-radius: 14px`, `padding: 16px 18px`. Conector de 2px en `#D9CFC9` entre los círculos de 22px:
   - Círculo verde con palomita → **Recibida**: Ya llegó a nuestro equipo.
   - Círculo con anillo `brand` y punto `brand` (actual) → **En revisión**: Leemos tu caso antes de registrarlo.
   - Círculo vacío (borde `#CFC5BF`):
     - Con teléfono → **Folio por WhatsApp**: Te lo enviamos al registrarla.
     - Sin teléfono → **Folio por WhatsApp**: No disponible: no dejaste teléfono. *(título y texto en `text-faint`)*
4. **Botones** (en columna, gap 8px):
   - Primario: **Entendido** (48px, `brand`).
   - Secundario: **Enviar otra solicitud** (44px, transparente, texto `brand` 600).

### Textos del modal

**Título (siempre):**
> Tu solicitud fue recibida

**Con teléfono** (`telefono.length === 10`):
> Gracias por hacernos llegar tu solicitud. Nuestro equipo la revisará y, una vez registrada, te enviaremos por WhatsApp tu número de folio para darle seguimiento.

**Sin teléfono** (campo vacío):
> Gracias por hacernos llegar tu solicitud. Nuestro equipo la revisará. Como no registraste un número de contacto, no podremos informarte sobre su avance.

**Texto general (respaldo, solo si el sistema no puede distinguir si hay teléfono):**
> Gracias por hacernos llegar tu solicitud. Nuestro equipo la revisará y, una vez registrada, se le asignará un número de folio para su seguimiento. Si nos dejaste un número de teléfono, te informaremos por WhatsApp.

> Con el texto general, el tercer paso de la línea de tiempo usa: **Folio por WhatsApp**: Si dejaste teléfono, te lo enviamos al registrarla.

---

## 5. Responsive

- Las dos columnas usan `flex-wrap: wrap`. Debajo de unos 920px el panel izquierdo queda arriba y el formulario abajo, ambos a ancho completo.
- Las grids de campos usan `auto-fit` y se colapsan solas a una columna en móvil.
- El header hace `wrap`: la pastilla GUERRERO y el link bajan si no caben.
- El modal tiene `width: 100%` con `max-width: 460px` y `padding: 24px` de margen; en teléfonos ocupa casi todo el ancho.
- Recomendado en móvil: H1 a ~34px y `padding` de la tarjeta a 20px.

## 6. Accesibilidad

- Cada input con su `<label for>`.
- El selector de tipo es un grupo con botones reales (o radios), con estado `aria-pressed` / `checked`.
- Íconos decorativos con `aria-hidden="true"`; botón X con `aria-label="Cerrar"`.
- Modal: foco inicial en "Entendido", foco atrapado dentro del modal, `Esc` cierra y al cerrar regresa el foco al botón de enviar.
- Contraste: todos los grises de texto usados (`#57504B`, `#6B635E`, `#8A817B` en 13px+) pasan sobre blanco y sobre `#F7F4F1`.

## 7. Pendientes / notas

- [ ] Cambiar el texto del logo por el **SVG blanco real** (sin fondo).
- [ ] Usar la **foto original** de Beatriz (la del diseño está recortada de una captura).
- [ ] Conectar el `<select>` de municipio al catálogo real (85 municipios).
- [ ] Agregar `colonia`, `nombreGrupo`, `nombreRegistra` y `familiasBeneficiadas` al modelo/endpoint.
- [ ] La "N" negra de la esquina es el indicador de desarrollo de Next; no sale en producción.

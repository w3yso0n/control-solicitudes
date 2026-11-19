# Roles y permisos - Sistema de Peticiones Ciudadanas (Guerrero)

Guía para la capacitación de equipos. Explica quién hace qué dentro de la plataforma y cómo se conectan los roles entre sí.

---

## 1. La idea en una frase

Una petición ciudadana entra (en papel o por internet), **se captura**, **se gestiona hasta cumplirse** y **se mide**. Cada rol se encarga de una parte de ese camino.

```
 Ciudadano ──(portal web)──────────────┐
                                       v
 Territorio ──(sube escaneados)──> Capturista ──(genera folio)──> Operador ──(cumple y sube evidencia)──> Candidata
                                                                                                        (ve resultados)
                         Administrador: ve y controla todo
```

---

## 2. Resumen de roles

| Rol | En una línea | Pantalla al entrar |
|---|---|---|
| Capturista Territorio | Sube las fotos/escaneos de las peticiones recibidas en eventos | Captura de lotes |
| Capturista | Transcribe cada documento, le da folio y revisa las solicitudes digitales | Bandeja |
| Operador de cumplimiento | Atiende las peticiones hasta cumplirlas y sube la evidencia | Cumplimientos |
| Candidata | Ve resultados, mapa y reportes (solo lectura) | Dashboard |
| Administrador | Todo lo anterior, más usuarios, configuración y auditoría | Dashboard |

Además existe el **ciudadano**, que no tiene cuenta: entra al portal público `/solicitar` y deja su petición.

---

## 3. Matriz de acceso por módulo

| Módulo (menú) | Territorio | Capturista | Operador | Candidata | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | - | - | Ver | Ver | Ver |
| Reportes | - | - | - | Ver / imprimir | Ver / imprimir |
| Captura de lotes | Sus lotes | - | - | - | Todos los lotes |
| Bandeja | - | Capturar | - | - | Capturar |
| Digitales | - | Aceptar / descartar | - | - | Aceptar / descartar |
| Cumplimientos | - | - | Operar | Solo lectura | Operar |
| Consulta (peticiones) | - | Ver y editar captura | Ver | Ver | Ver y editar captura |
| Usuarios | - | - | - | - | Sí |
| Configuración | - | - | - | - | Sí |
| Auditoría | - | - | - | - | Sí |

"-" significa que el módulo no aparece en su menú y, si intenta entrar por URL, el sistema lo regresa a su pantalla de inicio.

---

## 4. Qué puede hacer cada rol

### 4.1 Capturista Territorio

Es el equipo que está en campo, en los eventos y giras.

- **Subir un lote de escaneados**: al cierre del evento sube las fotos o PDF de las actas/oficios recibidos.
  - Datos del lote: fecha de entrega, evento o gira de origen, municipio del evento y notas opcionales.
  - Al subirlo, el lote queda **cerrado** y pasa directo a la Bandeja del equipo de captura.
- **Ver su historial de lotes** y el detalle de cada uno (archivos, estado).
- **Eliminar sus propios lotes** (no los de otros).
- Puede trabajar también desde la **app móvil** (mismo usuario y contraseña).
- **No ve** peticiones, folios, dashboard ni datos de ciudadanos.

> Mensaje para la capacitación: "Tu trabajo es que ningún papel se quede sin subir. Lo que no se sube, no existe."

### 4.2 Capturista

Es el equipo que convierte los papeles en peticiones con folio.

- **Bandeja de captura**: ve los lotes cerrados, del más antiguo al más nuevo.
  - Vista previa rápida de cada archivo sin abrir el lote.
  - Indicador por documento: punto magenta = pendiente, verde = ya capturado.
- **Capturar cada documento**: datos del ciudadano, domicilio, teléfono, descripción, categoría y subcategoría, complejidad (simple, media, estructural), tipo y urgencia, y ubicación en el mapa.
  - Al guardar se genera el **folio** de la petición.
  - El sistema avisa si encuentra **posibles duplicados** (misma persona, domicilio o teléfono).
- **Solicitudes digitales**: revisa lo que llega por el portal público.
  - **Aceptar** crea la petición con folio.
  - **Descartar** la elimina de la cola sin crear petición.
  - Tiene un contador de pendientes en el menú.
- **Consulta**: busca peticiones por folio, nombre o texto, y puede abrir "Editar captura" o "Ver lote" para corregir.
- Puede **eliminar lotes** desde la bandeja (por ejemplo, un lote subido por error).

> Mensaje para la capacitación: "La calidad de todo el sistema depende de que la categoría, la complejidad y la ubicación estén bien capturadas."

### 4.3 Operador de cumplimiento

Es el equipo que resuelve las peticiones.

- **Cumplimientos**, con cuatro vistas: Sin cumplir, Cumplidas, No procede y Panel de balance.
- **Flujo de estatus** de una petición:
  ```
  Recibida ──> En gestión ──> Cumplida
      └────────────┴──────> No procede
  ```
  - Para marcarla **cumplida**, primero tiene que estar **en gestión**.
  - **No procede** se puede marcar desde recibida o en gestión.
- **Adjuntar evidencia** (fotos/video) del cumplimiento, y eliminarla si se subió mal.
- **Asignar peticiones** a un operador (selección múltiple en "Sin cumplir").
- **Dashboard** y **Consulta** en modo lectura.
- Importante: solo entran al flujo de cumplimiento las peticiones **simples** y **medias**. Las **estructurales** se consideran compromiso de gobierno y no se operan aquí.

> Mensaje para la capacitación: "Sin evidencia no hay cumplimiento. La foto es la prueba ante la candidata."

### 4.4 Candidata

Es el perfil de visualización para Beatriz Mojica y su equipo cercano.

- **Dashboard**: vista "Escucha" (lo que pide la gente) y "Cumplidas" (lo que ya se resolvió), con mapa de Guerrero y municipios foco.
- **Reportes**: por periodo (7 días, 30 días, acumulado o rango personalizado), volumen por zona contra el periodo anterior, distribución temática, intermediarios. Botón **Imprimir / PDF**.
- **Cumplimientos** en **solo lectura** (ve el avance y la evidencia, pero no cambia estatus).
- **Consulta** de peticiones en lectura.
- No captura, no edita, no administra.

### 4.5 Administrador

Tiene acceso a todo lo anterior, más:

- **Usuarios**: alta, consulta, cambio de rol e **inactivación** de usuarios.
  - Inactivar no borra nada: el usuario ya no puede entrar (web ni app móvil), pero sus lotes, capturas, cumplimientos y registros de auditoría se conservan.
  - Los inactivos se ven en la pestaña **Inactivos** y se pueden **reactivar** en cualquier momento.
  - No se puede inactivar a uno mismo ni al último administrador activo.
- **Configuración**:
  - Eventos / giras (los que aparecen al subir un lote).
  - Catálogo (subcategorías extra).
  - Geografía (municipios foco y cartografía electoral).
  - Textos de acuse (mensaje al peticionario y al remitente).
- **Auditoría**: bitácora de capturas, reclasificaciones, cambios de estatus, usuarios y configuración.
- Ve los lotes de **todos** los capturistas de territorio.

### 4.6 Ciudadano (sin cuenta)

- Entra a `/solicitar`, llena su petición y acepta el aviso de privacidad.
- Su solicitud llega a **Digitales**, donde un Capturista la acepta o la descarta.

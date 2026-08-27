# App móvil (Expo) — captura de lotes en campo

Contexto completo de la app de React Native/Expo para que Beatriz Mojica (o
su equipo de territorio) pueda capturar lotes de escaneados desde el celular
y sincronizarlos con el backend web, incluso sin conexión. Este documento
existe para poder retomar el tema en una conversación nueva sin perder
contexto — está pensado para pegarse completo al inicio de una sesión con
Claude.

## Por qué existe esto

El proyecto web `control-solicitudes` ya tenía un flujo de "Captura de
lotes" en `app/(app)/territorio/page.tsx` (subir escaneados, cerrar lote).
Se pidió una versión móvil equivalente para que el personal en campo pueda
capturar lotes directamente desde el celular (foto con cámara o galería) sin
depender de una laptop, con la particularidad de que en campo puede no haber
señal — así que la app debe guardar localmente primero y sincronizar después
cuando haya conexión ("offline-first").

## Ubicación de los proyectos

```
cuantivaProjects/
├── control-solicitudes/              (proyecto backend + web, Next.js)
└── beatriz-mojica-solicitudes/
    └── control-solicitudes-mobile/   (proyecto Expo, este documento)
```

Son dos repositorios/proyectos independientes (cada uno con su propio git).
El plan original del usuario es mover `control-solicitudes` dentro de
`beatriz-mojica-solicitudes/` más adelante para que ambos convivan en el
mismo directorio padre, pero **eso todavía no se ha hecho** — a la fecha de
este documento siguen en ubicaciones separadas tal como se ve arriba.

---

## 1. Backend: qué se agregó para soportar la app móvil

El backend (`control-solicitudes`, Next.js 16 + Drizzle + Postgres) ya tenía
todo el CRUD de lotes funcionando para la web (ver
`docs/BACKEND_API_GUIA.md` para el detalle de esa arquitectura). Para la app
móvil **no se tocó nada del CRUD existente** — solo se agregó una vía de
autenticación alterna, porque NextAuth v5 (Auth.js) usa cookies de sesión
que no existen en un cliente nativo React Native.

### Archivos nuevos/modificados en el backend

- **`lib/mobile-auth.ts`** (nuevo): firma y verifica un JWT propio usando la
  librería `jose`, con el mismo secreto `AUTH_SECRET` que ya usa NextAuth.
  Expira a los 30 días (`EXPIRATION = "30d"`).
- **`app/api/auth/mobile-login/route.ts`** (nuevo): endpoint `POST` que
  recibe `{ email, password }` en JSON, valida contra la tabla `users` con
  `bcryptjs` (mismo mecanismo que el provider `Credentials` de NextAuth), y
  si es válido responde `{ token, user }`.
- **`lib/auth.ts`** (modificado): la función `getCurrentUser()` ahora
  intenta primero la sesión de cookie (NextAuth, para la web) y si no la
  encuentra, revisa el header `Authorization: Bearer <token>` y lo valida
  con `verifyMobileToken()`. Esto significa que **todos los endpoints
  existentes** (`/api/lotes`, `/api/lotes/[id]`, etc.) ya funcionan para la
  app móvil sin ningún cambio adicional — heredan la autenticación
  automáticamente porque todos llaman a `getCurrentUserId()` /
  `getCurrentUser()`.

### Dependencia nueva

- `jose` (para firmar/verificar JWT) — agregada a `package.json` del
  backend.

### Cómo se prueba el login móvil manualmente

```bash
curl -X POST http://localhost:3000/api/auth/mobile-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"12345678"}'
```

El usuario demo (`admin@demo.com` / `12345678`, rol `admin`) se crea
corriendo `pnpm db:seed` en el backend (`scripts/seed-admin.ts`).

---

## 2. App móvil: stack y decisiones de arquitectura

### Stack elegido

- **Expo SDK 57** con Expo Router (navegación basada en archivos, carpeta
  `src/app/`).
- **TypeScript**.
- **Nativewind v4** (Tailwind CSS para React Native) — para poder reusar
  exactamente los mismos tokens de diseño que el proyecto web (ver sección
  de diseño más abajo) en vez de reinventar estilos con `StyleSheet`.
- **expo-sqlite** — base de datos local, es la "cola" de lotes pendientes de
  sincronizar.
- **expo-secure-store** — guarda el JWT cifrado en el keychain/keystore del
  dispositivo.
- **expo-image-picker** — cámara y galería para adjuntar fotos.
- **expo-file-system** — copia las fotos capturadas a almacenamiento
  persistente (ver "Problema 3" más abajo).
- **expo-network** — detecta si hay conexión antes de intentar sincronizar.
- **expo-dev-client** — necesario para poder correr módulos nativos
  custom (ver "Problema 1").
- **lucide-react-native** + **react-native-svg** — mismos íconos que usa el
  web (`lucide-react`).

### Qué se quitó del scaffold por defecto

`create-expo-app` trae una demo con tabs, un ícono animado, gestos, un
"glass effect" de ejemplo. Se borró todo eso (`explore.tsx`,
`animated-icon.*`, `app-tabs.*`, `hint-row.tsx`, `web-badge.tsx`,
`collapsible.tsx`) y también se desinstalaron sus dependencias nativas
pesadas que no usa nuestro código: `react-native-reanimated`,
`react-native-worklets`, `@expo/ui`, `expo-glass-effect`. Se mantuvieron
`react-native-gesture-handler` y `react-native-screens` porque **sí** son
dependencias reales de `expo-router` (navegación con gestos).

También se borraron `ThemedText`, `ThemedView`, `use-theme.ts`,
`use-color-scheme*.ts` y `constants/theme.ts` del scaffold, porque el
sistema de diseño ahora vive completo en `tailwind.config.js`
(Nativewind).

### Estructura final de `src/`

```
src/
├── app/
│   ├── _layout.tsx       — layout raíz: inicializa SQLite, envuelve todo en AuthProvider, importa el CSS de Nativewind
│   ├── index.tsx         — pantalla "gate": redirige a /login o /captura según haya sesión
│   ├── login.tsx         — pantalla de login
│   └── captura.tsx       — pantalla principal: formulario de captura + lista de pendientes/sincronización
├── components/
│   ├── archivos-picker.tsx   — UI de "Tomar foto" / "Galería" + previews
│   └── municipio-picker.tsx  — modal fullscreen con buscador de municipios
├── constants/
│   └── municipios-guerrero.ts — catálogo de municipios copiado del backend (lib/geografia-guerrero.ts), para que el picker funcione offline
├── lib/
│   ├── config.ts          — lee EXPO_PUBLIC_API_BASE_URL
│   ├── auth-storage.ts    — guarda/lee/borra el JWT y el usuario en SecureStore
│   ├── auth-context.tsx   — React Context de sesión (user, login, logout) para toda la app
│   ├── api.ts             — login() y createLoteRemote() (llamadas HTTP al backend)
│   ├── local-db.ts        — tabla SQLite `lotes_pendientes`, la cola offline
│   ├── archivos-storage.ts — copia fotos a almacenamiento persistente y las borra al terminar
│   └── sync.ts             — revisa conexión y sincroniza los pendientes contra el backend
└── nativewind.css         — directivas @tailwind (entrada de Nativewind)
```

### Diseño visual

Se replicó la identidad de marca "Beatriz Mojica" del proyecto web
(`app/globals.css`, `components/AppShell.tsx`, `app/login/page.tsx`):

- Colores de marca (definidos en `tailwind.config.js` de la app móvil):
  `guinda` `#7a1233`, `magenta` `#c8215f`, `tinta` `#1c0a12`, `hueso`
  `#fbf7f4`, `ambar` `#f0a857`, `brasa` `#ff6b4a`.
- Login: tarjeta guinda (`#830333`) con foto de perfil y logo wordmark
  blanco, igual que `app/login/page.tsx` del web. Los assets
  (`logo-wordmark-white.png`, `foto-perfil.png`) se copiaron a
  `assets/brand/` de la app móvil.
- Captura: eyebrow "CAPTURA TERRITORIO" en guinda + título grande, tarjetas
  blancas `rounded-[1.75rem]` con sombra suave, inputs con label uppercase
  tracking-wide — mismo lenguaje que `components/ui.tsx` del web (`Field`,
  `Input`, `Card`, `Button`).

---

## 3. Flujo de datos: cómo funciona la captura offline-first

1. **Login**: el usuario mete email/password → `POST /api/auth/mobile-login`
   → se guarda `{ token, user }` en SecureStore (`auth-storage.ts`).
2. **Captura**: el usuario llena el formulario (fecha, evento, municipio,
   notas) y toma/elige fotos con `expo-image-picker`. Las fotos capturadas
   quedan primero en la caché temporal del sistema
   (`cache/ImagePicker/...`).
3. **Guardar lote** (`encolarLote` en `local-db.ts`):
   - Primero se copian las fotos de la caché temporal a un directorio
     persistente propio de la app (`Paths.document/lotes-pendientes/<id>/`,
     vía `archivos-storage.ts`) — así sobreviven aunque el sistema limpie la
     caché mientras el lote sigue pendiente de sincronizar.
   - Se inserta un registro en la tabla SQLite `lotes_pendientes`
     (columnas: id, fechaEntrega, eventoOrigen, cveMun, notas, archivos
     (JSON), estatus, errorMsg, creadoEn).
   - El formulario se limpia y se intenta sincronizar de inmediato.
4. **Sincronizar** (`sincronizarPendientes` en `sync.ts`):
   - Revisa si hay conexión (`expo-network`). Si no hay, no hace nada (el
     lote se queda pendiente).
   - Si hay conexión, recorre cada lote pendiente y llama a
     `createLoteRemote()` (`api.ts`), que arma un `FormData` multipart con
     los campos + archivos y hace `POST /api/lotes` con
     `Authorization: Bearer <token>`.
   - Si tiene éxito: borra el registro de SQLite **y** borra la copia
     persistida de las fotos (`eliminarArchivosPersistidos`).
   - Si falla: marca el lote como `estatus: 'error'` con el mensaje, y
     queda visible en la lista de pendientes para reintentar manualmente
     (botón "Sincronizar" en la pantalla de captura, o long-press sobre un
     pendiente para descartarlo).

---

## 4. Problemas reales que se presentaron y su solución

### Problema 1 — La app se quedaba pegada en el splash de Expo Go

**Síntoma**: al correr `npx expo start` y abrir con Expo Go, la app se
quedaba congelada en la pantalla de loading (puntos verdes animados) sin
avanzar nunca a las pantallas reales.

**Causa**: **Expo Go** es una app genérica precompilada por Expo que solo
trae un set fijo de módulos nativos. Nuestro proyecto usa `expo-sqlite` y
una configuración custom de Metro/Babel para Nativewind
(`metro.config.js`, `babel.config.js`) que Expo Go no puede cargar. El
bundle JS crasheaba al arrancar sin mostrar el error visualmente.

**Solución**: instalar `expo-dev-client` y compilar un **development
build** propio con `npx expo run:android` — una app nativa propia
instalada en el emulador (en vez de la app genérica Expo Go), que sí
incluye todos nuestros módulos nativos. A partir de ahí, `npx expo start` +
tecla `a` abre esa app propia en vez de Expo Go.

### Problema 2 — El primer build nativo tardaba demasiado

**Síntoma**: `npx expo run:android` llevaba compilando con Gradle más de 30
minutos sin terminar y sin imprimir progreso.

**Causas combinadas**:
1. Gradle 9 requiere **JVM 17+**, pero el `java` del sistema
   (`/usr/bin/java` → detectado con `/usr/libexec/java_home -V`) era JDK
   11 (Amazon Corretto). Esto hacía fallar el **primer** intento
   directamente (`Gradle requires JVM 17 or later`).
2. El scaffold default traía `react-native-reanimated` y
   `react-native-worklets` (compilación de C++ nativo pesada vía NDK), que
   **no se usaban en ningún componente propio** — puro peso muerto
   heredado de la demo default de Expo.

**Solución**:
1. Usar el JBR (JetBrains Runtime, JDK 21) que trae embebido Android
   Studio en vez del JDK del sistema:
   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   ```
2. Desinstalar `react-native-reanimated`, `react-native-worklets`,
   `@expo/ui`, `expo-glass-effect` (confirmando antes con `grep -rl` que no
   se usaban en `src/`). Se reinstalaron explícitamente
   `react-native-gesture-handler` y `react-native-screens` porque esas sí
   son dependencias reales de `expo-router`.
3. Borrar `android/`, `ios/`, `.expo/` para forzar un prebuild limpio sin
   restos de las dependencias eliminadas.

Con esto el build bajó a ~5 minutos (`BUILD SUCCESSFUL in 5m 4s`).

### Problema 3 — La sincronización fallaba con "Unsupported FormDataPart implementation"

**Síntoma**: al presionar "Sincronizar", la app mostraba "0 sincronizados, 1
con error" y en el backend nunca aparecía la petición `POST /api/lotes` en
los logs (solo se veían `GET /api/lotes` y `POST /api/auth/mobile-login`,
que sí usan JSON simple sin archivos).

**Diagnóstico**: se agregó temporalmente el mensaje de error al `Alert` de
la UI (en vez de perseguir logs de logcat), lo que reveló el texto exacto:
`Unsupported FormDataPart implementation`. Rastreando ese string en
`node_modules` se encontró en
`node_modules/expo/src/winter/fetch/convertFormData.ts` — el polyfill de
`fetch` que trae Expo SDK 53+ (su runtime interno llamado "Winter").

Ese polyfill convierte las partes de un `FormData` esperando que cada parte
tenga `part.string`, `part.file` o `part.blob`. Pero el `FormData` nativo
de React Native (`node_modules/react-native/Libraries/Network/FormData.js`)
construye sus partes con la forma `{uri, headers, name, type, fieldName}` —
usa la clave `uri`, nunca `file` ni `blob`. Como ninguna de las tres
condiciones del polyfill de Expo se cumplía, la entrada quedaba
`undefined` y cae al `throw new Error('Unsupported FormDataPart
implementation')`.

**Conclusión**: es una incompatibilidad real entre el `fetch` global que
inyecta Expo SDK 57 y el formato clásico `{uri, name, type}` de RN para
adjuntar archivos vía `FormData.append()`. No fue un error de escritura,
sino un choque entre dos capas del propio SDK.

**Solución**: en `src/lib/api.ts`, la función `createLoteRemote()` ya **no
usa `fetch`** para el `POST /api/lotes` — usa `XMLHttpRequest` directo
(que sí es compatible con el formato `{uri, name, type}` de RN, es el
mecanismo original antes de que existiera el polyfill de fetch de Expo),
envuelto en una `Promise` para mantener la misma interfaz `async/await` que
el resto del código. El `login()` (JSON simple, sin archivos) se quedó con
`fetch` normal, porque ahí nunca hubo problema.

### Problema 4 — Las fotos podían perderse si el sistema limpiaba la caché antes de sincronizar

**Riesgo identificado** (no un bug reportado, sino una debilidad detectada
al revisar el flujo): `expo-image-picker` deja las fotos en
`cache/ImagePicker/...`, una carpeta de caché que Android puede borrar
automáticamente bajo presión de espacio. Si un lote quedaba pendiente de
sincronizar por horas/días (caso de uso real: captura en campo sin señal),
existía el riesgo de que el archivo referenciado por `uri` ya no existiera
al momento de sincronizar.

**Solución**: se creó `src/lib/archivos-storage.ts` usando la API nueva de
`expo-file-system` v57 (`File`, `Directory`, `Paths` — no la API legacy
basada en funciones sueltas). Al guardar un lote (`encolarLote`), cada foto
se copia de `cache/ImagePicker/` a `Paths.document/lotes-pendientes/<loteId>/`
(un directorio que el sistema no limpia automáticamente), y el `uri`
guardado en SQLite apunta a esa copia persistente, no a la original. Al
sincronizar con éxito o al descartar el lote manualmente, se borra esa
carpeta completa (`eliminarArchivosPersistidos`).

---

## 5. Conceptos clave (para quien no conoce Expo/React Native)

- **React**: librería de UI basada en componentes y estado
  (`useState`, JSX). No sabe nada de cómo se renderiza a pantalla.
- **React Native**: usa los mismos conceptos de React pero traduce los
  componentes a vistas nativas de iOS/Android en vez de HTML.
- **Expo**: conjunto de herramientas sobre React Native — CLI, módulos
  nativos ya empaquetados (cámara, SQLite, secure storage, etc.), Expo
  Router (navegación basada en archivos), y el mecanismo de development
  builds.
- **Metro**: el bundler — toma todos los `.tsx`/`.ts` y sus imports, los
  transforma (TS→JS, JSX→JS, aplica Nativewind) y sirve el bundle de JS en
  vivo (`localhost:8081` por defecto) mientras desarrollas. Habilita Fast
  Refresh (guardar un archivo actualiza la app sin reiniciarla).
- **Expo Go vs. Development Build**: Expo Go es una app genérica
  precompilada con un set fijo de módulos nativos — rápida para empezar,
  pero no soporta módulos nativos custom. Un development build es tu
  propia app nativa compilada con exactamente los módulos que tu proyecto
  necesita; una vez instalada, el flujo diario (`expo start` + Fast
  Refresh) es idéntico a Expo Go. Solo hay que recompilar el development
  build cuando se agrega/quita un módulo **nativo** (no en cambios de JS
  puro).

---

## 6. Cómo levantar todo desde cero (setup de una máquina nueva)

### Backend

```bash
cd control-solicitudes
pnpm install
# configurar .env.local con DATABASE_URL, AUTH_SECRET, etc.
pnpm db:push      # aplica el schema a Postgres
pnpm db:seed      # crea el usuario admin@demo.com / 12345678
pnpm run dev      # levanta en localhost:3000
```

### App móvil

```bash
cd beatriz-mojica-solicitudes/control-solicitudes-mobile
pnpm install   # o npm install, según lo que se use
# configurar .env.local con EXPO_PUBLIC_API_BASE_URL

export ANDROID_HOME=~/Library/Android/sdk
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
npx expo run:android   # SOLO la primera vez (o si se agrega un módulo nativo)
```

Después de esa primera compilación, el día a día es:

```bash
# terminal 1
cd control-solicitudes && pnpm run dev

# terminal 2
cd beatriz-mojica-solicitudes/control-solicitudes-mobile && npx expo start
# presionar "a" para abrir en el emulador Android
```

### `.env.local` de la app móvil

```env
# 10.0.2.2 es la IP especial que el emulador de Android Studio usa
# para referirse al localhost de la máquina host (macOS).
# NO usar 127.0.0.1/localhost aquí — desde DENTRO del emulador
# eso apuntaría al propio emulador, no a la Mac.
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

Si en el futuro se prueba en un **dispositivo físico** Android en la misma
red WiFi (en vez del emulador), `10.0.2.2` **no sirve** — hay que usar la
IP LAN de la Mac (ej. `192.168.1.21`) y asegurarse de que el backend sea
alcanzable en esa red.

Si el backend pasa a estar deployado (no local), esta variable simplemente
se actualiza a esa URL pública — el resto del código no cambia porque
`login()` y `createLoteRemote()` ya usan `API_BASE_URL` de forma
centralizada (`lib/config.ts`).

---

## 7. Qué funciona hoy y qué no

### Funciona

- Login desde la app contra el backend real (JWT propio vía
  `mobile-login`).
- Formulario de captura de lote: fecha, evento/gira, municipio (picker con
  buscador, catálogo completo de Guerrero), notas, fotos (cámara o
  galería).
- Guardado local instantáneo en SQLite, incluso sin conexión.
- Persistencia robusta de las fotos (sobreviven aunque el sistema limpie
  caché) mientras el lote está pendiente.
- Sincronización manual (botón) y automática (al guardar, si hay señal) —
  confirmado funcionando end-to-end contra el backend local
  (`pnpm run dev`), incluyendo la subida real de archivos.
- Diseño visual alineado a la identidad "Beatriz Mojica" del
  proyecto web.
- Logout (borra el token de SecureStore).

### No implementado / pendiente

- **Reintentos automáticos en background**: hoy la sincronización solo se
  dispara al guardar un lote o al presionar el botón "Sincronizar" a mano.
  No hay un listener que detecte "recuperé señal" y sincronice solo, ni un
  *background task* (`expo-background-task`) que lo haga con la app
  cerrada.
- **Manejo de conflictos**: no se ha probado qué pasa si, por ejemplo, se
  edita/borra un lote desde la web mientras está pendiente en el celular.
- **Pruebas en dispositivo físico**: todo el desarrollo y las pruebas se
  hicieron contra el **emulador de Android Studio** (`Pixel 7`, API 34).
  No se ha probado en un teléfono físico ni en iOS.
- **Build de producción / distribución**: no se ha generado ningún APK de
  release, ni configurado EAS Build. El único build existente es un
  **debug build local** instalado directo en el emulador vía
  `expo run:android`.
- **Backend aún no deployado**: todo el trabajo se probó contra
  `pnpm run dev` en local (`10.0.2.2:3000` desde el emulador). El plan
  original mencionaba que "el backend ya estaba deployado", pero en la
  práctica todo el desarrollo/pruebas de la app móvil se hizo apuntando a
  local — falta confirmar y probar contra el entorno deployado real.
- **Reorganización de carpetas**: sigue pendiente el plan de mover
  `control-solicitudes` dentro de `beatriz-mojica-solicitudes/` para que
  ambos proyectos convivan como hermanos (`control-solicitudes` y
  `control-solicitudes-mobile`) bajo el mismo directorio padre.
- **Dashboard/KPIs**: fuera del alcance de este documento, pero recordar
  que en el proyecto web el dashboard y los KPIs siguen corriendo sobre
  datos mock del Excel (`lib/store.tsx`, `lib/mock/*.ts`), no sobre
  Postgres — solo el módulo de Lotes está conectado a la base de datos
  real, tanto en web como ahora en móvil.

---

## 8. Referencia rápida de módulos/funciones clave

| Módulo/archivo | Qué hace |
|---|---|
| `lib/mobile-auth.ts` (backend) | Firma/verifica JWT con `jose` para la app móvil |
| `app/api/auth/mobile-login/route.ts` (backend) | Login que devuelve `{token, user}` |
| `lib/auth.ts` (backend) | `getCurrentUser()` acepta cookie **o** Bearer token |
| `src/lib/config.ts` (app) | `API_BASE_URL` desde `EXPO_PUBLIC_API_BASE_URL` |
| `src/lib/auth-storage.ts` (app) | Guarda/lee/borra token y usuario en `expo-secure-store` |
| `src/lib/auth-context.tsx` (app) | Contexto React de sesión (`useAuth()`) |
| `src/lib/api.ts` (app) | `login()` (fetch) y `createLoteRemote()` (XMLHttpRequest, ver Problema 3) |
| `src/lib/local-db.ts` (app) | Tabla SQLite `lotes_pendientes`: `encolarLote`, `getLotesPendientes`, `marcarError`, `eliminarLotePendiente` |
| `src/lib/archivos-storage.ts` (app) | `persistirArchivos()` / `eliminarArchivosPersistidos()` (ver Problema 4) |
| `src/lib/sync.ts` (app) | `hayConexion()`, `sincronizarPendientes()` |
| `src/components/archivos-picker.tsx` (app) | UI de cámara/galería con `expo-image-picker` |
| `src/components/municipio-picker.tsx` (app) | Modal con buscador de municipios |
| `src/constants/municipios-guerrero.ts` (app) | Catálogo offline de municipios (copiado de `lib/geografia-guerrero.ts` del backend) |

---

## 9. Comandos útiles para debugging

```bash
# Ver dispositivos/emuladores conectados
adb devices

# Logs en vivo del sistema (filtrando ruido)
adb logcat "ReactNativeJS:V" "*:S"

# Logs completos (para buscar errores de red, pids, etc.)
adb logcat > logcat_full.txt

# Limpiar el buffer de logs antes de reproducir un error
adb logcat -c

# Matar procesos de Gradle/Kotlin colgados
pkill -9 -f "GradleDaemon"
pkill -9 -f "KotlinCompileDaemon"
pkill -9 -f "gradlew"
```

Nota: en esta Mac, `adb` no está en el PATH por defecto — hay que exportar
`ANDROID_HOME=~/Library/Android/sdk` y agregar
`$ANDROID_HOME/platform-tools` al PATH, o usar la ruta completa
`~/Library/Android/sdk/platform-tools/adb`.

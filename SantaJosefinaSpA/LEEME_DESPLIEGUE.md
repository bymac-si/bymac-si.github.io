# Puesta en marcha del CRM reparado

Este documento reemplaza al `LEEME.md` anterior, que describía una migración a medias.
Aquí está **qué estaba roto**, **qué se cambió** y **los pasos exactos** para dejarlo
funcionando.

---

## 1. Qué estaba fallando (causas reales encontradas)

| # | Problema | Efecto |
|---|----------|--------|
| 1 | `assets/js/app.js` seguía siendo el de **AppSheet**: definía `appSheetCRUD()`, `fetchData()`, `sha256()`, `requireAuth()` y `loginWithAppSheet()` con `APP_ID`/`API_KEY` | Todo el CRUD apuntaba a `api.appsheet.com` con una clave ya inválida. Ningún dato se guardaba ni se leía. |
| 2 | **Ninguna página cargaba `api_cliente.js`**, salvo `login.html` y `cambiar_clave.html` | El cliente nuevo del backend nunca se ejecutaba. |
| 3 | El archivo se llamaba `Api_cliente.js` (A mayúscula) pero se cargaba como `api_cliente.js` | En GitHub Pages (Linux, sensible a mayúsculas) → **404**. El login no cargaba nada. Funcionaba solo en Mac. |
| 4 | Al cargar los dos archivos juntos, `const appSheetCRUD` (en `api_cliente.js`) y `function appSheetCRUD` (en `app.js`) chocaban | **SyntaxError**: se caía todo el JavaScript de la página. |
| 5 | `plantilla-contrato.html` tenía `replace(".",","")` con una comilla de más (2 veces) | **SyntaxError** que mataba el script del contrato. |
| 6 | 5 páginas declaraban su propio `const API_URL` | Al convivir con el de `api_cliente.js` → **SyntaxError**. |
| 7 | `login_residente.html` comparaba la clave en texto plano (`r.Password === p`) y además tenía la puerta trasera `p === "1234"` | El portal de residentes no podía entrar (el servidor nunca devuelve contraseñas) y cualquiera entraba con `1234`. |
| 8 | Los 4 portales leían `localStorage.sesion_externa` con datos que el servidor nunca entregaba, y pedían **hojas completas** (`fetchData("Cobros")`, etc.) con sesión de residente | El servidor bloquea eso por permisos → todo error 403. |
| 9 | El panel de marketing (5 páginas) hablaba con un **protocolo distinto** del mismo script: `doGet?action=...` y POST sin token | Al desplegar el `Api.gs` nuevo, esas páginas quedaban muertas. |
| 10 | `landing_desktop/mobile` y `checklist_seguridad` son **públicas** pero escribían con `appSheetCRUD` | Un visitante anónimo no tiene token → rebote a `login.html`. |
| 11 | `detalle_gastos.html`, `reclamos.html`, `reservas.html`, `reportar_pago.html` no cargaban la sesión correcta | Mismas fallas que el punto 8. |
| 12 | `sw.js` guardaba en caché el `app.js` viejo | Aunque se corrigiera, el navegador seguía usando la versión con AppSheet. |
| 13 | `_leer_` del backend devolvía los encabezados vacíos si la pestaña no tenía filas de datos | Al escribir la primera fila se **pisaban los títulos de las columnas**. Detectado por las pruebas automáticas. |
| 14 | Rutas absolutas `/assets/...` en 3 archivos | 404 en GitHub Pages de proyecto. |

---

## 2. Cómo quedó la arquitectura

```
GitHub Pages (HTML + JS, sin secretos)
        │
        │  POST text/plain  { route, token, ... }   (evita el preflight CORS)
        ▼
Google Apps Script  (Api.gs dentro de la hoja)
        │
        ▼
Hojas de cálculo (la base de datos)
```

- **`assets/js/api_cliente.js`** — el único archivo que habla con el backend.
  Se carga **siempre antes** de `app.js`.
- **`assets/js/app.js`** — utilidades, UTM, honorarios, cabecera y navegación. Cero AppSheet.
- **`Api.gs`** — backend completo: login del equipo, CRUD con permisos, portal de
  residentes, panel de marketing, formularios públicos y correo saliente.

---

## 3. Pasos para publicar

### 3.1 Backend (una sola vez)

1. Abra la hoja de cálculo → **Extensiones → Apps Script**.
   Si ya hay un proyecto, **reemplace** su contenido: el proyecto no puede tener dos
   `doGet` ni dos `doPost`.
2. Cree `Api.gs` y pegue el contenido del archivo `Api.gs` de esta carpeta.
3. Configuración del proyecto → marque **"Mostrar el archivo de manifiesto
   `appsscript.json`"** y pegue el contenido de `appsscript.json` de esta carpeta
   (zona horaria, `webapp` y permisos de hoja y de llamadas externas).
4. En el editor, ejecute **`inicializarSecretos()`**. Acepte los permisos.
   Crea `SESSION_SECRET` y `PEPPER` (las claves no viven en la hoja).
5. Ejecute **`probarConexion()`** y mire el registro. Le dirá:
   - qué pestañas de `POLICY` no existen,
   - qué pestañas de la hoja no están en `POLICY` (quedan **bloqueadas** a propósito),
   - si hay algún administrador.
6. Ejecute **`probarVelocidadHash()`**. Si tarda más de 2 s, baje `HASH_ITER` arriba
   en `Api.gs` (por ejemplo a 200) y vuelva a probar.
7. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   Copie la URL que termina en `/exec`.

   > Cada vez que cambie `Api.gs` debe hacer
   > **Implementar → Administrar implementaciones → editar → Nueva versión**.
   > Si no, el cambio no se publica.

8. Edite `assets/js/api_cliente.js` y pegue esa URL en `API_URL` (si sigue siendo la
   misma implementación, ya está puesta).

### 3.2 Primer administrador

En el editor de Apps Script ejecute:

```js
claveTemporalUsuario('su@correo.cl')
```

La clave temporal de 12 caracteres aparece en el registro. Con ella entre al CRM;
el sistema le obligará a cambiarla de inmediato.

Para el resto del equipo: cree la fila en la pestaña `Usuarios`
(`Email`, `Nombre`, `Rol`, `Activo = SI`) — puede hacerlo desde la página
**Usuarios** del propio CRM — y luego, con su sesión de administrador abierta,
en la consola del navegador (F12):

```js
await generarClaveUsuario('ana@correo.cl')   // devuelve { passwordTempotal } una sola vez
```

> `generarClaveUsuario` crea las columnas `PassHash` y `DebeCambiarClave`, borra
> `PlainPassword` y el hash antiguo sin sal, y devuelve la clave temporal **una vez**.

### 3.3 Residentes

```js
// en el editor de Apps Script
claveTemporalPara('rosa@mail.cl')     // o por RUT
```

Instale la clave por un canal privado. El residente entra por `login_residente.html`,
elige su perfil (residente / arrendatario / propietario) y escribe su correo **o RUT**.

### 3.4 Correo saliente (Resend) — opcional

El envío de correo desde el panel de marketing usa Resend. En el editor ejecute:

```js
configurarCorreo('re_su_clave_de_resend', 'CRM Santa Josefina <crm@sudominio.cl>', 'avisos@sudominio.cl')
```

- 1.er argumento: clave de Resend (`RESEND_API_KEY`).
- 2.º: remitente verificado en Resend (`RESEND_FROM`).
- 3.º: correo que recibe los avisos de nuevos diagnósticos (`NOTIFICAR_A`), opcional.

Sin esta configuración el resto del CRM funciona igual; solo `apiResend` y el aviso
de nuevos diagnósticos quedan desactivados (y avisan con un mensaje claro).

### 3.5 Frontend (GitHub Pages)

Suba **todo** el contenido de esta carpeta a la raíz del repositorio publicado.

> Importante: el archivo debe llamarse exactamente `api_cliente.js` (minúsculas).
> Si lo sube como `Api_cliente.js`, en GitHub Pages dará 404.

El `sw.js` ya está en la versión `v4`, así que al primer recargar se borra la caché
antigua (la que tenía el `app.js` con AppSheet). Si algo se ve raro, fuerce la
recarga con **Ctrl+Shift+R**.

---

## 4. Verificación antes de dar por bueno el CRM

### 4.1 Pruebas automáticas del backend (sin tocar Google)

En esta carpeta:

```bash
node pruebas/pruebas_api.js
```

Simula Google Sheets, la caché, las propiedades y la firma, y ejecuta **93 pruebas**
sobre el `Api.gs` real:

- login del equipo, clave temporal y bloqueo obligatorio de cambio,
- 5 intentos fallidos → bloqueo de 15 minutos (por correo, no global),
- usuario desactivado, mensaje genérico si el correo no existe,
- permisos por rol: un colaborador no borra ni ve `Usuarios`,
- `Auditoria` bloqueada incluso para el administrador,
- una celda con fórmula no se pisa,
- un texto que empieza con `=` se guarda como texto,
- IDs de 8 caracteres generados por el servidor,
- **aislamiento entre unidades**: un residente no ve cobros, reclamos ni pagos de otro,
- un residente no puede crear un reclamo ni un pago en la unidad del vecino,
- los campos forzados desde el navegador (estado, usuario, unidad) se ignoran,
- un token de residente no sirve en las rutas del equipo, y al revés,
- el choque de horarios al reservar,
- el panel de marketing (agentes, dashboard, leads vencidos, autoasignar, gestión),
- los formularios públicos no pueden escribir en `Usuarios`,
- rutas desconocidas, JSON inválido y tokens manipulados.

Todas pasan. Si usted cambia `Api.gs`, vuelva a ejecutarlas.

### 4.2 Comprobaciones en el navegador (hágalas usted)

Ninguna de estas la puede hacer un script; hágalas en su entorno real:

1. **Login del equipo** con la clave temporal → debe llevar a `cambiar-clave.html`.
2. Cambiar la clave → debe entrar a `dashboard.html` (o `mobile_dashboard.html`).
3. Abrir **Propiedades**, crear una fila y recargar: debe seguir ahí.
4. Abrir **Usuarios**: debe listar sin mostrar `PassHash`.
5. Entrar como **residente** y comprobar que solo ve su unidad.
6. Enviar un reclamo desde el portal y verlo en **Gestión de Reclamos**.
7. Hacer una **reserva** y confirmar que el bloque repetido se rechaza.
8. **Reportar un pago** y aprobarlo en **Conciliación**.
9. Enviar el **checklist de seguridad** desde una ventana de incógnito
   (sin sesión): debe registrarse el contacto y el lead.
10. Medir la velocidad real de una llamada (`Find` de una tabla grande).

---

## 5. Seguridad: qué protege y qué no

**Protege**

- Claves con HMAC-SHA-256 + sal + `PEPPER` (que no está en la hoja). Quien obtenga
  solo la hoja no puede descifrarlas.
- Sesiones firmadas, con vencimiento a 8 horas. El rol y el estado `Activo` se
  **vuelven a comprobar en cada llamada**: desactivar a alguien corta su acceso al
  instante, sin esperar a que caduque el token.
- Permisos por pestaña en `POLICY`. Lo que no está listado queda **bloqueado**.
  Solo un administrador borra filas y solo un administrador ve `Usuarios`.
- Las columnas de clave (`PassHash`, `PasswordHash`, `PlainPassword`, `password`)
  **nunca salen** al navegador y **nunca se aceptan** desde él.
- `Banco` y `Cuenta` solo los ve un administrador.
- Los residentes ven únicamente sus unidades: el filtrado lo hace el servidor.
- Los formularios públicos solo pueden escribir en `ProspectosCorretaje`,
  `contactos`, `Bitacora` y `Leads_Marketing`, con un tope de 200 registros por hora.
- El script nunca pisa una celda con fórmula y neutraliza textos que empiezan con
  `=`, `+`, `-` o `@`.
- `Auditoria` registra ingresos, escrituras y cambios de clave, y no es accesible
  desde el CRM.

**No protege (limitaciones reales de Apps Script)**

- **No hay IP disponible**, así que el freno por intentos es por correo. Un atacante
  podría bloquear a propósito la cuenta de otra persona durante 15 minutos.
- Las iteraciones del hash son bajas (`HASH_ITER = 500`) porque Apps Script no trae
  PBKDF2. Es un compromiso entre velocidad y resistencia.
- **No hay recuperación de clave por correo**: si alguien la olvida, el administrador
  genera una temporal.
- Apps Script tiene cuotas diarias de ejecución. Para un equipo pequeño alcanzan;
  confírmelo con su volumen real.
- Cada llamada lee hojas completas: del orden de uno a unos pocos segundos.
- La clave de Resend vive en las propiedades del script, no en el navegador, pero el
  envío de correo queda disponible para cualquier integrante con sesión.

**Pendiente recomendado**

- Borre `test_resend.html` de la publicación (ya pide sesión, pero es una herramienta
  de diagnóstico que no debería estar en producción).
- Cuando todo el equipo tenga su clave nueva, elimine las columnas `PlainPassword`,
  `PasswordHash` y `password` de `Usuarios` y de `Copropietarios`.
- **Desactive o elimine la app de AppSheet** y su API: así la clave que estuvo
  publicada en el repositorio queda inservible.

---

## 6. Detalles del backend que conviene conocer

### Rutas disponibles en `Api.gs`

| Ruta | Sesión | Para qué |
|------|--------|----------|
| `login` | — | Ingreso del equipo |
| `usr.clave` | equipo | Cambio de clave propia |
| `admin.usrClave` | admin | Fijar o generar clave del equipo |
| `admin.resClave` | admin | Fijar o generar clave de un residente |
| `data` | equipo | CRUD (`Find`, `Add`, `Edit`, `Delete`) con permisos |
| `res.login` | — | Ingreso de residente / arrendatario / propietario |
| `res.portal` | residente | Todos sus datos, ya filtrados |
| `res.reclamo` | residente | Crear reclamo (estado y unidad los fija el servidor) |
| `res.reclamoEdit` | residente | Responder en su reclamo |
| `res.reserva` | residente | Reservar un espacio común |
| `res.pago` | residente | Reportar un pago de gasto común |
| `res.pagoArriendo` | arrendatario | Reportar el pago del arriendo |
| `res.clave` | residente | Cambio de clave propia |
| `accion` | equipo | Panel de marketing (`getAgentes`, `getDashboardData`, `leadsAVencidos`, `autoAsignar`, `asignarEjecutivo`, `gestionarLead`, `apiResend`, `getAnaliticaCampanas`) |
| `publico` | — | `add` (solo 4 tablas permitidas) y `registrarDiagnostico` |

### Funciones que se ejecutan desde el editor

| Función | Para qué |
|---------|----------|
| `inicializarSecretos()` | Crea `SESSION_SECRET`, `PEPPER` y `ADMIN_ROLES` |
| `probarConexion()` | Revisa pestañas, `POLICY`, secretos y administradores |
| `probarVelocidadHash()` | Mide el costo del login; dice si bajar `HASH_ITER` |
| `probarSesion()` | Crea y verifica un token de prueba |
| `claveTemporalUsuario(correo)` | Primer administrador / restablecer clave |
| `claveTemporalPara(correo o RUT)` | Clave temporal para un residente |
| `configurarCorreo(clave, remitente, avisos)` | Configura Resend |

### Ajustes que quizá necesite hacer

- **`POLICY`**: si su hoja tiene pestañas que no están en la lista, agréguelas o
  quedarán bloqueadas. `probarConexion()` le dice cuáles.
- **`CONFIG_MARKETING`**: el panel de marketing trabaja sobre `Leads_Marketing`.
  Cada columna admite varios nombres posibles (`Categoria_Lead` o `Categoría_Lead`,
  `SLA_Horas` o `Horas`, etc.). Revise esa lista al principio de la sección 13 de
  `Api.gs` y ajústela a los títulos reales de su hoja.
- **`SLA_HORAS_LIMITE`**: horas sobre las que un lead categoría A sin ejecutivo se
  considera vencido (por defecto 24).
- **`ADMIN_ROLES`**: roles que cuentan como administrador (por defecto
  `admin,administrador`). Se puede sobrescribir en las propiedades del script.

---

## 7. Archivos que cambiaron

**Nuevos**

- `Api.gs` — backend completo (1.700 líneas, 103 funciones).
- `appsscript.json` — manifiesto con zona horaria, `webapp` y permisos.
- `pruebas/pruebas_api.js` — 93 pruebas con simulador de Google Sheets.
- `LEEME_DESPLIEGUE.md` — este documento.

**Reescritos**

- `assets/js/app.js` — sin nada de AppSheet.
- `assets/js/api_cliente.js` — antes `Api_cliente.js` (minúsculas), con las rutas
  de residentes, reservas, pagos, marketing y formularios públicos.
- `login_residente.html` — login real contra el servidor (se eliminó `1234`).
- `portal_residente.html`, `portal-comunidad.html`, `portal_arrendatario.html`,
  `portal_vendedor.html` — usan la sesión y los datos que entrega el servidor.
- `reclamos.html`, `reservas.html`, `reportar_pago.html`, `detalle_gastos.html` —
  páginas de residentes migradas.
- `analitica.html`, `dashboard_conversiones.html`, `envia_campaigns.html`,
  `gestion_leads.html` — panel de marketing con token.
- `test_resend.html` — ahora exige sesión (antes era un relay de correo abierto).

**Corregidos**

- 53 páginas: se agregó `<script src="assets/js/api_cliente.js">` antes de `app.js`.
- `checklist_seguridad.html`, `landing_desktop.html`, `landing_mobile.html` —
  usan la ruta pública.
- `plantilla-contrato.html` — dos `SyntaxError` corregidos.
- `sw.js` — caché `v4`.
- `header.html` — `initHeader()` y cierre de sesión con el token.
- `admin-arrendamiento.html`, `contrato-corretaje.html`, `plantilla-contrato.html`,
  `folleto.html`, `sidebar.html` — rutas absolutas y recursos inexistentes.
- `nueva-visita.html` — le faltaba `requireAuth()`.

---

## 8. Si algo falla

1. Abra la consola del navegador (F12) → pestaña **Red**. Busque la llamada a
   `script.google.com`. La respuesta siempre es HTTP 200 con
   `{ ok:false, status, error }`: **lea `error`**, ahí está el motivo.
2. `status 401` → sesión vencida o token de otro tipo de usuario.
3. `status 403` con "POLICY" → falta esa pestaña en `POLICY` de `Api.gs`.
4. `status 403` con "Debe cambiar su clave" → clave temporal sin cambiar.
5. `status 404` "No existe la pestaña X" → el nombre de la pestaña no coincide.
6. `status 500` "Falta el secreto..." → ejecute `inicializarSecretos()`.
7. En Apps Script: **Ejecuciones** muestra cada llamada con su error completo.

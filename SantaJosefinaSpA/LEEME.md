# CRM sobre Google Apps Script (sin AppSheet y sin Google Cloud)

La hoja de cálculo sigue siendo la base de datos. El backend es un script de Apps Script dentro de esa misma hoja,
y el CRM en GitHub Pages le habla directamente. No se necesita AppSheet, Cloudflare ni credenciales de Google Cloud.

```
GitHub Pages (JavaScript)  --text/plain-->  Apps Script (Api.gs)  -->  Hojas de cálculo
   sin secretos                            login con correo y clave,
                                           permisos, auditoría, residentes
```

## Antes de apagar AppSheet: inventario
Desde aquí solo veo los datos de la hoja, no la configuración de su app de AppSheet. Revise y anote lo que hoy hace AppSheet por usted:
- **Columnas virtuales** (calculadas en la app y que no existen en la hoja). Si el CRM las usa, hay que calcularlas en JavaScript.
- **IDs automáticos** (`UNIQUEID()`): el script ya genera IDs de 8 caracteres si la fila nueva no trae uno.
- **Bots y automatizaciones**: correos, avisos, tareas programadas, cálculo de cobros. Se reemplazan con activadores de Apps Script.
- **Filtros de seguridad, vistas, acciones y la app móvil de AppSheet** si el equipo todavía la usa.
Cuando verifique que el CRM funciona, **elimine la app de AppSheet o desactive su API**: así la clave que estaba publicada queda inservible.

## Paso 1: instalar el script
1. Abra la hoja de cálculo → Extensiones → Apps Script. Si ya existe un proyecto (por ejemplo, con `CALCULAR_DISTANCIA`), agregue un archivo nuevo y no pise el existente. El proyecto no debe tener otro `doGet` ni `doPost`.
2. Cree el archivo `Api.gs` y pegue el contenido.
3. Configuración del proyecto → marque "Mostrar el archivo de manifiesto appsscript.json" y combine su contenido con el de `appsscript.json` (zona horaria, `webapp` y permiso de hojas).
4. En el editor, ejecute `inicializarSecretos()` (crea `SESSION_SECRET` y `PEPPER`). Acepte los permisos. Opcional: en Propiedades del script agregue `ADMIN_ROLES` (por defecto `admin,administrador`, en minúsculas).
5. Ejecute `probarConexion()` y revise en el registro que no falte ninguna pestaña. Ajuste `POLICY` en `Api.gs` a sus pestañas reales: lo que no esté listado queda bloqueado.
6. Ejecute `probarVelocidadHash()`. Si tarda más de 2 segundos, baje `HASH_ITER`.
7. Implementar → Nueva implementación → Aplicación web → **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier persona**. Copie la URL que termina en `/exec`.
8. Cada vez que cambie el código: Implementar → Administrar implementaciones → editar → **Nueva versión**. Si no, el cambio no se publica.

## Paso 2: crear las claves del equipo
En la pestaña `Usuarios`, `Email` debe ser el correo de cada persona y `Rol` define sus permisos (el rol que cuente como administrador debe estar en `ADMIN_ROLES`). `Activo` en "No" quita el acceso en menos de 5 minutos.

**Primer administrador:** en el editor de Apps Script ejecute `claveTemporalUsuario('su@correo.cl')`. La clave temporal aparece en el registro de ejecución. Úsela para entrar al CRM; el sistema le pedirá cambiarla de inmediato.

**Resto del equipo:** con la sesión de administrador iniciada, desde la consola del navegador (F12):
```js
await generarClaveUsuario('ana@correo.cl')   // devuelve { passwordTemporal: "..." } una sola vez
```
Entregue la clave temporal por un canal privado. La persona deberá cambiarla en su primer ingreso, y hasta entonces solo podrá usar la pantalla de cambio de clave.

Esa acción crea sola las columnas `PassHash` y `DebeCambiarClave`, y **borra `PlainPassword` y el hash antiguo sin sal** de esa fila. Cuando todos tengan su clave nueva, elimine esas dos columnas antiguas de la hoja.

## Paso 3: cambios en el CRM
1. Suba `api_cliente.js`, `login.html` y `cambiar-clave.html` (el primero a `assets/js/`, los otros a la raíz). Pegue su URL `/exec` en `API_URL`.
2. Cargue `api_cliente.js` **antes** de `app.js` en todas las páginas.
3. En `app.js` elimine los bloques que indica la cabecera de `api_cliente.js` (la configuración de AppSheet, `appSheetCRUD`, `fetchData`, `sha256`, `getAuthUser`, `setAuthUser`, `requireAuth` y `loginWithAppSheet`). En `window.logout` agregue `localStorage.removeItem("crm_token")`.
4. En `sw.js` no guarde en caché las respuestas de `script.google.com`.
5. Si alguna página usa `fetchData` con un `Selector` propio, cámbiela a `fetchData("Tabla", {column:"Columna", value:"Valor"})`.

## Paso 4: portal de residentes
- Cada residente necesita una clave. En el editor ejecute `claveTemporalPara('correo@del.residente')`, o con sesión de admin en el CRM use `await generarClaveResidente('correo')`. Entréguela por un canal privado. Eso crea la columna `PassHash` y borra la clave en texto plano de `password`.
- El residente ve solo su perfil, sus unidades (`Copropietarios.UnidadID` más las que lo tienen en `Unidades.PropietarioID`), y los cobros, pagos y reclamos de esas unidades, más gastos comunes y contacto de su copropiedad. Banco, cuenta y RUT no se muestran (`SHOW_BANK_TO_RESIDENTS`).
- Puede crear reclamos y cambiar su clave. El servidor fija usuario, unidad y estado del reclamo.
- Funciones del cliente: `loginResidente`, `cargarPortalResidente`, `crearReclamoResidente` y `cambiarClaveResidente`. Para adaptar `portal.html` necesito verlo.

## Cómo funciona la seguridad
- Las claves se guardan con HMAC-SHA-256, sal y un secreto (`PEPPER`) que no está en la hoja: quien obtenga solo la hoja no puede descifrarlas. Apps Script no trae PBKDF2, por eso las iteraciones son pocas (`HASH_ITER`).
- 5 fallos por correo bloquean ese correo 15 minutos, y hay un freno general. Esto protege contra adivinar claves, pero un atacante puede bloquear a propósito la cuenta de otra persona por 15 minutos. Apps Script no permite usar la IP.
- La sesión dura 8 horas. El mensaje de error es el mismo si el correo no existe, y se gasta el mismo tiempo de cálculo.
- Cada integrante del equipo, y cada residente, tiene un tipo de sesión distinto; una no sirve en las rutas de la otra.
- Permisos por pestaña y rol en `POLICY`; solo un admin puede borrar filas. `Usuarios`, `Auditoria` y las pestañas no listadas están bloqueadas.
- Las columnas de contraseñas nunca salen ni se aceptan desde el navegador. `Banco` y `Cuenta` se ocultan a quien no sea admin.
- El script nunca pisa una celda con fórmula, y un texto que empiece con `=`, `+`, `-` o `@` se guarda como texto.
- La pestaña `Auditoria` registra logins y escrituras. No es accesible desde el CRM.
- Limite el uso compartido de la hoja: el CRM ya no necesita que el equipo la abra directamente.

## Diferencias que conviene conocer
- **Siempre responde 200:** los errores vienen como `{ ok:false, status, error }`. `api_cliente.js` ya lo maneja.
- **Velocidad:** cada llamada lee hojas completas; puede tardar del orden de uno a unos pocos segundos. No lo he medido en su hoja. Si crece, se agrega caché por pestaña.
- **Cuotas:** Apps Script tiene límites diarios de ejecución. Para un equipo pequeño suelen alcanzar; confírmelo con su volumen real en la documentación de Google.
- **Sin recuperación de clave por correo:** si alguien la olvida, el administrador genera una temporal.

## Pruebas realizadas
90 casos contra el código real de `Api.gs`, con una simulación de Sheets, caché, bloqueos y firma: login del equipo, clave temporal con sesión restringida hasta el cambio, bloqueo por intentos, usuario desactivado, permisos por rol, fórmulas no pisadas, texto con `=` guardado como texto, IDs duplicados, aislamiento entre unidades del portal, tokens no intercambiables, reclamo con datos forzados y residente desactivado. **No se ha ejecutado en Google real ni en un navegador**: `login.html` y `cambiar-clave.html` no se han abierto en un navegador, y la velocidad, los permisos de autorización y el comportamiento exacto de `setValue` con caracteres especiales hay que verificarlos en su entorno.
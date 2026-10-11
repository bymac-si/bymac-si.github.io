/**
 * ============================================================================
 *  Api.gs — backend del CRM Santa Josefina sobre Google Apps Script
 *  Versión 2.0.0
 * ============================================================================
 *
 *  La hoja de cálculo es la base de datos. Este script es el único que la toca.
 *  El CRM (GitHub Pages) le habla por POST con text/plain y recibe siempre
 *  HTTP 200 con la forma { ok, status, error } o { ok, data }.
 *
 *  INSTALACIÓN (ver LEEME_DESPLIEGUE.md)
 *   1. Pegue este archivo como Api.gs dentro del proyecto de Apps Script de la hoja.
 *   2. Ejecute inicializarSecretos() una vez (crea SESSION_SECRET y PEPPER).
 *   3. Ejecute probarConexion() y revise el registro: le dirá qué pestañas faltan.
 *   4. Ejecute probarVelocidadHash(). Si tarda más de 2 s, baje HASH_ITER.
 *   5. Implemente como aplicación web: Ejecutar como "Yo",
 *      acceso "Cualquier persona". Copie la URL /exec.
 *   6. Cree el primer administrador con claveTemporalUsuario('su@correo.cl').
 *
 *  SEGURIDAD
 *   - Claves con HMAC-SHA-256 + sal + PEPPER (no están en la hoja).
 *   - Sesiones firmadas, con vencimiento; el rol y el estado "Activo" se
 *     vuelven a comprobar en cada llamada.
 *   - Permisos por pestaña en POLICY. Lo que no esté en POLICY queda bloqueado.
 *   - Las columnas de clave nunca salen ni se aceptan desde el navegador.
 *   - Nunca se pisa una celda con fórmula y los textos que empiezan con
 *     = + - @ se guardan como texto.
 *   - Todo queda en la pestaña Auditoria (no accesible desde el CRM).
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURACIÓN
// ============================================================================

var VERSION_API = '2.0.0';

// Si el script NO está ligado a la hoja, ponga aquí el ID de la hoja de cálculo.
var SPREADSHEET_ID = '';

// Iteraciones del hash de claves. Súbalo si su equipo tiene pocos usuarios y
// el login sigue siendo rápido; bájelo si probarVelocidadHash() pasa de 2 s.
var HASH_ITER = 500;

var SESION_HORAS = 8;            // duración de la sesión
var MAX_INTENTOS = 5;            // fallos seguidos antes de bloquear
var BLOQUEO_MINUTOS = 15;        // duración del bloqueo
var MIN_LARGO_CLAVE = 10;        // largo mínimo de la clave nueva

// Roles que cuentan como administrador (se puede sobrescribir con la
// propiedad de script ADMIN_ROLES, separada por comas, en minúsculas).
var ADMIN_ROLES_DEFECTO = 'admin,administrador';

// Roles de los residentes, para no confundirlos con el equipo.
var TIPOS_RESIDENTE = ['residente', 'arrendatario', 'propietario'];

// Columnas que nunca salen de la hoja ni se aceptan desde el navegador.
var COLUMNAS_SECRETAS = ['PassHash', 'password', 'Password', 'PlainPassword',
  'PasswordHash', 'PEPPER', 'SESSION_SECRET'];

// Columnas que solo ve un administrador.
var COLUMNAS_SOLO_ADMIN = ['Banco', 'Cuenta'];

// Columnas que no se le muestran nunca a un residente.
var COLUMNAS_OCULTAS_RESIDENTE = ['PassHash', 'password', 'Password',
  'PlainPassword', 'PasswordHash', 'Banco', 'Cuenta', 'RUT'];

// Pestañas que jamás se sirven por la ruta de datos.
// Usuarios NO está aquí: la página usuarios.html lo administra, pero solo un administrador.
var TABLAS_PROHIBIDAS = ['Auditoria', 'Secretos', 'Sesiones'];

/**
 * Permisos por pestaña.
 *   leer     : 'equipo' (cualquier integrante activo) | 'admin' | lista de roles
 *   escribir : igual que leer (Add y Edit)
 *   borrar   : solo 'admin' borra filas
 * Lo que no esté aquí queda bloqueado.
 */
var POLICY = {
  'Agentes':            { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Bitacora':           { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Bloques':            { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Campañas':           { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Clientes':           { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Cobros':             { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'contactos':          { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'ContratosArriendo':  { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Copropiedades':      { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Copropietarios':     { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Espacios':           { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Gastos':             { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'GastosComunes':      { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'GastosOperativos':   { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Leads':              { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Leads_Marketing':    { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Marketing':          { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Pagos':              { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'PagosArriendo':      { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Propiedades':        { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'ProspectosCopro':    { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'ProspectosCorretaje':{ leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Proveedores':        { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Reclamos':           { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Reservas':           { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'TablaTarifas':       { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Tareas':             { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Transacciones':      { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Unidades':           { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  'Visitas':            { leer: 'equipo', escribir: 'equipo', borrar: 'admin' },
  // La pestaña Usuarios queda restringida a administradores. Las columnas de
  // clave se eliminan siempre antes de responder, así que nunca viajan al navegador.
  'Usuarios':           { leer: 'admin',  escribir: 'admin',  borrar: 'admin' }
};

// ============================================================================
// 2. PUERTA DE ENTRADA
// ============================================================================

function doGet(e) {
  var ruta = (e && e.parameter && e.parameter.route) || '';
  if (ruta === 'ping') return _ok_({ pong: true, version: VERSION_API });
  return _ok_({
    servicio: 'CRM Santa Josefina',
    version: VERSION_API,
    estado: 'activo',
    nota: 'Este endpoint se usa por POST. Si ve esto, la implementación quedó publicada.'
  });
}

function doPost(e) {
  try {
    var cuerpo = (e && e.postData && e.postData.contents) || '';
    var datos;
    try { datos = JSON.parse(cuerpo); } catch (err) { return _fallo_(400, 'Petición mal formada.'); }
    if (!datos || typeof datos !== 'object') return _fallo_(400, 'Petición vacía.');

    var ruta = String(datos.route || '');
    switch (ruta) {
      case 'login':            return _ok_(_loginEquipo_(datos));
      case 'usr.clave':        return _ok_(_cambiarClavePropia_(datos));
      case 'admin.usrClave':   return _ok_(_adminClaveUsuario_(datos));
      case 'admin.resClave':   return _ok_(_adminClaveResidente_(datos));
      case 'data':             return _ok_(_rutaDatos_(datos));
      case 'res.login':        return _ok_(_loginResidente_(datos));
      case 'res.portal':       return _ok_(_portalResidente_(datos));
      case 'res.reclamo':      return _ok_(_reclamoResidente_(datos));
      case 'res.reclamoEdit':  return _ok_(_editarReclamoResidente_(datos));
      case 'res.pagoArriendo': return _ok_(_pagoArriendoResidente_(datos));
      case 'res.reserva':      return _ok_(_reservaResidente_(datos));
      case 'res.pago':         return _ok_(_pagoResidente_(datos));
      case 'res.clave':        return _ok_(_cambiarClaveResidente_(datos));
      // Compatibilidad con el panel de marketing / captación de leads
      case 'accion':           return _ok_(_accionMarketing_(datos));
      case 'publico':          return _ok_(_rutaPublica_(datos));
      default:                 return _fallo_(404, 'Ruta desconocida: ' + ruta);
    }
  } catch (err) {
    var estado = (err && err.status) ? err.status : 500;
    if (estado >= 500) console.error(err && err.stack ? err.stack : err);
    return _fallo_(estado, (err && err.message) ? err.message : 'Error interno del servidor.');
  }
}

// ============================================================================
// 3. RESPUESTAS
// ============================================================================

function _ok_(data) {
  return _responder_({ ok: true, data: (data === undefined ? null : data) });
}

function _fallo_(status, mensaje) {
  return _responder_({ ok: false, status: status, error: mensaje });
}

function _responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _error_(status, mensaje) {
  var e = new Error(mensaje);
  e.status = status;
  return e;
}

function _cortar_(status, mensaje) {
  throw _error_(status, mensaje);
}

// ============================================================================
// 4. HOJA DE CÁLCULO: LECTURA Y ESCRITURA
// ============================================================================

function _ss_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  var activa = SpreadsheetApp.getActiveSpreadsheet();
  if (!activa) _cortar_(500, 'El script no está ligado a una hoja. Complete SPREADSHEET_ID.');
  return activa;
}

function _hoja_(nombre, crearSiFalta) {
  var ss = _ss_();
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    var buscado = String(nombre).toLowerCase();
    var hojas = ss.getSheets();
    for (var i = 0; i < hojas.length; i++) {
      if (hojas[i].getName().toLowerCase() === buscado) { hoja = hojas[i]; break; }
    }
  }
  if (!hoja && crearSiFalta) hoja = ss.insertSheet(nombre);
  if (!hoja) _cortar_(404, 'No existe la pestaña "' + nombre + '" en la hoja de cálculo.');
  return hoja;
}

function _existeHoja_(nombre) {
  try { _hoja_(nombre, false); return true; } catch (e) { return false; }
}

/**
 * Lee una pestaña completa y la devuelve como filas-objeto.
 * Cada objeto lleva la propiedad __fila (número de fila real), que se quita
 * antes de enviar nada al navegador.
 */
function _leer_(nombre, crearSiFalta) {
  var hoja = _hoja_(nombre, !!crearSiFalta);
  var ultimaFila = hoja.getLastRow();
  var ultimaCol = hoja.getLastColumn();
  if (ultimaFila < 1 || ultimaCol < 1) return { hoja: hoja, headers: [], filas: [] };

  // La fila 1 se lee SIEMPRE como encabezados, aunque todavía no haya datos:
  // si no, _asegurarColumnas_ creería que la pestaña está vacía y pisaría los títulos.
  var valores = hoja.getRange(1, 1, ultimaFila, ultimaCol).getValues();
  var headers = valores[0].map(function (h, i) {
    var t = String(h == null ? '' : h).trim();
    return t || ('Columna' + (i + 1));
  });

  var filas = [];
  for (var r = 1; r < valores.length; r++) {
    var obj = {};
    var vacia = true;
    for (var c = 0; c < headers.length; c++) {
      var v = valores[r][c];
      obj[headers[c]] = _salida_(v);
      if (v !== '' && v !== null && v !== undefined) vacia = false;
    }
    if (vacia) continue;
    obj.__fila = r + 1;
    filas.push(obj);
  }
  return { hoja: hoja, headers: headers, filas: filas };
}

/** Igual que _leer_ pero devuelve una tabla vacía si la pestaña no existe. */
function _leerSeguro_(nombre) {
  if (!_existeHoja_(nombre)) return { hoja: null, headers: [], filas: [] };
  return _leer_(nombre, false);
}

function _salida_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, _zona_(), 'yyyy-MM-dd HH:mm:ss');
  }
  return v;
}

function _zona_() {
  try { return _ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); }
  catch (e) { return Session.getScriptTimeZone(); }
}

function _quitarPrivadas_(fila, esAdmin) {
  var copia = {};
  for (var k in fila) {
    if (!Object.prototype.hasOwnProperty.call(fila, k)) continue;
    if (k === '__fila') continue;
    if (COLUMNAS_SECRETAS.indexOf(k) !== -1) continue;
    if (!esAdmin && COLUMNAS_SOLO_ADMIN.indexOf(k) !== -1) continue;
    copia[k] = fila[k];
  }
  return copia;
}

function _quitarPrivadasResidente_(fila) {
  var copia = {};
  for (var k in fila) {
    if (!Object.prototype.hasOwnProperty.call(fila, k)) continue;
    if (k === '__fila') continue;
    if (COLUMNAS_OCULTAS_RESIDENTE.indexOf(k) !== -1) continue;
    copia[k] = fila[k];
  }
  return copia;
}

// ---------------------------------------------------------------------------
// Escritura segura: no pisa fórmulas y neutraliza textos peligrosos.
// ---------------------------------------------------------------------------
function _celdaSegura_(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object' && !(valor instanceof Date)) {
    return JSON.stringify(valor); // objetos y arreglos se guardan como texto
  }
  if (typeof valor === 'string') {
    var t = valor;
    if (/^[=+\-@]/.test(t)) return "'" + t;   // se guarda como texto, no como fórmula
    return t;
  }
  return valor;
}

function _asegurarColumnas_(hoja, headers, columnas) {
  var faltan = [];
  for (var i = 0; i < columnas.length; i++) {
    if (headers.indexOf(columnas[i]) === -1) faltan.push(columnas[i]);
  }
  if (!faltan.length) return headers;
  var inicio = headers.length + 1;
  hoja.getRange(1, inicio, 1, faltan.length).setValues([faltan]);
  return headers.concat(faltan);
}

/**
 * Agrega al final las columnas que falten según las filas que llegan.
 * Así un campo nuevo (por ejemplo "Estado_Envio") no se pierde en silencio.
 */
function _asegurarColumnasDeFilas_(hoja, headers, filas) {
  var nuevas = [];
  for (var i = 0; i < filas.length; i++) {
    var f = filas[i];
    if (!f || typeof f !== 'object') continue;
    for (var k in f) {
      if (!Object.prototype.hasOwnProperty.call(f, k)) continue;
      if (k === '__fila' || COLUMNAS_SECRETAS.indexOf(k) !== -1) continue;
      if (headers.indexOf(k) === -1 && nuevas.indexOf(k) === -1) nuevas.push(k);
    }
  }
  if (!nuevas.length) return headers;
  hoja.getRange(1, headers.length + 1, 1, nuevas.length).setValues([nuevas]);
  return headers.concat(nuevas);
}

function _claveDe_(fila, headers, keyName) {
  if (keyName && fila[keyName] !== undefined && fila[keyName] !== '') return fila[keyName];
  var candidatos = ['ID', 'Id', 'id', 'Key', 'Row ID', 'RowID', '_ComputedKey'];
  for (var i = 0; i < candidatos.length; i++) {
    if (headers.indexOf(candidatos[i]) !== -1 && fila[candidatos[i]] !== undefined && fila[candidatos[i]] !== '') {
      return fila[candidatos[i]];
    }
  }
  return null;
}

function _nombreClave_(headers) {
  var candidatos = ['ID', 'Id', 'id', 'Key', 'Row ID', 'RowID', '_ComputedKey'];
  for (var i = 0; i < candidatos.length; i++) {
    if (headers.indexOf(candidatos[i]) !== -1) return candidatos[i];
  }
  return headers.length ? headers[0] : null;
}

function _nuevoId_() {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < 8; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function _activo_(v) {
  if (v === undefined || v === null || v === '') return true; // sin columna Activo => activo
  if (v === true) return true;
  if (v === false) return false;
  var s = String(v).trim().toLowerCase();
  return ['no', 'false', 'falso', '0', 'inactivo', 'desactivado', 'suspendido'].indexOf(s) === -1;
}

// ============================================================================
// 5. SECRETOS, HASH Y TOKENS
// ============================================================================

function _props_() { return PropertiesService.getScriptProperties(); }

function _secreto_(nombre) {
  var v = _props_().getProperty(nombre);
  if (!v) _cortar_(500, 'Falta el secreto ' + nombre + '. Ejecute inicializarSecretos() en el editor.');
  return v;
}

function inicializarSecretos() {
  var props = _props_();
  var cambios = [];
  if (!props.getProperty('SESSION_SECRET')) {
    props.setProperty('SESSION_SECRET', Utilities.getUuid() + Utilities.getUuid());
    cambios.push('SESSION_SECRET');
  }
  if (!props.getProperty('PEPPER')) {
    props.setProperty('PEPPER', Utilities.getUuid() + Utilities.getUuid());
    cambios.push('PEPPER');
  }
  if (!props.getProperty('ADMIN_ROLES')) {
    props.setProperty('ADMIN_ROLES', ADMIN_ROLES_DEFECTO);
    cambios.push('ADMIN_ROLES=' + ADMIN_ROLES_DEFECTO);
  }
  Logger.log(cambios.length ? 'Creado: ' + cambios.join(', ') : 'Los secretos ya existían. No se tocó nada.');
  return cambios;
}

function _rolesAdmin_() {
  var v = _props_().getProperty('ADMIN_ROLES') || ADMIN_ROLES_DEFECTO;
  return v.split(',').map(function (r) { return r.trim().toLowerCase(); }).filter(String);
}

function _esAdmin_(rol) {
  return _rolesAdmin_().indexOf(String(rol || '').trim().toLowerCase()) !== -1;
}

function _b64url_(texto) {
  return Utilities.base64EncodeWebSafe(texto, Utilities.Charset.UTF_8).replace(/=+$/, '');
}

function _deB64url_(texto) {
  var t = String(texto).replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  return Utilities.newBlob(Utilities.base64Decode(t)).getDataAsString();
}

function _hmac_(texto) {
  var bytes = Utilities.computeHmacSha256Signature(texto, _secreto_('SESSION_SECRET'));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function _iguales_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var dif = 0;
  for (var i = 0; i < a.length; i++) dif |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return dif === 0;
}

/**
 * Hash de clave: HMAC-SHA-256 con sal y PEPPER, iterado.
 * Formato guardado:  v1$<iteraciones>$<sal>$<hash>
 */
function _hashClave_(clave, sal, iteraciones) {
  var pepper = _secreto_('PEPPER');
  var iter = iteraciones || HASH_ITER;
  var semilla = Utilities.newBlob(sal + '|' + clave + '|' + pepper).getBytes();
  var h = Utilities.computeHmacSha256Signature(semilla, sal + pepper);
  for (var i = 0; i < iter; i++) {
    h = Utilities.computeHmacSha256Signature(h, sal + pepper);
  }
  return 'v1$' + iter + '$' + sal + '$' + Utilities.base64EncodeWebSafe(h).replace(/=+$/, '');
}

function _nuevaSal_() {
  return Utilities.base64EncodeWebSafe(Utilities.getUuid().replace(/-/g, '')).replace(/=+$/, '').substring(0, 16);
}

function _crearHashClave_(clave) {
  var sal = _nuevaSal_();
  return _hashClave_(clave, sal, HASH_ITER);
}

function _verificarClave_(clave, guardado) {
  if (!guardado) return false;
  var partes = String(guardado).split('$');
  if (partes.length !== 4 || partes[0] !== 'v1') return false;
  var iter = parseInt(partes[1], 10) || HASH_ITER;
  var sal = partes[2];
  return _iguales_(_hashClave_(clave, sal, iter).split('$')[3], partes[3]);
}

// Compatibilidad con el hash antiguo sin sal (SHA-256 en hexadecimal).
function _sha256Hex_(texto) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] < 0 ? bytes[i] + 256 : bytes[i]).toString(16);
    out += (b.length === 1 ? '0' : '') + b;
  }
  return out;
}

function _crearToken_(tipo, sub, extra) {
  var ahora = Math.floor(Date.now() / 1000);
  var payload = {
    t: tipo,
    s: String(sub == null ? '' : sub),
    exp: ahora + SESION_HORAS * 3600,
    iat: ahora
  };
  if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
  var cabecera = _b64url_(JSON.stringify({ alg: 'HS256', typ: 'CRM' }));
  var cuerpo = _b64url_(JSON.stringify(payload));
  return cabecera + '.' + cuerpo + '.' + _hmac_(cabecera + '.' + cuerpo);
}

function _verificarToken_(token) {
  if (!token || typeof token !== 'string') _cortar_(401, 'Sesión requerida.');
  var partes = token.split('.');
  if (partes.length !== 3) _cortar_(401, 'Sesión inválida.');
  if (!_iguales_(_hmac_(partes[0] + '.' + partes[1]), partes[2])) _cortar_(401, 'Sesión inválida.');
  var payload;
  try { payload = JSON.parse(_deB64url_(partes[1])); }
  catch (e) { _cortar_(401, 'Sesión inválida.'); }
  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    _cortar_(401, 'Su sesión expiró. Vuelva a ingresar.');
  }
  return payload;
}

// ============================================================================
// 6. BLOQUEO POR INTENTOS Y AUDITORÍA
// ============================================================================

function _claveCache_(email) { return 'log:' + String(email).toLowerCase(); }

function _estaBloqueado_(email) {
  return CacheService.getScriptCache().get(_claveCache_(email)) !== null;
}

function _minutosRestantes_(email) {
  var v = CacheService.getScriptCache().get(_claveCache_(email));
  return v ? Math.max(1, Math.round(parseInt(v, 10) / 60)) : 0;
}

function _registrarFallo_(email) {
  var cache = CacheService.getScriptCache();
  var k = 'f:' + String(email).toLowerCase();
  var n = parseInt(cache.get(k) || '0', 10) + 1;
  cache.put(k, String(n), BLOQUEO_MINUTOS * 60);
  if (n >= MAX_INTENTOS) {
    cache.put(_claveCache_(email), String(BLOQUEO_MINUTOS * 60), BLOQUEO_MINUTOS * 60);
    cache.remove(k);
  }
  return n;
}

function _limpiarFallos_(email) {
  var cache = CacheService.getScriptCache();
  cache.remove('f:' + String(email).toLowerCase());
  cache.remove(_claveCache_(email));
}

function _auditar_(accion, detalle, quien) {
  try {
    var hoja = _hoja_('Auditoria', true);
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1, 1, 5).setValues([['Fecha', 'Usuario', 'Accion', 'Tabla', 'Detalle']]);
    }
    hoja.appendRow([new Date(), quien || 'sistema', accion, '', String(detalle || '').substring(0, 500)]);
  } catch (e) {
    console.warn('No se pudo auditar: ' + e);
  }
}

// ============================================================================
// 7. LOGIN DEL EQUIPO
// ============================================================================

function _loginEquipo_(datos) {
  var email = String(datos.email || '').trim();
  var clave = String(datos.password || '');
  if (!email || !clave) _cortar_(400, 'Indique correo y clave.');
  if (_estaBloqueado_(email)) {
    _cortar_(429, 'Demasiados intentos fallidos. Espere ' + _minutosRestantes_(email) + ' minutos e intente de nuevo.');
  }

  var tabla = _leer_('Usuarios');
  var fila = _buscarPorEmail_(tabla.filas, email, ['Email', 'Correo', 'email']);

  if (!fila) {
    _crearHashClave_(clave);            // mismo costo de cálculo: no se filtra qué correos existen
    _registrarFallo_(email);
    _auditar_('login_fallido', 'Correo no registrado', email);
    _cortar_(401, 'Correo o clave incorrectos.');
  }
  if (!_activo_(fila.Activo)) {
    _auditar_('login_desactivado', 'Usuario inactivo', email);
    _cortar_(403, 'Su acceso está desactivado. Contacte al administrador.');
  }

  var guardado = fila.PassHash;
  var ok = false;
  var migrado = false;

  if (guardado) {
    ok = _verificarClave_(clave, guardado);
  } else if (fila.PasswordHash) {
    // Migración desde el CRM antiguo (SHA-256 sin sal): se acepta una vez y se
    // reemplaza por el hash nuevo con sal.
    ok = _iguales_(String(fila.PasswordHash).toLowerCase(), _sha256Hex_(clave));
    migrado = ok;
  } else if (fila.PlainPassword || fila.password || fila.Password) {
    ok = String(fila.PlainPassword || fila.password || fila.Password) === clave;
    migrado = ok;
  }

  if (!ok) {
    var n = _registrarFallo_(email);
    _auditar_('login_fallido', 'Clave incorrecta (intento ' + n + ')', email);
    var restantes = MAX_INTENTOS - n;
    _cortar_(401, restantes > 0
      ? 'Correo o clave incorrectos.'
      : 'Demasiados intentos fallidos. La cuenta quedó bloqueada por ' + BLOQUEO_MINUTOS + ' minutos.');
  }

  var debeCambiar = false;
  if (migrado) {
    var headers = tabla.headers.slice();
    headers = _asegurarColumnas_(tabla.hoja, headers, ['PassHash', 'DebeCambiarClave']);
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PassHash', _crearHashClave_(clave));
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'DebeCambiarClave', 'SI');
    [_escribirCelda_(tabla.hoja, headers, fila.__fila, 'PlainPassword', ''),
     _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PasswordHash', ''),
     _escribirCelda_(tabla.hoja, headers, fila.__fila, 'password', ''),
     _escribirCelda_(tabla.hoja, headers, fila.__fila, 'Password', '')];
    debeCambiar = true;
  } else {
    debeCambiar = _esDebeCambiar_(fila.DebeCambiarClave);
  }

  _limpiarFallos_(email);
  _auditar_('login', 'Ingreso correcto', email);

  var rol = String(fila.Rol || 'Colaborador');
  return {
    token: _crearToken_('equipo', fila.ID || email, { e: email, r: rol, n: _nombreDe_(fila) }),
    debeCambiarClave: debeCambiar,
    user: {
      email: _emailDe_(fila),
      nombre: _nombreDe_(fila),
      rol: rol,
      avatar: fila.Avatar || fila.avatar || ''
    }
  };
}

function _esDebeCambiar_(v) {
  if (v === undefined || v === null || v === '') return false;
  if (v === true) return true;
  var s = String(v).trim().toLowerCase();
  return ['si', 'sí', 'true', '1', 'yes', 'x'].indexOf(s) !== -1;
}

function _nombreDe_(fila) {
  return String(fila.Nombre || fila.nombre || _emailDe_(fila) || 'Usuario');
}

function _emailDe_(fila) {
  return String(fila.Email || fila.Correo || fila.email || '');
}

function _buscarPorEmail_(filas, valor, columnas) {
  var objetivo = String(valor).trim().toLowerCase();
  for (var i = 0; i < filas.length; i++) {
    for (var c = 0; c < columnas.length; c++) {
      var v = filas[i][columnas[c]];
      if (v !== undefined && v !== null && String(v).trim().toLowerCase() === objetivo) return filas[i];
    }
  }
  return null;
}

function _buscarPorIdentidad_(filas, valor, columnasEmail, columnasRut) {
  var objetivo = String(valor).trim().toLowerCase();
  var objetivoRut = objetivo.replace(/[.\s]/g, '');
  for (var i = 0; i < filas.length; i++) {
    var f = filas[i];
    for (var c = 0; c < columnasEmail.length; c++) {
      var v = f[columnasEmail[c]];
      if (v !== undefined && v !== null && String(v).trim().toLowerCase() === objetivo) return f;
    }
    for (var r = 0; r < columnasRut.length; r++) {
      var w = f[columnasRut[r]];
      if (w !== undefined && w !== null && String(w).trim().toLowerCase().replace(/[.\s]/g, '') === objetivoRut) return f;
    }
  }
  return null;
}

function _escribirCelda_(hoja, headers, filaNum, columna, valor) {
  var idx = headers.indexOf(columna);
  if (idx === -1) return false;
  var celda = hoja.getRange(filaNum, idx + 1);
  var actual = celda.getFormula();
  if (actual && actual.charAt(0) === '=') return false; // nunca se pisa una fórmula
  celda.setValue(_celdaSegura_(valor));
  return true;
}

// ============================================================================
// 8. CAMBIO DE CLAVE
// ============================================================================

function _cambiarClavePropia_(datos) {
  var payload = _verificarToken_(datos.token);
  if (payload.t !== 'equipo') _cortar_(401, 'Sesión no válida para esta acción.');

  var actual = String(datos.actual || '');
  var nueva = String(datos.nueva || '');
  if (nueva.length < MIN_LARGO_CLAVE) _cortar_(400, 'La clave nueva debe tener al menos ' + MIN_LARGO_CLAVE + ' caracteres.');
  if (nueva === actual) _cortar_(400, 'La clave nueva debe ser distinta de la actual.');

  var tabla = _leer_('Usuarios');
  var fila = _filaPorToken_(tabla, payload);
  if (!fila) _cortar_(401, 'Su usuario ya no existe.');

  var guardado = fila.PassHash;
  var ok = guardado ? _verificarClave_(actual, guardado)
                    : _iguales_(String(fila.PasswordHash || '').toLowerCase(), _sha256Hex_(actual));
  if (!ok) _cortar_(403, 'La clave actual no es correcta.');

  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(), ['PassHash', 'DebeCambiarClave']);
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PassHash', _crearHashClave_(nueva));
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'DebeCambiarClave', 'NO');
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PlainPassword', '');
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PasswordHash', '');
  _auditar_('cambio_clave', 'El usuario cambió su clave', _emailDe_(fila));

  return {
    token: _crearToken_('equipo', fila.ID || _emailDe_(fila), {
      e: _emailDe_(fila), r: String(fila.Rol || 'Colaborador'), n: _nombreDe_(fila)
    })
  };
}

function _filaPorToken_(tabla, payload) {
  var email = payload.e || '';
  if (email) {
    var f = _buscarPorEmail_(tabla.filas, email, ['Email', 'Correo', 'email']);
    if (f) return f;
  }
  if (payload.s) {
    for (var i = 0; i < tabla.filas.length; i++) {
      if (String(tabla.filas[i].ID || '') === String(payload.s)) return tabla.filas[i];
    }
  }
  return null;
}

/** Carga el integrante del equipo desde el token y vuelve a comprobar rol y estado. */
function _equipoAutenticado_(token) {
  var payload = _verificarToken_(token);
  if (payload.t !== 'equipo') _cortar_(401, 'Sesión no válida para esta acción.');

  var tabla = _leer_('Usuarios');
  var fila = _filaPorToken_(tabla, payload);
  if (!fila) _cortar_(401, 'Su usuario ya no existe.');
  if (!_activo_(fila.Activo)) _cortar_(401, 'Su acceso está desactivado.');

  return {
    fila: fila,
    tabla: tabla,
    email: _emailDe_(fila),
    nombre: _nombreDe_(fila),
    rol: String(fila.Rol || 'Colaborador'),
    admin: _esAdmin_(fila.Rol),
    debeCambiar: _esDebeCambiar_(fila.DebeCambiarClave)
  };
}

// ============================================================================
// 9. ADMINISTRACIÓN DE CLAVES
// ============================================================================

function _claveTemporal_(largo) {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  var s = '';
  for (var i = 0; i < (largo || 12); i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function _adminClaveUsuario_(datos) {
  var quien = _equipoAutenticado_(datos.token);
  if (!quien.admin) _cortar_(403, 'Solo un administrador puede generar claves.');

  var email = String(datos.email || '').trim();
  if (!email) _cortar_(400, 'Indique el correo del integrante.');
  var clave = String(datos.password || '') || _claveTemporal_(12);
  if (clave.length < MIN_LARGO_CLAVE) _cortar_(400, 'La clave debe tener al menos ' + MIN_LARGO_CLAVE + ' caracteres.');

  var tabla = _leer_('Usuarios');
  var fila = _buscarPorEmail_(tabla.filas, email, ['Email', 'Correo', 'email']);
  if (!fila) _cortar_(404, 'No hay un integrante con el correo ' + email + '.');

  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(), ['PassHash', 'DebeCambiarClave']);
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PassHash', _crearHashClave_(clave));
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'DebeCambiarClave', 'SI');
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PlainPassword', '');
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PasswordHash', '');
  _auditar_('admin_clave_usuario', 'Clave regenerada para ' + email, quien.email);

  return { email: email, passwordTemporal: datos.password ? undefined : clave };
}

function _adminClaveResidente_(datos) {
  var quien = _equipoAutenticado_(datos.token);
  if (!quien.admin) _cortar_(403, 'Solo un administrador puede generar claves.');

  var ident = String(datos.email || '').trim();
  if (!ident) _cortar_(400, 'Indique el correo o RUT del residente.');
  var clave = String(datos.password || '') || _claveTemporal_(12);
  if (clave.length < MIN_LARGO_CLAVE) _cortar_(400, 'La clave debe tener al menos ' + MIN_LARGO_CLAVE + ' caracteres.');

  var perfiles = [
    { tabla: 'Copropietarios', tipo: 'residente', email: ['Email', 'Correo', 'email'], rut: ['RUT', 'Rut', 'rut'] },
    { tabla: 'ContratosArriendo', tipo: 'arrendatario', email: ['Email Arrendatario', 'Email', 'email'], rut: ['RUT Arrendatario', 'RUT', 'Rut'] },
    { tabla: 'Propiedades', tipo: 'propietario', email: ['Email Propietario', 'Email', 'email'], rut: ['RUT Propietario', 'RUT', 'Rut'] }
  ];

  for (var i = 0; i < perfiles.length; i++) {
    var p = perfiles[i];
    if (!_existeHoja_(p.tabla)) continue;
    var tabla = _leer_(p.tabla);
    var fila = _buscarPorIdentidad_(tabla.filas, ident, p.email, p.rut);
    if (!fila) continue;

    var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(), ['PassHash', 'DebeCambiarClave']);
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PassHash', _crearHashClave_(clave));
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'DebeCambiarClave', 'SI');
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PlainPassword', '');
    _auditar_('admin_clave_residente', 'Clave regenerada para ' + ident + ' (' + p.tabla + ')', quien.email);

    return { tipo: p.tipo, tabla: p.tabla, email: ident, passwordTemporal: datos.password ? undefined : clave };
  }
  _cortar_(404, 'No se encontró a ' + ident + ' en Copropietarios, ContratosArriendo ni Propiedades.');
}

/** Desde el editor de Apps Script: primer administrador. */
function claveTemporalUsuario(email) {
  var tabla = _leer_('Usuarios');
  var fila = _buscarPorEmail_(tabla.filas, email, ['Email', 'Correo', 'email']);
  if (!fila) throw new Error('No hay un integrante con el correo ' + email + '.');
  var clave = _claveTemporal_(12);
  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(), ['PassHash', 'DebeCambiarClave']);
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PassHash', _crearHashClave_(clave));
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'DebeCambiarClave', 'SI');
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PlainPassword', '');
  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PasswordHash', '');
  Logger.log('Clave temporal para %s : %s', email, clave);
  return clave;
}

/** Desde el editor: clave temporal para un residente (Copropietarios / ContratosArriendo / Propiedades). */
function claveTemporalPara(ident) {
  var perfiles = [
    { tabla: 'Copropietarios', email: ['Email', 'Correo', 'email'], rut: ['RUT', 'Rut', 'rut'] },
    { tabla: 'ContratosArriendo', email: ['Email Arrendatario', 'Email'], rut: ['RUT Arrendatario', 'RUT'] },
    { tabla: 'Propiedades', email: ['Email Propietario', 'Email'], rut: ['RUT Propietario', 'RUT'] }
  ];
  for (var i = 0; i < perfiles.length; i++) {
    var p = perfiles[i];
    if (!_existeHoja_(p.tabla)) continue;
    var tabla = _leer_(p.tabla);
    var fila = _buscarPorIdentidad_(tabla.filas, ident, p.email, p.rut);
    if (!fila) continue;
    var clave = _claveTemporal_(12);
    var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(), ['PassHash', 'DebeCambiarClave']);
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PassHash', _crearHashClave_(clave));
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'DebeCambiarClave', 'SI');
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'PlainPassword', '');
    Logger.log('Clave temporal para %s (%s): %s', ident, p.tabla, clave);
    return clave;
  }
  throw new Error('No se encontró a ' + ident + ' en Copropietarios, ContratosArriendo ni Propiedades.');
}

// ============================================================================
// 10. RUTA DE DATOS (CRUD DEL EQUIPO)
// ============================================================================

function _rutaDatos_(datos) {
  var quien = _equipoAutenticado_(datos.token);

  var tablaNombre = String(datos.table || '').trim();
  var accion = String(datos.action || 'Find').trim().toLowerCase();
  if (!tablaNombre) _cortar_(400, 'Falta la tabla.');

  if (_enLista_(TABLAS_PROHIBIDAS, tablaNombre)) {
    _cortar_(403, 'La pestaña ' + tablaNombre + ' no está disponible desde el CRM.');
  }

  var permiso = _permiso_(tablaNombre);
  if (!permiso) _cortar_(403, 'La pestaña ' + tablaNombre + ' no está autorizada en POLICY.');

  if (quien.debeCambiar) {
    _cortar_(403, 'Debe cambiar su clave antes de usar el CRM.');
  }

  var esBorrar = (accion === 'delete');
  var requerido = esBorrar ? permiso.borrar : (accion === 'find' ? permiso.leer : permiso.escribir);
  if (!_rolPermitido_(requerido, quien)) {
    _cortar_(403, esBorrar ? 'Solo un administrador puede borrar registros.' : 'Su rol no tiene permiso sobre ' + tablaNombre + '.');
  }

  var tabla = _leer_(tablaNombre);

  if (accion === 'find') return _find_(tabla, datos.filter, quien);
  if (accion === 'add') return _add_(tabla, datos.rows, quien, tablaNombre);
  if (accion === 'edit') return _edit_(tabla, datos.rows, quien, tablaNombre);
  if (accion === 'delete') return _delete_(tabla, datos.rows, quien, tablaNombre);

  _cortar_(400, 'Acción no reconocida: ' + datos.action);
}

function _enLista_(lista, valor) {
  var v = String(valor).toLowerCase();
  for (var i = 0; i < lista.length; i++) if (String(lista[i]).toLowerCase() === v) return true;
  return false;
}

function _permiso_(tablaNombre) {
  for (var k in POLICY) {
    if (Object.prototype.hasOwnProperty.call(POLICY, k) && String(k).toLowerCase() === String(tablaNombre).toLowerCase()) {
      return POLICY[k];
    }
  }
  return null;
}

function _rolPermitido_(requerido, quien) {
  if (requerido === undefined || requerido === null) return false;
  if (requerido === 'admin') return quien.admin;
  if (requerido === 'equipo') return true;
  if (Object.prototype.toString.call(requerido) === '[object Array]') {
    var rol = String(quien.rol).toLowerCase();
    for (var i = 0; i < requerido.length; i++) {
      if (String(requerido[i]).toLowerCase() === rol) return true;
    }
    return quien.admin;
  }
  return false;
}

function _find_(tabla, filtro, quien) {
  var filas = tabla.filas;
  if (filtro && filtro.column && filtro.value !== undefined) {
    var col = String(filtro.column);
    var val = String(filtro.value).trim().toLowerCase();
    filas = filas.filter(function (f) {
      return f[col] !== undefined && String(f[col]).trim().toLowerCase() === val;
    });
  }
  return filas.map(function (f) { return _quitarPrivadas_(f, quien.admin); });
}

function _add_(tabla, rows, quien, tablaNombre) {
  if (!rows || !rows.length) _cortar_(400, 'No hay filas para agregar.');
  var headers = tabla.headers.slice();
  if (!headers.length) {
    // Pestaña sin encabezados: se crean con las claves de la primera fila.
    headers = Object.keys(_limpiarEntrada_(rows[0]));
    if (!headers.length) _cortar_(400, 'La fila no tiene columnas.');
    tabla.hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  headers = _asegurarColumnasDeFilas_(tabla.hoja, headers, rows);
  var keyName = _nombreClave_(headers);
  var hoja = tabla.hoja;
  var creados = [];
  var usados = {};

  // Índice de claves ya existentes, para no duplicar IDs.
  for (var i = 0; i < tabla.filas.length; i++) {
    var k = _claveDe_(tabla.filas[i], headers, keyName);
    if (k !== null) usados[String(k)] = true;
  }

  for (var r = 0; r < rows.length; r++) {
    var entrada = _limpiarEntrada_(rows[r]);
    if (keyName) {
      var id = _claveDe_(entrada, headers, keyName);
      if (id === null || id === '' || usados[String(id)]) {
        do { id = _nuevoId_(); } while (usados[id]);
        entrada[keyName] = id;
      }
      usados[String(id)] = true;
    }
    var valores = headers.map(function (h) {
      return _celdaSegura_(entrada[h] === undefined ? '' : entrada[h]);
    });
    hoja.appendRow(valores);
    creados.push(entrada);
  }

  _auditar_('add', tablaNombre + ': ' + creados.length + ' fila(s)', quien.email);
  return { Rows: creados.map(function (f) { return _quitarPrivadas_(f, quien.admin); }) };
}

function _edit_(tabla, rows, quien, tablaNombre) {
  if (!rows || !rows.length) _cortar_(400, 'No hay filas para editar.');
  var headers = tabla.headers.slice();
  var keyName = _nombreClave_(headers);
  if (!keyName) _cortar_(400, 'La pestaña ' + tablaNombre + ' no tiene columna de identificación (ID).');

  var hoja = tabla.hoja;
  var actualizados = 0;
  var noEncontrados = [];

  for (var r = 0; r < rows.length; r++) {
    var entrada = _limpiarEntrada_(rows[r]);
    var id = _claveDe_(entrada, headers, keyName);
    if (id === null || id === '') { noEncontrados.push('(sin ' + keyName + ')'); continue; }

    var destino = null;
    for (var i = 0; i < tabla.filas.length; i++) {
      if (String(_claveDe_(tabla.filas[i], headers, keyName)) === String(id)) { destino = tabla.filas[i]; break; }
    }

    if (!destino) {
      // Alta implícita: la fila se borró o nunca llegó a guardarse.
      var valoresNuevos = headers.map(function (h) {
        return _celdaSegura_(entrada[h] === undefined ? '' : entrada[h]);
      });
      hoja.appendRow(valoresNuevos);
      actualizados++;
      continue;
    }

    for (var c = 0; c < headers.length; c++) {
      var col = headers[c];
      if (col === '__fila') continue;
      if (entrada[col] === undefined) continue;
      if (COLUMNAS_SECRETAS.indexOf(col) !== -1) continue; // nunca se aceptan desde el navegador
      _escribirCelda_(hoja, headers, destino.__fila, col, entrada[col]);
    }
    actualizados++;
  }

  _auditar_('edit', tablaNombre + ': ' + actualizados + ' fila(s)' +
    (noEncontrados.length ? ' (sin clave: ' + noEncontrados.join(', ') + ')' : ''), quien.email);
  return { Rows: [], actualizados: actualizados };
}

function _delete_(tabla, rows, quien, tablaNombre) {
  if (!rows || !rows.length) _cortar_(400, 'No hay filas para borrar.');
  var headers = tabla.headers.slice();
  var keyName = _nombreClave_(headers);
  if (!keyName) _cortar_(400, 'La pestaña ' + tablaNombre + ' no tiene columna de identificación (ID).');

  var objetivos = {};
  for (var r = 0; r < rows.length; r++) {
    var id = _claveDe_(rows[r], headers, keyName);
    if (id !== null && id !== '') objetivos[String(id)] = true;
  }

  var numeroFilas = [];
  for (var i = 0; i < tabla.filas.length; i++) {
    if (objetivos[String(_claveDe_(tabla.filas[i], headers, keyName))]) numeroFilas.push(tabla.filas[i].__fila);
  }
  if (!numeroFilas.length) _cortar_(404, 'No se encontró ninguna fila con esos identificadores.');

  numeroFilas.sort(function (a, b) { return b - a; }); // de abajo hacia arriba
  var hoja = tabla.hoja;
  for (var j = 0; j < numeroFilas.length; j++) hoja.deleteRow(numeroFilas[j]);

  _auditar_('delete', tablaNombre + ': ' + numeroFilas.length + ' fila(s)', quien.email);
  return { Rows: [], borrados: numeroFilas.length };
}

function _limpiarEntrada_(obj) {
  var salida = {};
  if (!obj || typeof obj !== 'object') return salida;
  for (var k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if (k === '__fila') continue;
    salida[k] = obj[k];
  }
  return salida;
}

// ============================================================================
// 11. PORTAL DE RESIDENTES
// ============================================================================

function _loginResidente_(datos) {
  var ident = String(datos.email || '').trim();
  var clave = String(datos.password || '');
  var tipo = String(datos.tipo || 'residente').toLowerCase();
  if (TIPOS_RESIDENTE.indexOf(tipo) === -1) tipo = 'residente';
  if (!ident || !clave) _cortar_(400, 'Indique su correo (o RUT) y su clave.');

  var etiqueta = 'res:' + tipo + ':' + ident.toLowerCase();
  if (_estaBloqueado_(etiqueta)) {
    _cortar_(429, 'Demasiados intentos fallidos. Espere ' + _minutosRestantes_(etiqueta) + ' minutos.');
  }

  var perfil = _perfilesResidente_()[tipo];
  var tabla = _leer_(perfil.tabla);
  var fila = _buscarPorIdentidad_(tabla.filas, ident, perfil.email, perfil.rut);

  if (!fila) {
    _crearHashClave_(clave);
    _registrarFallo_(etiqueta);
    _auditar_('res_login_fallido', 'No encontrado (' + perfil.tabla + ')', ident);
    _cortar_(401, 'Usuario o clave incorrectos.');
  }
  if (!_activo_(fila.Activo)) {
    _auditar_('res_login_desactivado', 'Residente inactivo', ident);
    _cortar_(403, 'Su acceso está desactivado. Contacte a la administración.');
  }

  var guardado = fila.PassHash;
  if (!guardado || !_verificarClave_(clave, guardado)) {
    var n = _registrarFallo_(etiqueta);
    _auditar_('res_login_fallido', 'Clave incorrecta en ' + perfil.tabla + ' (intento ' + n + ')', ident);
    _cortar_(401, 'Usuario o clave incorrectos.');
  }

  _limpiarFallos_(etiqueta);
  _auditar_('res_login', 'Ingreso al portal (' + tipo + ')', ident);

  return {
    token: _crearToken_('residente', fila.ID || ident, {
      tipo: tipo,
      tabla: perfil.tabla,
      e: String(fila[perfil.email[0]] || ident)
    }),
    tipo: tipo,
    persona: _quitarPrivadasResidente_(
      Object.assign({}, fila, { Nombre: _nombreResidente_(fila, perfil), Tipo: tipo })
    )
  };
}

function _perfilesResidente_() {
  return {
    residente: {
      tabla: 'Copropietarios',
      email: ['Email', 'Correo', 'email'],
      rut: ['RUT', 'Rut', 'rut']
    },
    arrendatario: {
      tabla: 'ContratosArriendo',
      email: ['Email Arrendatario', 'Email', 'Correo', 'email'],
      rut: ['RUT Arrendatario', 'RUT', 'Rut']
    },
    propietario: {
      tabla: 'Propiedades',
      email: ['Email Propietario', 'Email', 'Correo', 'email'],
      rut: ['RUT Propietario', 'RUT', 'Rut']
    }
  };
}

function _nombreResidente_(fila, perfil) {
  var candidatos = ['Nombre', 'Nombre Completo', 'Propietario', 'Arrendatario',
    'Nombre Propietario', 'Nombre Arrendatario', 'nombre'];
  for (var i = 0; i < candidatos.length; i++) {
    var v = fila[candidatos[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return String(fila[perfil.email[0]] || 'Usuario');
}

function _residenteAutenticado_(token) {
  var payload = _verificarToken_(token);
  if (payload.t !== 'residente') _cortar_(401, 'Sesión no válida para el portal.');
  var tipo = payload.tipo || 'residente';
  var perfil = _perfilesResidente_()[tipo] || _perfilesResidente_().residente;

  var tabla = _leer_(perfil.tabla);
  var fila = null;
  if (payload.s) {
    for (var i = 0; i < tabla.filas.length; i++) {
      if (String(tabla.filas[i].ID || '') === String(payload.s)) { fila = tabla.filas[i]; break; }
    }
  }
  if (!fila && payload.e) fila = _buscarPorIdentidad_(tabla.filas, payload.e, perfil.email, perfil.rut);
  if (!fila) _cortar_(401, 'Su registro ya no existe. Contacte a la administración.');
  if (!_activo_(fila.Activo)) _cortar_(401, 'Su acceso está desactivado.');

  return { payload: payload, tipo: tipo, perfil: perfil, persona: fila };
}

function _portalResidente_(datos) {
  var ses = _residenteAutenticado_(datos.token);
  var persona = ses.persona;
  var nombre = _nombreResidente_(persona, ses.perfil);

  var personaPublica = _quitarPrivadasResidente_(
    Object.assign({}, persona, { Nombre: nombre, Tipo: ses.tipo })
  );

  var perfil = {
    tipo: ses.tipo,
    persona: personaPublica,
    residente: personaPublica,   // alias: el portal móvil usa PORTAL.residente
    unidades: [],
    copropiedades: [],
    cobros: [], pagos: [], reclamos: [], gastosComunes: [], gastos: [],
    reservas: [], espacios: [], bloques: [], proveedores: [],
    propiedades: [], visitas: [], contrato: null, pagosArriendo: []
  };

  // ---- Propietario de corretaje: sus propiedades y las visitas recibidas ----
  if (ses.tipo === 'propietario') {
    perfil.propiedades = _leerSeguro_('Propiedades').filas
      .filter(function (p) { return _esDelPropietario_(p, persona); })
      .map(_quitarPrivadasResidente_);
    var idsProps = perfil.propiedades.map(function (p) { return String(p.ID); });
    perfil.visitas = _leerSeguro_('Visitas').filas
      .filter(function (v) { return idsProps.indexOf(String(v.PropiedadID)) !== -1; })
      .map(_quitarPrivadasResidente_);
    return perfil;
  }

  // ---- Arrendatario: su contrato y sus pagos de arriendo ----
  if (ses.tipo === 'arrendatario') {
    var contratos = _leerSeguro_('ContratosArriendo').filas.filter(function (c) {
      return _esDelArrendatario_(c, persona);
    });
    var vigente = null;
    for (var i = 0; i < contratos.length; i++) {
      var est = String(contratos[i].Estado || '').toLowerCase();
      if (est.indexOf('termin') === -1 && est.indexOf('finaliz') === -1) { vigente = contratos[i]; break; }
    }
    if (!vigente && contratos.length) vigente = contratos[0];

    if (vigente) {
      perfil.contrato = {
        id: String(vigente.ID || ''),
        unidadId: String(vigente.UnidadID || ''),
        propiedadId: String(vigente.PropiedadID || ''),
        direccion: String(vigente.Direccion || vigente['Dirección'] || vigente.Propiedad || ''),
        monto: _numero_(vigente['Monto Arriendo'] || vigente.Monto || vigente.Arriendo || 0),
        diaPago: _numero_(vigente['Dia Pago'] || vigente.DiaPago || vigente['Día Pago'] || 5),
        nombre: _nombreResidente_(vigente, ses.perfil),
        estado: String(vigente.Estado || ''),
        urlContrato: String(vigente.ContratoURL || vigente['URL Contrato'] || ''),
        fechaInicio: vigente['Fecha Inicio'] || vigente.FechaInicio || '',
        fechaFin: vigente['Fecha Fin'] || vigente.FechaFin || ''
      };
    }
  }

  // ---- Unidades: para el residente, las suyas; para el arrendatario, la del contrato ----
  var idsUnidades = _unidadesDe_(ses).map(function (u) { return String(u.ID); });
  if (perfil.contrato && perfil.contrato.unidadId) idsUnidades.push(perfil.contrato.unidadId);
  idsUnidades = idsUnidades.filter(function (v, k, a) { return v && a.indexOf(v) === k; });

  var todasUnidades = _leerSeguro_('Unidades').filas;
  var todasCopropiedades = _leerSeguro_('Copropiedades').filas;

  perfil.unidades = todasUnidades
    .filter(function (u) { return idsUnidades.indexOf(String(u.ID)) !== -1; })
    .map(_quitarPrivadasResidente_);

  var idsCopropiedades = [];
  perfil.unidades.forEach(function (u) {
    if (u.CopropiedadID && idsCopropiedades.indexOf(String(u.CopropiedadID)) === -1) {
      idsCopropiedades.push(String(u.CopropiedadID));
    }
  });
  if (!idsCopropiedades.length && persona.CopropiedadID) idsCopropiedades.push(String(persona.CopropiedadID));

  perfil.copropiedades = todasCopropiedades
    .filter(function (c) { return idsCopropiedades.indexOf(String(c.ID)) !== -1; })
    .map(_quitarPrivadasResidente_);

  // ---- Movimientos de esas unidades y de esas copropiedades ----
  function porUnidad(nombreTabla, campo) {
    return _leerSeguro_(nombreTabla).filas
      .filter(function (r) { return idsUnidades.indexOf(String(r[campo])) !== -1; })
      .map(_quitarPrivadasResidente_);
  }
  function porCopropiedad(nombreTabla, campo) {
    return _leerSeguro_(nombreTabla).filas
      .filter(function (r) { return idsCopropiedades.indexOf(String(r[campo])) !== -1; })
      .map(_quitarPrivadasResidente_);
  }

  perfil.cobros = porUnidad('Cobros', 'UnidadID');
  perfil.pagos = porUnidad('Pagos', 'UnidadID');
  perfil.reclamos = porUnidad('Reclamos', 'UnidadID');
  perfil.reservas = porUnidad('Reservas', 'UnidadID');
  perfil.gastosComunes = porCopropiedad('GastosComunes', 'CopropiedadID');
  perfil.gastos = porCopropiedad('Gastos', 'CopropiedadID');
  perfil.espacios = porCopropiedad('Espacios', 'CopropiedadID');
  perfil.bloques = porCopropiedad('Bloques', 'CopropiedadID');
  perfil.proveedores = porCopropiedad('Proveedores', 'CopropiedadID');

  if (perfil.contrato) {
    var idContrato = perfil.contrato.id;
    perfil.pagosArriendo = _leerSeguro_('PagosArriendo').filas
      .filter(function (p) { return String(p.ContratoID || '') === idContrato; })
      .map(_quitarPrivadasResidente_);
  }

  return perfil;
}

function _esDelPropietario_(p, persona) {
  var idPersona = String(persona.ID || '');
  if (p.PropietarioID && idPersona && String(p.PropietarioID) === idPersona) return true;
  var email = String(persona.Email || persona.Correo || '').toLowerCase();
  if (email) {
    var candidatos = [p['Email Propietario'], p.Email];
    for (var i = 0; i < candidatos.length; i++) {
      if (candidatos[i] && String(candidatos[i]).toLowerCase() === email) return true;
    }
  }
  var rut = String(persona.RUT || '').replace(/[.\s]/g, '');
  if (rut) {
    var ruts = [p['RUT Propietario'], p.RUT];
    for (var j = 0; j < ruts.length; j++) {
      if (ruts[j] && String(ruts[j]).replace(/[.\s]/g, '') === rut) return true;
    }
  }
  return false;
}

function _esDelArrendatario_(c, persona) {
  var idPersona = String(persona.ID || '');
  if (c.ArrendatarioID && idPersona && String(c.ArrendatarioID) === idPersona) return true;
  var email = String(persona['Email Arrendatario'] || persona.Email || persona.Correo || '').toLowerCase();
  if (email) {
    var candidatos = [c['Email Arrendatario'], c.Email];
    for (var i = 0; i < candidatos.length; i++) {
      if (candidatos[i] && String(candidatos[i]).toLowerCase() === email) return true;
    }
  }
  var rut = String(persona['RUT Arrendatario'] || persona.RUT || '').replace(/[.\s]/g, '');
  if (rut) {
    var ruts = [c['RUT Arrendatario'], c.RUT];
    for (var j = 0; j < ruts.length; j++) {
      if (ruts[j] && String(ruts[j]).replace(/[.\s]/g, '') === rut) return true;
    }
  }
  return false;
}

function _unidadesDe_(ses) {
  if (ses.tipo !== 'residente') return [];
  var persona = ses.persona;
  var unidades = _leer_('Unidades').filas;
  var copropietarios = _leer_('Copropietarios').filas;

  var ids = [];
  function agregar(v) {
    if (v === undefined || v === null || v === '') return;
    var s = String(v).trim();
    if (s && ids.indexOf(s) === -1) ids.push(s);
  }

  // 1. Todas las filas de Copropietarios que son la misma persona.
  var email = String(persona.Email || persona.Correo || '').toLowerCase();
  var rut = String(persona.RUT || '').replace(/[.\s]/g, '');
  copropietarios.forEach(function (c) {
    var mismo = false;
    if (email && String(c.Email || c.Correo || '').toLowerCase() === email) mismo = true;
    if (!mismo && rut && String(c.RUT || '').replace(/[.\s]/g, '') === rut) mismo = true;
    if (mismo) { agregar(c.UnidadID); }
  });
  agregar(persona.UnidadID);

  // 2. Unidades que lo registran como propietario.
  var idPersona = String(persona.ID || '');
  if (idPersona) {
    unidades.forEach(function (u) {
      if (String(u.PropietarioID || '') === idPersona) agregar(u.ID);
    });
  }

  return unidades.filter(function (u) { return ids.indexOf(String(u.ID)) !== -1; });
}

// --- Acciones del residente -------------------------------------------------

function _reclamoResidente_(datos) {
  var ses = _residenteAutenticado_(datos.token);
  var unidades = _unidadesDe_(ses);

  if (ses.tipo === 'arrendatario') {
    // La unidad del arrendatario es la de su contrato vigente.
    var contratos = _leerSeguro_('ContratosArriendo').filas.filter(function (c) {
      return _esDelArrendatario_(c, ses.persona);
    });
    var ids = [];
    contratos.forEach(function (c) { if (c.UnidadID) ids.push(String(c.UnidadID)); });
    unidades = _leerSeguro_('Unidades').filas.filter(function (u) {
      return ids.indexOf(String(u.ID)) !== -1;
    });
  }
  if (!unidades.length) _cortar_(403, 'Su cuenta no tiene una unidad asociada.');

  var permitidas = unidades.map(function (u) { return String(u.ID); });
  var unidadId = String(datos.unidadId || '').trim();
  if (!unidadId) {
    if (permitidas.length === 1) unidadId = permitidas[0];
    else _cortar_(400, 'Indique la unidad.');
  }
  if (permitidas.indexOf(unidadId) === -1) _cortar_(403, 'La unidad indicada no le pertenece.');

  var descripcion = String(datos.descripcion || '').trim();
  if (!descripcion) _cortar_(400, 'Describa el problema.');
  if (descripcion.length > 2000) descripcion = descripcion.substring(0, 2000);

  var tabla = _leer_('Reclamos');
  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(),
    ['ID', 'CopropiedadID', 'UnidadID', 'UsuarioID', 'Categoria', 'Descripcion', 'Foto', 'Estado', 'Fecha', 'RespuestaAdmin', 'Historial']);

  var unidad = null;
  for (var i = 0; i < unidades.length; i++) if (String(unidades[i].ID) === unidadId) unidad = unidades[i];

  var id = _nuevoId_();
  var historial = [{ autor: 'user', nombre: _nombreResidente_(ses.persona, ses.perfil), texto: descripcion, fecha: new Date().toISOString() }];

  var fila = {
    ID: id,
    CopropiedadID: unidad ? String(unidad.CopropiedadID || '') : String(ses.persona.CopropiedadID || ''),
    UnidadID: unidadId,
    UsuarioID: String(ses.persona.ID || ''),
    Categoria: String(datos.categoria || 'Otro'),
    Descripcion: descripcion,
    Foto: String(datos.foto || ''),
    Estado: 'Pendiente',                     // el servidor fija el estado
    Fecha: Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd HH:mm:ss'),
    RespuestaAdmin: '',
    Historial: JSON.stringify(historial)
  };

  tabla.hoja.appendRow(headers.map(function (h) { return _celdaSegura_(fila[h] === undefined ? '' : fila[h]); }));
  _auditar_('res_reclamo', 'Nuevo reclamo en unidad ' + unidadId, String(ses.persona.Email || ses.persona.ID));

  return { Rows: [_quitarPrivadasResidente_(fila)] };
}

function _editarReclamoResidente_(datos) {
  var ses = _residenteAutenticado_(datos.token);
  var id = String(datos.id || '').trim();
  if (!id) _cortar_(400, 'Falta el reclamo.');

  var permitidas = _unidadesDe_(ses).map(function (u) { return String(u.ID); });
  if (ses.tipo === 'arrendatario') {
    _leerSeguro_('ContratosArriendo').filas.forEach(function (c) {
      if (_esDelArrendatario_(c, ses.persona) && c.UnidadID) permitidas.push(String(c.UnidadID));
    });
  }

  var tabla = _leer_('Reclamos');
  var headers = tabla.headers.slice();
  var fila = null;
  for (var i = 0; i < tabla.filas.length; i++) {
    if (String(tabla.filas[i].ID) === id) { fila = tabla.filas[i]; break; }
  }
  if (!fila) _cortar_(404, 'No encontramos ese reclamo.');
  if (permitidas.indexOf(String(fila.UnidadID)) === -1) {
    _cortar_(403, 'Ese reclamo no pertenece a su unidad.');
  }

  var historial = datos.historial;
  if (typeof historial === 'object') historial = JSON.stringify(historial);
  if (typeof historial !== 'string' || !historial) _cortar_(400, 'No hay respuesta que guardar.');
  if (historial.length > 20000) _cortar_(400, 'La respuesta es demasiado larga.');

  _escribirCelda_(tabla.hoja, headers, fila.__fila, 'Historial', historial);
  if (String(fila.Estado || '').toLowerCase() === 'pendiente') {
    _escribirCelda_(tabla.hoja, headers, fila.__fila, 'Estado', 'En Proceso');
  }
  _auditar_('res_reclamo_respuesta', 'Respuesta al reclamo ' + id, String(ses.persona.Email || ses.persona.ID));
  return { Rows: [], id: id };
}

function _pagoArriendoResidente_(datos) {
  var ses = _residenteAutenticado_(datos.token);
  if (ses.tipo !== 'arrendatario') _cortar_(403, 'Solo un arrendatario puede reportar pagos de arriendo.');

  var contratoId = String(datos.contratoId || '').trim();
  if (!contratoId) _cortar_(400, 'Falta el contrato.');

  var contratos = _leer_('ContratosArriendo').filas;
  var mio = null;
  for (var i = 0; i < contratos.length; i++) {
    if (String(contratos[i].ID) === contratoId && _esDelArrendatario_(contratos[i], ses.persona)) { mio = contratos[i]; break; }
  }
  if (!mio) _cortar_(403, 'Ese contrato no le pertenece.');

  var monto = _numero_(datos.monto);
  if (!(monto > 0)) _cortar_(400, 'Indique un monto válido.');
  var periodo = String(datos.periodo || '').trim();
  if (!periodo) _cortar_(400, 'Indique el período.');

  var tabla = _leer_('PagosArriendo', true);
  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(),
    ['ID', 'ContratoID', 'Periodo', 'Monto', 'Fecha Reporte', 'Estado']);

  var fila = {
    ID: _nuevoId_(),
    ContratoID: contratoId,
    Periodo: periodo,
    Monto: monto,
    'Fecha Reporte': Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd'),
    Estado: 'Pendiente'
  };
  tabla.hoja.appendRow(headers.map(function (h) { return _celdaSegura_(fila[h] === undefined ? '' : fila[h]); }));
  _auditar_('res_pago_arriendo', 'Pago reportado ' + periodo + ' contrato ' + contratoId, String(ses.persona.Email || ses.persona.ID));
  return { Rows: [fila] };
}

function _cambiarClaveResidente_(datos) {
  var ses = _residenteAutenticado_(datos.token);
  var actual = String(datos.actual || '');
  var nueva = String(datos.nueva || '');
  if (nueva.length < MIN_LARGO_CLAVE) _cortar_(400, 'La clave nueva debe tener al menos ' + MIN_LARGO_CLAVE + ' caracteres.');
  if (nueva === actual) _cortar_(400, 'La clave nueva debe ser distinta de la actual.');

  var guardado = ses.persona.PassHash;
  if (!guardado || !_verificarClave_(actual, guardado)) _cortar_(403, 'La clave actual no es correcta.');

  var tabla = _leer_(ses.perfil.tabla);
  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(), ['PassHash', 'DebeCambiarClave']);
  _escribirCelda_(tabla.hoja, headers, ses.persona.__fila, 'PassHash', _crearHashClave_(nueva));
  _escribirCelda_(tabla.hoja, headers, ses.persona.__fila, 'DebeCambiarClave', 'NO');
  _auditar_('res_cambio_clave', 'El residente cambió su clave', String(ses.persona.Email || ses.persona.ID));
  return { ok: true };
}

function _numero_(v) {
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// ============================================================================
// 12. RESERVAS Y PAGOS DEL RESIDENTE
// ============================================================================

function _reservaResidente_(datos) {
  var ses = _residenteAutenticado_(datos.token);

  var permitidas = _unidadesDe_(ses).map(function (u) { return String(u.ID); });
  if (ses.tipo === 'arrendatario') {
    _leerSeguro_('ContratosArriendo').filas.forEach(function (c) {
      if (_esDelArrendatario_(c, ses.persona) && c.UnidadID) permitidas.push(String(c.UnidadID));
    });
  }
  var unidadId = String(datos.unidadId || '').trim();
  if (!unidadId) {
    if (permitidas.length === 1) unidadId = permitidas[0];
    else _cortar_(400, 'Indique la unidad.');
  }
  if (permitidas.indexOf(unidadId) === -1) _cortar_(403, 'La unidad indicada no le pertenece.');

  var espacioId = String(datos.espacioId || '').trim();
  if (!espacioId) _cortar_(400, 'Elija un espacio.');

  // El espacio debe pertenecer a la copropiedad de la unidad del residente.
  var unidades = _leerSeguro_('Unidades').filas;
  var miUnidad = null;
  for (var i = 0; i < unidades.length; i++) if (String(unidades[i].ID) === unidadId) miUnidad = unidades[i];
  var copropiedadId = miUnidad ? String(miUnidad.CopropiedadID || '') : '';

  var espacios = _leerSeguro_('Espacios').filas;
  var espacio = null;
  for (var j = 0; j < espacios.length; j++) {
    if (String(espacios[j].ID) === espacioId) { espacio = espacios[j]; break; }
  }
  if (!espacio) _cortar_(404, 'Ese espacio no existe.');
  if (copropiedadId && String(espacio.CopropiedadID || '') !== copropiedadId) {
    _cortar_(403, 'Ese espacio no pertenece a su comunidad.');
  }
  if (espacio.Estado && String(espacio.Estado).toLowerCase() === 'inactivo') {
    _cortar_(409, 'Ese espacio no está disponible.');
  }

  var fecha = String(datos.fecha || '').trim();
  if (!fecha) _cortar_(400, 'Elija una fecha.');
  var bloque = String(datos.bloque || '').trim();
  var hora = String(datos.hora || bloque).trim();

  // Choque de reservas: mismo espacio, misma fecha y mismo bloque, sin cancelar.
  var reservas = _leerSeguro_('Reservas').filas;
  var choque = reservas.some(function (r) {
    var bloqueExistente = String(r.BloqueID || r.Hora || r.Bloque || '');
    return String(r.EspacioID) === espacioId &&
      String(r.Fecha) === fecha &&
      bloqueExistente === (bloque || hora) &&
      !/cancel|rechaz/i.test(String(r.Estado || ''));
  });
  if (choque) _cortar_(409, 'Ese bloque ya está reservado. Elija otro horario.');

  var tabla = _leer_('Reservas', true);
  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(),
    ['ID', 'EspacioID', 'EspacioNombre', 'CopropiedadID', 'UnidadID', 'UsuarioID',
     'Fecha', 'Hora', 'BloqueID', 'Costo', 'Garantia', 'Estado', 'EstadoPago',
     'Solicitante', 'Observaciones', 'FechaCreacion']);

  var fila = {
    ID: _nuevoId_(),
    EspacioID: espacioId,
    EspacioNombre: String(espacio.Nombre || ''),
    CopropiedadID: copropiedadId,
    UnidadID: unidadId,
    UsuarioID: String(ses.persona.ID || ''),
    Fecha: fecha,
    Hora: hora,
    BloqueID: bloque,
    Costo: _numero_(datos.costo),
    Garantia: _numero_(datos.garantia),
    Estado: 'Pendiente',                        // el servidor fija el estado
    EstadoPago: 'Pendiente',
    Solicitante: String(ses.persona.Nombre || ses.persona.Email || 'Residente'),
    Observaciones: String(datos.observaciones || '').substring(0, 500),
    FechaCreacion: Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd HH:mm:ss')
  };

  tabla.hoja.appendRow(headers.map(function (h) { return _celdaSegura_(fila[h] === undefined ? '' : fila[h]); }));
  _auditar_('res_reserva', 'Reserva de ' + (espacio.Nombre || espacioId) + ' el ' + fecha, String(ses.persona.Email || unidadId));
  return { Rows: [_quitarPrivadasResidente_(fila)] };
}

function _pagoResidente_(datos) {
  var ses = _residenteAutenticado_(datos.token);

  var permitidas = _unidadesDe_(ses).map(function (u) { return String(u.ID); });
  if (ses.tipo === 'arrendatario') {
    _leerSeguro_('ContratosArriendo').filas.forEach(function (c) {
      if (_esDelArrendatario_(c, ses.persona) && c.UnidadID) permitidas.push(String(c.UnidadID));
    });
  }
  var unidadId = String(datos.unidadId || '').trim();
  if (!unidadId) {
    if (permitidas.length === 1) unidadId = permitidas[0];
    else _cortar_(400, 'Indique la unidad.');
  }
  if (permitidas.indexOf(unidadId) === -1) _cortar_(403, 'La unidad indicada no le pertenece.');

  var monto = _numero_(datos.monto);
  if (!(monto > 0)) _cortar_(400, 'Indique el monto pagado.');

  var tabla = _leer_('Pagos', true);
  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(),
    ['ID', 'UnidadID', 'CopropiedadID', 'CobroID', 'Monto', 'Fecha', 'FechaPago',
     'FechaRegistro', 'Periodo', 'Metodo', 'Comprobante', 'ComprobanteURL',
     'Observaciones', 'RegistradoPor', 'Estado']);

  var fila = {
    ID: _nuevoId_(),
    UnidadID: unidadId,
    CopropiedadID: String(datos.copropiedadId || ''),
    CobroID: String(datos.cobroId || ''),
    Monto: monto,
    Fecha: String(datos.fecha || datos.fechaPago || Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd')),
    FechaPago: String(datos.fechaPago || datos.fecha || ''),
    FechaRegistro: Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd HH:mm:ss'),
    Periodo: String(datos.periodo || ''),
    Metodo: String(datos.metodo || 'Transferencia'),
    Comprobante: String(datos.comprobante || '').substring(0, 500),
    ComprobanteURL: String(datos.comprobanteUrl || '').substring(0, 500),
    Observaciones: String(datos.observaciones || '').substring(0, 500),
    RegistradoPor: String(ses.persona.Email || ses.persona.Nombre || ''),
    Estado: 'Pendiente'                          // lo aprueba el equipo en Conciliación
  };

  tabla.hoja.appendRow(headers.map(function (h) { return _celdaSegura_(fila[h] === undefined ? '' : fila[h]); }));
  _auditar_('res_pago', 'Pago reportado de ' + monto, String(ses.persona.Email || unidadId));
  return { Rows: [_quitarPrivadasResidente_(fila)] };
}

// ============================================================================
// 13. PANEL DE MARKETING Y CAPTACIÓN DE LEADS (compatibilidad)
// ============================================================================
// Estas columnas se ajustan a los nombres reales de sus pestañas.
// Cada nombre admite varios candidatos: se usa el primero que exista.

var CONFIG_MARKETING = {
  TABLA_LEADS: 'Leads_Marketing',
  TABLA_AGENTES: 'Agentes',
  TABLA_CAMPANAS: 'Campañas',
  TABLA_CONTACTOS: 'contactos',
  TABLA_BITACORA: 'Bitacora',
  COL_EMAIL:      ['ID', 'Email', 'Correo'],
  COL_NOMBRE:     ['Nombre', 'Nombre Completo'],
  COL_TELEFONO:   ['Telefono', 'Teléfono', 'Celular', 'Fono'],
  COL_CATEGORIA:  ['Categoria_Lead', 'Categoría_Lead', 'Categoria', 'Categoría'],
  COL_SLA_ESTADO: ['SLA_Estado', 'Estado_SLA'],
  COL_SLA_HORAS:  ['SLA_Horas', 'Horas_SLA', 'Horas'],
  COL_EJECUTIVO:  ['Ejecutivo', 'Ejecutivo_Asignado', 'Agente'],
  COL_BITACORA:   ['Bitacora_Notas', 'Bitácora_Notas', 'Bitacora', 'Notas'],
  COL_CLICS:      ['Clics', 'Clic', 'Click', 'Aperturas', 'Abrio'],
  COL_ESTADO:     ['Estado'],
  COL_CAMPANA:    ['Campaña_Enviada', 'Campana_Enviada'],
  COL_FECHA:      ['Fecha_Ingreso', 'Fecha', 'Fecha_Registro'],
  COL_FUENTE:     ['Fuente'],
  COL_RIESGOS:    ['Riesgos_Detectados'],
  COL_RESPONDIO:  ['Respondio_Diagnostico'],
  SLA_HORAS_LIMITE: 24,      // sobre esto, un lead A sin ejecutivo está vencido
  LIMITE_PUBLICO_HORA: 200   // máximo de registros públicos por hora (anti-abuso)
};

function _campo_(fila, candidatos, porDefecto) {
  for (var i = 0; i < candidatos.length; i++) {
    var v = fila[candidatos[i]];
    if (v !== undefined && v !== null && String(v) !== '') return v;
  }
  return porDefecto === undefined ? '' : porDefecto;
}

function _fecha_(v) {
  if (v instanceof Date) return v;
  var s = String(v == null ? '' : v).trim();
  if (!s) return null;
  var d = new Date(s.replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d;
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    var an = parseInt(m[3], 10);
    if (an < 100) an += 2000;
    return new Date(an, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  }
  return null;
}

function _horasDeLead_(lead) {
  var directo = _numero_(_campo_(lead, CONFIG_MARKETING.COL_SLA_HORAS, ''));
  if (directo > 0) return Math.round(directo);
  var d = _fecha_(_campo_(lead, CONFIG_MARKETING.COL_FECHA, ''));
  if (d) return Math.max(0, Math.round((Date.now() - d.getTime()) / 3600000));
  return 0;
}

function _textoCategoria_(lead) {
  return String(_campo_(lead, CONFIG_MARKETING.COL_CATEGORIA, '')).trim().toUpperCase();
}

function _textoSla_(lead) {
  return String(_campo_(lead, CONFIG_MARKETING.COL_SLA_ESTADO, '')).trim().toUpperCase();
}

function _leadBloqueado_(lead) {
  var e = _textoSla_(lead);
  return /GESTION|GESTIÓN|CONVERT|DESCART|CERRAD|FINALIZ|CLIENTE/.test(e);
}

function _leads_() {
  return _leerSeguro_(CONFIG_MARKETING.TABLA_LEADS).filas;
}

function _agentes_() {
  return _leerSeguro_(CONFIG_MARKETING.TABLA_AGENTES).filas.filter(function (a) {
    return _activo_(a.Activo) && String(a.Nombre || '').trim() !== '';
  });
}

function _buscarLead_(leads, email) {
  var objetivo = String(email || '').trim().toLowerCase();
  for (var i = 0; i < leads.length; i++) {
    var v = _campo_(leads[i], CONFIG_MARKETING.COL_EMAIL, '');
    if (String(v).trim().toLowerCase() === objetivo) return leads[i];
  }
  return null;
}

function _accionMarketing_(datos) {
  var quien = _equipoAutenticado_(datos.token);
  var accion = String(datos.action || '');

  if (accion === 'getAgentes') {
    return _agentes_().map(function (a) {
      return { nombre: String(a.Nombre || ''), email: String(a.Email || '') };
    });
  }

  if (accion === 'getDashboardData') {
    var leads = _leads_();
    var conteo = { A: 0, B: 0, C: 0 };
    var sumaHoras = 0, conHoras = 0;
    leads.forEach(function (l) {
      var c = _textoCategoria_(l);
      if (c === 'A' || c === 'B' || c === 'C') conteo[c]++;
      var h = _horasDeLead_(l);
      if (h > 0) { sumaHoras += h; conHoras++; }
    });
    return {
      total: leads.length,
      A: conteo.A,
      B: conteo.B,
      C: conteo.C,
      sla: { PROMEDIO: conHoras ? Math.round(sumaHoras / conHoras) + ' hrs' : '--' }
    };
  }

  if (accion === 'leadsAVencidos') {
    return _leads_().filter(function (l) {
      return _textoCategoria_(l) === 'A' &&
        !_leadBloqueado_(l) &&
        String(_campo_(l, CONFIG_MARKETING.COL_EJECUTIVO, '')).trim() === '' &&
        _horasDeLead_(l) > CONFIG_MARKETING.SLA_HORAS_LIMITE;
    }).map(function (l) {
      return {
        email: String(_campo_(l, CONFIG_MARKETING.COL_EMAIL, '')),
        nombre: String(_campo_(l, CONFIG_MARKETING.COL_NOMBRE, '')),
        telefono: String(_campo_(l, CONFIG_MARKETING.COL_TELEFONO, '')),
        horas: _horasDeLead_(l)
      };
    }).sort(function (a, b) { return b.horas - a.horas; });
  }

  if (accion === 'autoAsignar') {
    var agentes = _agentes_();
    if (!agentes.length) _cortar_(409, 'No hay agentes activos para asignar.');
    var pendientes = _leads_().filter(function (l) {
      return _textoCategoria_(l) === 'A' &&
        !_leadBloqueado_(l) &&
        String(_campo_(l, CONFIG_MARKETING.COL_EJECUTIVO, '')).trim() === '' &&
        _horasDeLead_(l) > CONFIG_MARKETING.SLA_HORAS_LIMITE;
    });
    var tabla = _leer_(CONFIG_MARKETING.TABLA_LEADS);
    var headers = tabla.headers.slice();
    var asignados = 0;
    for (var i = 0; i < pendientes.length; i++) {
      var agente = agentes[i % agentes.length];
      if (_escribirCelda_(tabla.hoja, headers, pendientes[i].__fila, _nombreColumna_(headers, CONFIG_MARKETING.COL_EJECUTIVO), String(agente.Nombre || ''))) {
        asignados++;
      }
    }
    _auditar_('auto_asignar', 'Leads asignados: ' + asignados, quien.email);
    return { asignados: asignados };
  }

  if (accion === 'asignarEjecutivo') {
    var ejecutivo = String(datos.ejecutivo || '').trim();
    if (!ejecutivo) _cortar_(400, 'Indique el ejecutivo.');
    return _actualizarLead_(datos.email, function (tabla, headers, fila) {
      _escribirCelda_(tabla.hoja, headers, fila.__fila, _nombreColumna_(headers, CONFIG_MARKETING.COL_EJECUTIVO), ejecutivo);
      if (fila[_nombreColumna_(headers, CONFIG_MARKETING.COL_SLA_ESTADO)] === undefined ||
          String(fila[_nombreColumna_(headers, CONFIG_MARKETING.COL_SLA_ESTADO)]).trim() === '') {
        _escribirCelda_(tabla.hoja, headers, fila.__fila, _nombreColumna_(headers, CONFIG_MARKETING.COL_SLA_ESTADO), 'ASIGNADO');
      }
    }, quien);
  }

  if (accion === 'gestionarLead') {
    var tipoAccion = String(datos.tipoAccion || '').trim().toUpperCase();
    var comentario = String(datos.comentario || '').trim();
    if (!comentario) _cortar_(400, 'Escriba un comentario.');
    return _actualizarLead_(datos.email, function (tabla, headers, fila) {
      var colBitacora = _nombreColumna_(headers, CONFIG_MARKETING.COL_BITACORA);
      var anterior = String(fila[colBitacora] === undefined ? '' : fila[colBitacora]);
      var linea = '[' + Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd HH:mm') + '] ' +
        quien.nombre + ': ' + comentario;
      _escribirCelda_(tabla.hoja, headers, fila.__fila, colBitacora, anterior ? (anterior + '\n' + linea) : linea);

      var colSla = _nombreColumna_(headers, CONFIG_MARKETING.COL_SLA_ESTADO);
      var colEstado = _nombreColumna_(headers, CONFIG_MARKETING.COL_ESTADO);
      if (tipoAccion === 'CONVERTIR') {
        _escribirCelda_(tabla.hoja, headers, fila.__fila, colSla, 'CONVERTIDO');
        _escribirCelda_(tabla.hoja, headers, fila.__fila, colEstado, 'Cliente');
      } else if (tipoAccion === 'DESCARTAR') {
        _escribirCelda_(tabla.hoja, headers, fila.__fila, colSla, 'DESCARTADO');
        _escribirCelda_(tabla.hoja, headers, fila.__fila, colEstado, 'Inactivo');
      } else {
        _escribirCelda_(tabla.hoja, headers, fila.__fila, colSla, 'EN GESTIÓN');
      }
    }, quien);
  }

  if (accion === 'apiResend') {
    var to = String(datos.to || '').trim();
    if (!to || to.indexOf('@') === -1) _cortar_(400, 'Correo de destino inválido.');
    var asunto = String(datos.subject || 'CRM Santa Josefina');
    var html = String(datos.html || '');
    var r = _enviarCorreo_(to, asunto, html);
    _auditar_('correo', asunto + ' -> ' + to, quien.email);
    return { id: r && r.id ? r.id : null, enviado: true };
  }

  if (accion === 'getAnaliticaCampanas') {
    var porCampana = {};
    _leads_().forEach(function (l) {
      var camp = String(_campo_(l, CONFIG_MARKETING.COL_CAMPANA, '')).trim();
      if (!camp) return;
      if (!porCampana[camp]) porCampana[camp] = { enviados: 0, clics: 0, leadsA: 0 };
      porCampana[camp].enviados++;
      if (_textoCategoria_(l) === 'A') porCampana[camp].leadsA++;
      var clic = _campo_(l, CONFIG_MARKETING.COL_CLICS, '');
      if (clic === true || /^(si|sí|x|1|true)$/i.test(String(clic).trim())) porCampana[camp].clics++;
    });
    if (!Object.keys(porCampana).length) porCampana['Sin campaña'] = { enviados: 0, clics: 0, leadsA: 0 };
    return porCampana;
  }

  _cortar_(400, 'Acción de marketing no reconocida: ' + accion);
}

function _nombreColumna_(headers, candidatos) {
  for (var i = 0; i < candidatos.length; i++) {
    if (headers.indexOf(candidatos[i]) !== -1) return candidatos[i];
  }
  // No existe: se crea con el primer candidato.
  return candidatos[0];
}

function _actualizarLead_(email, fn, quien) {
  var tabla = _leer_(CONFIG_MARKETING.TABLA_LEADS);
  var fila = _buscarLead_(tabla.filas, email);
  if (!fila) _cortar_(404, 'No existe el lead ' + email + '.');
  var headers = _asegurarColumnas_(tabla.hoja, tabla.headers.slice(),
    ['Ejecutivo', 'SLA_Estado', 'Bitacora_Notas', 'Estado']);
  fn(tabla, headers, fila);
  _auditar_('lead', 'Actualizado ' + email, quien.email);
  return { actualizado: true, email: String(email) };
}

// --- Ruta pública (formularios de captación, sin sesión) --------------------

var TABLAS_PUBLICAS = ['ProspectosCorretaje', 'contactos', 'Bitacora', 'Leads_Marketing'];

function _rutaPublica_(datos) {
  var accion = String(datos.action || '');
  _limitarPublico_();

  if (accion === 'add') {
    var nombreTabla = String(datos.table || '');
    if (!_enLista_(TABLAS_PUBLICAS, nombreTabla)) {
      _cortar_(403, 'Esa tabla no acepta registros desde el sitio público.');
    }
    return _add_(_leer_(nombreTabla, true), datos.rows, { email: 'sitio-web', admin: false }, nombreTabla);
  }

  if (accion === 'registrarDiagnostico') {
    return _registrarDiagnostico_(datos);
  }

  _cortar_(400, 'Acción pública no reconocida.');
}

function _limitarPublico_() {
  var cache = CacheService.getScriptCache();
  var hora = Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyyMMddHH');
  var k = 'pub:' + hora;
  var n = parseInt(cache.get(k) || '0', 10) + 1;
  cache.put(k, String(n), 3600);
  if (n > CONFIG_MARKETING.LIMITE_PUBLICO_HORA) {
    _cortar_(429, 'Se alcanzó el límite de registros por hora. Intente más tarde.');
  }
}

function _registrarDiagnostico_(datos) {
  var nombre = String(datos.nombre || '').trim().substring(0, 120);
  var email = String(datos.email || '').trim().substring(0, 160);
  var telefono = String(datos.telefono || '').trim().substring(0, 40);
  var comunidad = String(datos.comunidad || '').trim().substring(0, 160);
  if (!nombre || !email || email.indexOf('@') === -1) _cortar_(400, 'Complete su nombre y un correo válido.');

  var hoy = Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd');
  var ahora = Utilities.formatDate(new Date(), _zona_(), 'yyyy-MM-dd HH:mm:ss');
  var resumen = 'Riesgo ' + String(datos.nivel || '') + ' (' + String(datos.countNo || 0) + ' fallas): ' + String(datos.puntosCriticos || '');

  var idLead = email.toLowerCase();
  _add_(_leer_(CONFIG_MARKETING.TABLA_CONTACTOS, true), [{
    ID: 'LEAD_' + Date.now(),
    Nombre: nombre, Email: email, Telefono: telefono,
    Mensaje: 'Checklist Seguridad: ' + comunidad, Fecha: hoy, Estado: 'Nuevo', Notas: resumen
  }], { email: 'sitio-web', admin: false }, CONFIG_MARKETING.TABLA_CONTACTOS);

  _add_(_leer_(CONFIG_MARKETING.TABLA_BITACORA, true), [{
    ID: 'BIT_' + Date.now(), ProspectoID: 'LEAD_' + Date.now(), Fecha: hoy,
    Tipo: 'Diagnostico Web', Nota: resumen, Usuario: 'Web'
  }], { email: 'sitio-web', admin: false }, CONFIG_MARKETING.TABLA_BITACORA);

  _add_(_leer_(CONFIG_MARKETING.TABLA_LEADS, true), [{
    ID: idLead, Nombre: nombre, Fuente: 'Checklist Seguridad', Estado: 'Activo',
    Telefono: telefono, Riesgos_Detectados: String(datos.countNo || ''),
    Respondio_Diagnostico: 'SI', Fecha_Ingreso: ahora
  }], { email: 'sitio-web', admin: false }, CONFIG_MARKETING.TABLA_LEADS);

  // Aviso al equipo (opcional: configure NOTIFICAR_A en las propiedades del script).
  var aviso = _props_().getProperty('NOTIFICAR_A');
  if (aviso && _props_().getProperty('RESEND_API_KEY')) {
    try {
      _enviarCorreo_(aviso, 'Nuevo diagnóstico: ' + nombre,
        '<h2>Nuevo diagnóstico de seguridad</h2>' +
        '<p><b>Nombre:</b> ' + nombre + '<br><b>Correo:</b> ' + email +
        '<br><b>Teléfono:</b> ' + telefono + '<br><b>Comunidad:</b> ' + comunidad + '</p>' +
        '<p>' + resumen + '</p>');
    } catch (e) { console.warn('No se pudo avisar: ' + e); }
  }

  _auditar_('diagnostico_web', comunidad + ' / ' + resumen, email);
  return { registrado: true };
}

// --- Correo saliente (Resend) ----------------------------------------------

function configurarCorreo(apiKey, remitente, notificarA) {
  var props = _props_();
  if (apiKey) props.setProperty('RESEND_API_KEY', String(apiKey).trim());
  if (remitente) props.setProperty('RESEND_FROM', String(remitente).trim());
  if (notificarA) props.setProperty('NOTIFICAR_A', String(notificarA).trim());
  Logger.log('RESEND_API_KEY: %s', props.getProperty('RESEND_API_KEY') ? 'configurada' : 'FALTA');
  Logger.log('RESEND_FROM: %s', props.getProperty('RESEND_FROM') || '(no definido)');
  Logger.log('NOTIFICAR_A: %s', props.getProperty('NOTIFICAR_A') || '(no definido)');
}

function _enviarCorreo_(to, subject, html) {
  var key = _props_().getProperty('RESEND_API_KEY');
  if (!key) {
    _cortar_(500, 'Falta la clave de Resend. Ejecute configurarCorreo("re_...", "CRM Santa Josefina <crm@sudominio.cl>").');
  }
  var from = _props_().getProperty('RESEND_FROM') || 'CRM Santa Josefina <onboarding@resend.dev>';
  var resp = UrlFetchApp.fetch('https://api.resend.com/emails', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key },
    payload: JSON.stringify({ from: from, to: [to], subject: subject, html: html }),
    muteHttpExceptions: true
  });
  var codigo = resp.getResponseCode();
  var texto = resp.getContentText();
  if (codigo < 200 || codigo >= 300) {
    _cortar_(502, 'Resend respondió ' + codigo + ': ' + texto.substring(0, 200));
  }
  try { return JSON.parse(texto || '{}'); } catch (e) { return { ok: true }; }
}

// ============================================================================
// 14. DIAGNÓSTICO (se ejecuta desde el editor)
// ============================================================================

function probarConexion() {
  var ss = _ss_();
  Logger.log('Hoja: %s', ss.getName());
  Logger.log('Zona horaria: %s', _zona_());
  Logger.log('Pestañas: %s', ss.getSheets().map(function (h) { return h.getName(); }).join(', '));
  Logger.log('---');

  var faltantes = [];
  for (var tabla in POLICY) {
    if (!Object.prototype.hasOwnProperty.call(POLICY, tabla)) continue;
    if (_existeHoja_(tabla)) {
      Logger.log('OK   %s', tabla);
    } else {
      Logger.log('FALTA %s (está en POLICY pero no en la hoja)', tabla);
      faltantes.push(tabla);
    }
  }

  var sinPolitica = ss.getSheets().map(function (h) { return h.getName(); })
    .filter(function (n) { return !_permiso_(n) && TABLAS_PROHIBIDAS.indexOf(n) === -1; });
  if (sinPolitica.length) {
    Logger.log('---');
    Logger.log('Pestañas sin POLICY (quedan bloqueadas): %s', sinPolitica.join(', '));
  }
  Logger.log('---');
  Logger.log('Secretos: %s', _props_().getProperty('SESSION_SECRET') ? 'creados' : 'FALTAN (ejecute inicializarSecretos)');

  var usuarios = _existeHoja_('Usuarios') ? _leer_('Usuarios') : null;
  if (usuarios) {
    Logger.log('Usuarios registrados: %s', usuarios.filas.length);
    var admins = usuarios.filas.filter(function (u) { return _esAdmin_(u.Rol); });
    Logger.log('Administradores: %s', admins.length);
    if (!admins.length) Logger.log('AVISO: no hay ningún administrador. Use claveTemporalUsuario().');
  }
  Logger.log('=== Faltantes en POLICY: %s ===', faltantes.length ? faltantes.join(', ') : 'ninguna');
  return faltantes;
}

function probarVelocidadHash() {
  var t0 = new Date().getTime();
  _crearHashClave_('clave-de-prueba-123456');
  var ms = new Date().getTime() - t0;
  Logger.log('HASH_ITER=%s tarda %s ms por login.', HASH_ITER, ms);
  if (ms > 2000) Logger.log('BAJE HASH_ITER (por ejemplo a %s).', Math.max(50, Math.floor(HASH_ITER * 1000 / ms)));
  else Logger.log('Velocidad correcta.');
  return ms;
}

function probarSesion() {
  var t = _crearToken_('equipo', 'PRUEBA', { e: 'prueba@local', r: 'admin', n: 'Prueba' });
  Logger.log('Token creado: %s...', t.substring(0, 40));
  Logger.log('Payload: %s', JSON.stringify(_verificarToken_(t)));
  return t;
}

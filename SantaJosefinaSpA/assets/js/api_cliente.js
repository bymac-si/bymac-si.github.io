// ============================================================================
// api_cliente.js — cliente del CRM para Google Apps Script (reemplaza a AppSheet)
//
// Cárguelo ANTES de app.js en TODAS las páginas:
//     <script src="assets/js/api_cliente.js"></script>
//     <script src="assets/js/app.js"></script>
//
// Este archivo es el ÚNICO que habla con el backend (Api.gs). No contiene
// secretos: la URL /exec es pública, la seguridad la aplica el servidor.
//
// Equipo (agentes):  loginEquipo(), apiCRUD()/appSheetCRUD(), fetchData()
// Residentes:        loginResidente(), cargarPortalResidente()
// ============================================================================

const API_URL = "https://script.google.com/macros/s/AKfycbw6pg39TiLiOWxbjhvfuM2rS3AYDRNbnqyjDOtyv3btMU8VZN9wbOx4pMJDlVl_zVYbXw/exec";

// Página de acceso de residentes.
const LOGIN_RESIDENTE_URL = "login_residente.html";

// ---------------------------------------------------------------------------
// Llamada base. Apps Script no responde a preflight CORS, por eso se envía
// text/plain (petición "simple") con el JSON en el cuerpo, y el token va dentro
// del cuerpo (no en una cabecera). Siempre responde 200: el resultado real
// viene en { ok, status, error }.
// ---------------------------------------------------------------------------
async function apiPost(route, payload = {}) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ route, ...payload })
    });
  } catch (_) {
    throw new Error("No se pudo conectar con el servidor.");
  }
  const data = await res.json().catch(() => null);
  if (!data) throw new Error("Respuesta inválida del servidor.");
  if (!data.ok) {
    const err = new Error(data.error || "Error del servidor.");
    err.status = data.status;
    throw err;
  }
  return data.data;
}

function tokenVencido(token) {
  try {
    let b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    return JSON.parse(decodeURIComponent(escape(atob(b)))).exp * 1000 < Date.now();
  } catch (_) { return true; }
}

// Lleva al panel según el dispositivo (celular o escritorio).
function irAlPanel() {
  window.location.replace(window.innerWidth < 900 ? "mobile_dashboard.html" : "dashboard.html");
}

// ---------------------------------------------------------------------------
// EQUIPO: datos y sesión (correo y clave)
// ---------------------------------------------------------------------------
function getToken() { return localStorage.getItem("crm_token"); }

function cerrarSesionLocal() {
  ["crm_token", "crm_cc", "auth_user", "sesion_activa"].forEach(k => localStorage.removeItem(k));
}

async function apiCRUD(tabla, action, rows, properties = {}) {
  if (!navigator.onLine) {
    alert("⚠️ ESTÁS OFFLINE\n\nNo tienes conexión a internet. Los datos NO se guardarán.\nPor favor, conéctate y vuelve a intentar.");
    throw new Error("Sin conexión a internet.");
  }
  if (properties.Selector) {
    throw new Error("Selector ya no se usa. Filtre así: fetchData('Tabla', {column:'Columna', value:'Valor'})");
  }
  const token = getToken();
  if (!token || tokenVencido(token)) {
    cerrarSesionLocal();
    window.location.href = "login.html";
    throw new Error("Sesión vencida.");
  }
  try {
    // Find devuelve un arreglo; Add/Edit/Delete devuelven { Rows: [...] }.
    return await apiPost("data", { token, table: tabla, action, rows, filter: properties.filter });
  } catch (e) {
    if (e.status === 401) { cerrarSesionLocal(); window.location.href = "login.html"; }
    if (e.status === 403 && /cambiar su clave/i.test(e.message)) window.location.href = "cambiar-clave.html";
    throw e;
  }
}
const appSheetCRUD = apiCRUD; // nombre anterior, para que las páginas existentes sigan funcionando

async function fetchData(tabla, filter) {
  const datos = await apiCRUD(tabla, "Find", [], filter ? { filter } : {});
  return Array.isArray(datos) ? datos : (datos && datos.Rows) || [];
}

function getAuthUser() {
  try { return JSON.parse(localStorage.getItem("auth_user")); }
  catch (_) { return null; }
}

function setAuthUser(user) {
  // Solo para mostrar nombre y rol en el header. La seguridad real está en el servidor.
  localStorage.setItem("auth_user", JSON.stringify(user));
  localStorage.setItem("sesion_activa", JSON.stringify(user));
}

function requireAuth() {
  const t = getToken();
  if (!t || tokenVencido(t) || !getAuthUser()) {
    cerrarSesionLocal();
    window.location.href = "login.html";
    return;
  }
  // Clave temporal: la persona no puede usar el CRM hasta cambiarla.
  if (localStorage.getItem("crm_cc") === "1" && !window.location.pathname.endsWith("cambiar-clave.html")) {
    window.location.href = "cambiar-clave.html";
  }
}

// Login del equipo. Devuelve { debeCambiarClave } (true cuando entró con una clave temporal).
async function loginEquipo(email, password) {
  const data = await apiPost("login", { email, password });
  localStorage.setItem("crm_token", data.token);
  if (data.debeCambiarClave) localStorage.setItem("crm_cc", "1");
  else localStorage.removeItem("crm_cc");
  setAuthUser({
    email: data.user.email, nombre: data.user.nombre, rol: data.user.rol,
    avatar: data.user.avatar || "", ts: Date.now()
  });
  return { debeCambiarClave: !!data.debeCambiarClave };
}

// Cambia la clave propia (mínimo 10 caracteres) y guarda la sesión nueva, ya sin restricción.
async function cambiarClaveEquipo(actual, nueva) {
  const data = await apiPost("usr.clave", { token: getToken(), actual, nueva });
  localStorage.setItem("crm_token", data.token);
  localStorage.removeItem("crm_cc");
  return true;
}

// SOLO ADMIN: fija o genera la clave de un integrante del equipo. Sin segundo argumento genera una
// temporal de 12 caracteres y la devuelve una sola vez; la persona deberá cambiarla al entrar.
// Ej.: await generarClaveUsuario("ana@correo.cl")
async function generarClaveUsuario(email, password) {
  return apiPost("admin.usrClave", { token: getToken(), email, password });
}

// SOLO ADMIN: fija o genera la clave de un residente (misma idea que generarClaveUsuario).
// Ej.: await generarClaveResidente("rosa@mail.cl")
async function generarClaveResidente(email, password, tipo) {
  return apiPost("admin.resClave", { token: getToken(), email, password, tipo });
}

// ---------------------------------------------------------------------------
// PORTAL DE RESIDENTES / ARRENDATARIOS / PROPIETARIOS
// (sesión propia; el servidor decide qué datos devuelve)
// ---------------------------------------------------------------------------
const RES_TOKEN_KEY = "crm_token_res";
const RES_TIPO_KEY = "crm_tipo_res";
const RES_DATOS_KEY = "sesion_residente";

function getTokenResidente() { return localStorage.getItem(RES_TOKEN_KEY); }

function logoutResidente() {
  ["sesion_residente", "sesion_externa", RES_TOKEN_KEY, RES_TIPO_KEY]
    .forEach(k => localStorage.removeItem(k));
}

window.cerrarSesionResidente = logoutResidente;

async function resPost(route, payload = {}) {
  const token = getTokenResidente();
  try {
    return await apiPost(route, { token, ...payload });
  } catch (e) {
    if (e.status === 401 && token) { logoutResidente(); window.location.href = LOGIN_RESIDENTE_URL; }
    throw e;
  }
}

// tipo: "residente" (por defecto), "arrendatario" o "propietario".
async function loginResidente(usuario, password, tipo) {
  const data = await apiPost("res.login", { email: usuario, password, tipo: tipo || "residente" });
  localStorage.setItem(RES_TOKEN_KEY, data.token);
  localStorage.setItem(RES_TIPO_KEY, tipo || "residente");
  // Mismo formato que lee setupNavigation() en app.js; solo sirve para mostrar el nombre.
  localStorage.setItem(RES_DATOS_KEY, JSON.stringify({ tipo: tipo || "residente", datos: data.persona, ts: Date.now() }));
  return data.persona;
}

// Devuelve, según el perfil:
//   { tipo, persona, unidades, copropiedades, cobros, pagos, reclamos, gastosComunes,
//     gastos, reservas, espacios, bloques, proveedores, propiedades, visitas, contratos, pagosArriendo }
async function cargarPortalResidente() {
  const t = getTokenResidente();
  if (!t || tokenVencido(t)) {
    logoutResidente();
    window.location.href = LOGIN_RESIDENTE_URL;
    throw new Error("Su sesión expiró. Vuelva a ingresar.");
  }
  return resPost("res.portal");
}

// Crea un reclamo. Acepta un objeto { categoria, descripcion, unidadId, foto }
// o los tres argumentos sueltos (categoria, descripcion, unidadId).
// El servidor fija el usuario, la unidad y el estado: el navegador no manda la identidad.
function crearReclamoResidente(categoriaOObj, descripcion, unidadId) {
  const datos = (categoriaOObj && typeof categoriaOObj === "object")
    ? categoriaOObj
    : { categoria: categoriaOObj, descripcion: descripcion, unidadId: unidadId };
  return resPost("res.reclamo", datos);
}

// Agrega una respuesta del residente al historial de un reclamo suyo.
function actualizarReclamoResidente(id, historial) {
  return resPost("res.reclamoEdit", { id: id, historial: historial });
}

function cambiarClaveResidente(actual, nueva) {
  return resPost("res.clave", { actual, nueva });
}

// El residente reserva un espacio común (el servidor valida que sea de su comunidad).
function crearReservaResidente(datos) {
  return resPost("res.reserva", datos);
}

// El residente reporta un pago de gasto común (queda Pendiente de aprobación).
function reportarPagoResidente(datos) {
  return resPost("res.pago", datos);
}

// Redirige al portal que corresponde al perfil y al tamaño de pantalla.
function irAlPortalResidente(tipo) {
  const perfil = tipo || localStorage.getItem(RES_TIPO_KEY) || "residente";
  const movil = window.innerWidth < 1024;
  if (perfil === "arrendatario") window.location.replace("portal_arrendatario.html");
  else if (perfil === "propietario") window.location.replace("portal_vendedor.html");
  else window.location.replace(movil ? "portal_residente.html" : "portal-comunidad.html");
}

// ---------------------------------------------------------------------------
// PANEL DE MARKETING Y CAPTACIÓN DE LEADS (equipo)
// ---------------------------------------------------------------------------
// Ejecuta una acción del panel de marketing con la sesión del equipo.
//   await accionCRM("getDashboardData")
//   await accionCRM("gestionarLead", { email: "x@y.cl", tipoAccion: "CONVERTIR", comentario: "..." })
//   await accionCRM("apiResend", { to: "x@y.cl", subject: "Hola", html: "<b>Hola</b>" })
async function accionCRM(action, extra) {
  const token = getToken();
  if (!token || tokenVencido(token)) {
    cerrarSesionLocal();
    window.location.href = "login.html";
    throw new Error("Sesión vencida.");
  }
  return apiPost("accion", Object.assign({ token, action }, extra || {}));
}

// ---------------------------------------------------------------------------
// FORMULARIOS PÚBLICOS (landing, checklist). No llevan sesión.
// ---------------------------------------------------------------------------
//   await accionPublica("add", { table: "ProspectosCorretaje", rows: [payload] })
async function accionPublica(action, payload) {
  if (!navigator.onLine) throw new Error("Sin conexión a internet.");
  return apiPost("publico", Object.assign({ action }, payload || {}));
}

// Guarda un prospecto desde las landings públicas.
function registrarProspectoPublico(tabla, fila) {
  return accionPublica("add", { table: tabla, rows: [fila] });
}

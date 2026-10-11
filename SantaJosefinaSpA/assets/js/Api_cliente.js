// ============================================================================
// api_cliente.js: cliente del CRM para Google Apps Script (reemplaza a AppSheet)
// Cárguelo ANTES de app.js. No contiene secretos.
//
// En app.js ELIMINE estos bloques (ahora viven aquí):
//   - APP_ID y API_KEY
//   - appSheetCRUD() y fetchData()
//   - sha256(), getAuthUser(), setAuthUser(), requireAuth(), loginWithAppSheet()
// y en window.logout agregue:  localStorage.removeItem("crm_token");
// El resto de app.js (helpers, UTM, honorarios, header, router) sigue igual.
// ============================================================================

const API_URL = "https://script.google.com/macros/s/AKfycbw6pg39TiLiOWxbjhvfuM2rS3AYDRNbnqyjDOtyv3btMU8VZN9wbOx4pMJDlVl_zVYbXw/exec";
// Página donde el residente escribe su correo y clave. Ajústela al nombre real.
const LOGIN_RESIDENTE_URL = "login-residente.html";

// ---------------------------------------------------------------------------
// Llamada base. Apps Script no responde a preflight CORS, por eso se envía
// text/plain (petición "simple") con el JSON en el cuerpo, y el token va dentro
// del cuerpo (no en una cabecera). Siempre responde 200: el resultado real viene en { ok, status, error }.
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
    // Find devuelve un arreglo; Add/Edit/Delete devuelven { Rows: [...] }, como antes con AppSheet.
    return await apiPost("data", { token, table: tabla, action, rows, filter: properties.filter });
  } catch (e) {
    if (e.status === 401) { cerrarSesionLocal(); window.location.href = "login.html"; }
    if (e.status === 403 && /cambiar su clave/i.test(e.message)) window.location.href = "cambiar-clave.html";
    throw e;
  }
}
const appSheetCRUD = apiCRUD; // nombre anterior, para que las páginas existentes sigan funcionando

async function fetchData(tabla, filter) {
  return apiCRUD(tabla, "Find", [], filter ? { filter } : {});
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
async function generarClaveResidente(email, password) {
  return apiPost("admin.resClave", { token: getToken(), email, password });
}

// ---------------------------------------------------------------------------
// PORTAL DE RESIDENTES (sesión propia, solo ven los datos de su unidad)
// ---------------------------------------------------------------------------
const RES_TOKEN_KEY = "crm_token_res";

function logoutResidente() {
  ["sesion_residente", "sesion_externa", RES_TOKEN_KEY].forEach(k => localStorage.removeItem(k));
}

async function resPost(route, payload = {}) {
  const token = localStorage.getItem(RES_TOKEN_KEY);
  try {
    return await apiPost(route, { token, ...payload });
  } catch (e) {
    if (e.status === 401 && token) { logoutResidente(); window.location.href = LOGIN_RESIDENTE_URL; }
    throw e;
  }
}

async function loginResidente(email, password) {
  const data = await apiPost("res.login", { email, password });
  localStorage.setItem(RES_TOKEN_KEY, data.token);
  // Mismo formato que ya lee setupNavigation() en app.js; solo sirve para mostrar el nombre.
  localStorage.setItem("sesion_residente", JSON.stringify({ datos: data.residente, ts: Date.now() }));
  return data.residente;
}

// Devuelve { residente, unidades, copropiedades, cobros, pagos, reclamos, gastosComunes }
async function cargarPortalResidente() {
  const t = localStorage.getItem(RES_TOKEN_KEY);
  if (!t || tokenVencido(t)) { logoutResidente(); window.location.href = LOGIN_RESIDENTE_URL; throw new Error("Sin sesión."); }
  return resPost("res.portal");
}

function crearReclamoResidente(categoria, descripcion, unidadId) {
  return resPost("res.reclamo", { categoria, descripcion, unidadId });
}

function cambiarClaveResidente(actual, nueva) {
  return resPost("res.clave", { actual, nueva });
}
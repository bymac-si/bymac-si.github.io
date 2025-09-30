// =====================
// Configuración AppSheet
// =====================
const APP_ID = "247b67e5-5b42-49a5-92a1-16c4357f5c7e";
const API_KEY = "V2-bKT1n-onhYX-SHl8K-zPPx8-6QwfJ-pp9Pi-UIrcy-gcLGM";

// =====================
// CRUD genérico contra AppSheet
// =====================

async function appSheetCRUD(tabla, action, rows, properties = {}) {
  const url = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tabla}/Action`;
  const body = { Action: action, Properties: properties, Rows: rows };

  console.log("➡️ Enviando a AppSheet");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "ApplicationAccessKey": API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  console.log("⬅️ Respuesta AppSheet");

  if (!res.ok) throw new Error(text);

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// =====================
// Traer todos los datos de una tabla
// =====================

async function fetchData(tabla) {
  return await appSheetCRUD(tabla, "Find", [], {
    Selector: `Filter(${tabla}, true)`
  });
}

// =====================
// Helpers comunes
// =====================

function formatearFecha(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CL");
}

function formatoPrecio(valor) {
  if (!valor) return "$0";
  return "$" + new Intl.NumberFormat("es-CL").format(valor);
}

function getKeyName(obj) {
  const cands = ["ID","Id","Key","Row ID","RowID","_ComputedKey","_RowNumber"];
  return cands.find(k => Object.prototype.hasOwnProperty.call(obj, k)) || "ID";
}

function getKeyVal(row) {
  return row[getKeyName(row)];
}

function pick(row, aliases) {
  for (const a of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, a)) return row[a];
  }
  return undefined;
}

// =====================
// AUTENTICACIÓN (MVP)
// Tabla AppSheet: "Usuarios"
// Columnas recomendadas: ID (Key), Email, Nombre, Rol, PasswordHash
// =====================

// =====================
// Hash SHA-256 usando Web Crypto API
// =====================
async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}
// =====================
// Obtiene user auth desde localStorage
// =====================

function getAuthUser() {
  try { return JSON.parse(localStorage.getItem('auth_user')); }
  catch(_) { return null; }
}

// =====================
// Guarda sesión
// =====================

function setAuthUser(user) {
  localStorage.setItem('auth_user', JSON.stringify(user));
}

// =====================
// Cierra sesión
// =====================

function logout() {
  localStorage.removeItem('auth_user');
  window.location.href = '/login.php';
}

// =====================
// Protege páginas internas
// =====================

function requireAuth() {
  const u = getAuthUser();
  if (!u) { window.location.href = '/login.php'; }
}

// =====================
// Login contra AppSheet (tabla "Usuarios")
// =====================

async function loginWithAppSheet(email, password) {
  const usuarios = await fetchData("Usuarios");
  const u = usuarios.find(x => (x.Email||'').toLowerCase() === email);

  if (!u) { throw new Error('Usuario no encontrado.'); }

  // =====================
  // Compara hash
  // =====================

  const providedHash = await sha256(password);
  const storedHash   = (u.PasswordHash||'').toLowerCase();

  if (providedHash !== storedHash) {
    throw new Error('Contraseña inválida.');
  }

  // =====================
  // Éxito: guarda sesión mínima
  // =====================

  setAuthUser({
    email: u.Email,
    nombre: u.Nombre || '',
    rol: u.Rol || 'Colaborador',
    ts: Date.now()
  });
  return true;
}

// =====================
// Opcional: verificación de rol
// =====================

function requireRole(roles = []) {
  const u = getAuthUser();
  if (!u) { window.location.href = '/login.php'; return; }
  if (roles.length && !roles.includes(u.rol)) {
    alert('No tienes permisos para acceder a esta sección.');
    window.location.href = '/dashboard.php';
  }
}
window.sendEmail = async ({to, subject, html, attachments}) => {
  // Llama a tu API / correo transaccional y retorna cuando esté enviado.
};
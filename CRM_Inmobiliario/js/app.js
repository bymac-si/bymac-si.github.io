// AppSheet Config
const APP_ID="247b67e5-5b42-49a5-92a1-16c4357f5c7e";
const API_KEY="V2-bKT1n-onhYX-SHl8K-zPPx8-6QwfJ-pp9Pi-UIrcy-gcLGM";

async function appSheetCRUD(tabla, action, rows){
  const url=`https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tabla}/Action`;
  return await fetch(url,{
    method:"POST",
    headers:{
      "ApplicationAccessKey":API_KEY,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({Action:action,Properties:{},Rows:rows})
  }).then(r=>r.json());
}

async function fetchData(tabla){ return await appSheetCRUD(tabla,"Find",[]); }
function formatearFecha(f){ if(!f) return ""; const d=new Date(f); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; }
function formatoPrecio(valor){
  if(!valor) return "$0";
  return "$" + new Intl.NumberFormat("es-CL").format(valor);
}
// =====================
// AUTENTICACIÓN (MVP)
// Tabla AppSheet: "Usuarios" con columnas recomendadas:
//   ID (Key), Email (Text), Nombre (Text), Rol (Text), PasswordHash (Text)
//   * PasswordHash = SHA-256 del password en minúsculas (o el que definas)
// =====================

// Hash SHA-256 usando Web Crypto API
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Obtiene user auth desde localStorage
function getAuthUser(){
  try{ return JSON.parse(localStorage.getItem('auth_user')); }
  catch(_){ return null; }
}

// Guarda sesión
function setAuthUser(user){
  localStorage.setItem('auth_user', JSON.stringify(user));
}

// Cierra sesión
function logout(){
  localStorage.removeItem('auth_user');
  window.location.href = 'login.html';
}

// Protege páginas internas
function requireAuth(){
  const u = getAuthUser();
  if(!u){ window.location.href = 'login.html'; }
}

// Login contra AppSheet (tabla "Usuarios")
async function loginWithAppSheet(email, password){
  // Trae todos los usuarios (MVP). Para producción, filtra por email en el backend.
  const usuarios = await fetchData("Usuarios");
  const u = usuarios.find(x => (x.Email||'').toLowerCase() === email);

  if(!u){ throw new Error('Usuario no encontrado.'); }

  // Compara hash
  const providedHash = await sha256(password);
  const storedHash   = (u.PasswordHash||'').toLowerCase();

  if(providedHash !== storedHash){
    throw new Error('Contraseña inválida.');
  }

  // Éxito: guarda sesión mínima
  setAuthUser({
    email: u.Email,
    nombre: u.Nombre || '',
    rol: u.Rol || 'Colaborador',
    ts: Date.now()
  });
  return true;
}

// Opcional: verificación de rol
function requireRole(roles = []){
  const u = getAuthUser();
  if(!u) { window.location.href = 'login.html'; return; }
  if(roles.length && !roles.includes(u.rol)){
    alert('No tienes permisos para acceder a esta sección.');
    window.location.href = 'dashboard.html';
  }
}
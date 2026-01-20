
// ==========================================
// 0. PWA REGISTRATION
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.error('Error SW:', err));
    });
}

// Detección de Estado Offline (Para avisar al agente)
window.addEventListener('offline', () => {
    mostrarAvisoOffline(true);
});
window.addEventListener('online', () => {
    mostrarAvisoOffline(false);
});

function mostrarAvisoOffline(estamosOffline) {
    let aviso = document.getElementById('aviso-offline');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'aviso-offline';
        aviso.style.cssText = "position:fixed; bottom:0; left:0; right:0; background:#ef4444; color:white; text-align:center; padding:10px; z-index:9999; font-weight:bold; display:none;";
        aviso.innerText = "⚠️ Sin conexión. No podrás guardar cambios.";
        document.body.appendChild(aviso);
    }
    aviso.style.display = estamosOffline ? 'block' : 'none';
}
// ==========================================
// 1. CONFIGURACIÓN APPSHEET
// ==========================================
const APP_ID = "247b67e5-5b42-49a5-92a1-16c4357f5c7e";
const API_KEY = "V2-bKT1n-onhYX-SHl8K-zPPx8-6QwfJ-pp9Pi-UIrcy-gcLGM"; // ⚠️ Ocultar en producción

// ==========================================
// 2. CORE: CONEXIÓN DE DATOS (CRUD)
// ==========================================

async function appSheetCRUD(tabla, action, rows, properties = {}) {
    // 1. Chequeo de seguridad PWA
    if (!navigator.onLine) {
        alert("⚠️ ESTÁS OFFLINE\n\nNo tienes conexión a internet. Los datos NO se guardarán.\nPor favor, conéctate y vuelve a intentar.");
        throw new Error("Sin conexión a internet.");
    }
    const url = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tabla}/Action`;
    const body = { Action: action, Properties: properties, Rows: rows };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "ApplicationAccessKey": API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`AppSheet Error: ${text}`);

        // AppSheet a veces devuelve string vacío en updates exitosos
        return text ? JSON.parse(text) : [];
    } catch (error) {
        console.error("Error CRUD:", error);
        throw error;
    }
}

async function fetchData(tabla) {
    return await appSheetCRUD(tabla, "Find", [], {
        Selector: `Filter(${tabla}, true)`
    });
}

// ==========================================
// 3. UTILIDADES / HELPERS
// ==========================================

function formatearFecha(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("es-CL");
}

function formatoPrecio(valor) {
    if (!valor && valor !== 0) return "$0";
    return "$" + new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(valor);
}

function getKeyName(obj) {
    if (!obj) return "ID";
    const cands = ["ID", "Id", "Key", "Row ID", "RowID", "_ComputedKey", "_RowNumber"];
    return cands.find(k => Object.prototype.hasOwnProperty.call(obj, k)) || "ID";
}

function getKeyVal(row) {
    return row ? row[getKeyName(row)] : null;
}

function norm(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ==========================================
// 4. LÓGICA DE UTM AUTOMÁTICA (GLOBAL & CACHÉ)
// ==========================================

window.UTM_VALOR = 69751; 

async function inicializarUTM() {
    const CACHE_KEY = 'utm_cache_v2';
    const CACHE_TIME = 1000 * 60 * 60 * 24; 

    // A. Caché
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_TIME) {
                window.UTM_VALOR = data.valor;
                actualizarDOMconUTM(); 
                return window.UTM_VALOR;
            }
        } catch (e) { console.warn("Cache inválido"); }
    }

    // B. API
    try {
        const res = await fetch('https://mindicador.cl/api/utm');
        if (!res.ok) throw new Error('Error API');
        const data = await res.json();
        const valorReal = data.serie[0].valor;
        
        window.UTM_VALOR = valorReal;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ valor: valorReal, timestamp: Date.now() }));
        
        actualizarDOMconUTM();
        return window.UTM_VALOR;

    } catch (e) {
        console.warn("Fallo al obtener UTM. Usando valor por defecto.");
        return window.UTM_VALOR;
    }
}

async function obtenerUTM() {
    return await inicializarUTM();
}

function actualizarDOMconUTM() {
    const texto = formatoPrecio(window.UTM_VALOR);
    const elId = document.getElementById('lblUTM');
    if (elId) elId.textContent = texto;
    document.querySelectorAll('.live-utm').forEach(el => el.textContent = texto);
}

// ==========================================
// 5. CÁLCULO MATEMÁTICO
// ==========================================
function calcularHonorarioGlobal(unidades, factor, utm) {
    if (!(factor > 0 && utm > 0)) return { neto: 0, iva: 0, total: 0 };

    const baseF1 = utm * 2; 
    let netoTeorico = 0;

    if (unidades < 20) {
        netoTeorico = baseF1 * factor;
    } else {
        const extra = unidades - 20;
        const incremento = baseF1 * 0.013;
        const sumaBase = baseF1 + (extra * incremento);
        netoTeorico = sumaBase * factor;
    }

    const neto = Math.round(netoTeorico / 1000) * 1000;
    const total = Math.round(neto * 1.19);
    const iva = total - neto;

    return { neto, iva, total };
}

// ==========================================
// 6. AUTENTICACIÓN (SHA-256)
// ==========================================

async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getAuthUser() {
    try { return JSON.parse(localStorage.getItem('auth_user')); }
    catch (_) { return null; }
}

function setAuthUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
}

function requireAuth() {
    const u = getAuthUser();
    if (!u) { window.location.href = 'login.html'; }
}

async function loginWithAppSheet(email, password) {
    const usuarios = await fetchData("Usuarios");
    const u = usuarios.find(x => (x.Email || '').toLowerCase() === email.toLowerCase());

    if (!u) { throw new Error('Usuario no encontrado.'); }

    const providedHash = await sha256(password);
    const storedHash = (u.PasswordHash || '').toLowerCase();

    if (providedHash !== storedHash) {
        throw new Error('Contraseña inválida.');
    }

    setAuthUser({
        email: u.Email,
        // CORRECCIÓN: Asegúrate que tu tabla Usuarios tenga la columna "Nombre"
        nombre: u.Nombre || u.Email.split('@')[0], 
        rol: u.Rol || 'Colaborador',
        avatar: u.Avatar || '', // Guardamos avatar si existe
        ts: Date.now()
    });
    return true;
}

// ==========================================
// 7. LÓGICA DE PROPUESTA COMERCIAL
// ==========================================

function imprimirPDF() {
    const tituloOriginal = document.title;
    const nombreCliente = document.querySelector('.client-box h3')?.innerText || "Cliente";
    document.title = `Propuesta_Santa_Josefina_${nombreCliente.replace(/\s+/g, '_')}`;
    window.print();
    document.title = tituloOriginal;
}

async function cargarDatosPropuesta() {
    const params = new URLSearchParams(window.location.search);
    const idPropuesta = params.get('id');
    if (!idPropuesta) return; 

    try {
        document.body.style.cursor = 'wait';
        const tablaFuente = "ProspectosCopro"; 
        const datos = await fetchData(tablaFuente);
        const data = datos.find(r => getKeyVal(r) == idPropuesta);

        if (!data) {
            alert("No se encontraron datos.");
            return;
        }

        const nombreCliente = data['Nombre'] || data['Nombre Condominio'] || "Cliente";
        const clienteEl = document.querySelector('.client-box h3');
        if (clienteEl) clienteEl.textContent = nombreCliente;

        const unidades = parseInt(data['Unidades'] || 0);
        if (!window.UTM_VALOR || window.UTM_VALOR === 69751) await inicializarUTM();
        
        let precioNeto = parseInt(data['Precio Neto'] || 0);
        let total = 0;
        let costoUnitario = 0;

        if (precioNeto > 0) {
            const iva = Math.round(precioNeto * 0.19);
            total = precioNeto + iva;
        } 
        
        if (precioNeto > 0 && unidades > 0) {
             costoUnitario = Math.round(total / unidades);
             const tbody = document.querySelector('.print-table tbody');
             if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td>${unidades} Unidades</td>
                        <td class="text-right">${formatoPrecio(precioNeto)}</td>
                        <td class="text-right">${formatoPrecio(total)}</td>
                        <td class="text-right highlight"><strong>${formatoPrecio(costoUnitario)}</strong></td>
                    </tr>
                `;
             }
        }

    } catch (e) {
        console.error("Error cargando propuesta:", e);
    } finally {
        document.body.style.cursor = 'default';
    }
}

// ==========================================
// 8. INICIALIZACIÓN GLOBAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarUTM();
    const path = window.location.pathname;
    if (path.includes('login.html')) return;

    const esPaginaPropuesta = document.querySelector('.print-table') && document.querySelector('.client-box');
    const esPaginaContrato = path.includes('admin-condominios') || path.includes('admin-copropiedades');

    if (esPaginaPropuesta && !esPaginaContrato) {
        cargarDatosPropuesta();
    }
});

/* ==========================================
   LÓGICA GLOBAL DEL HEADER
   ========================================== */

window.toggleMenu = function() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.toggle('active');
};

// Logout unificado (Limpia todo)
window.logout = function() {
    if(confirm("¿Cerrar sesión?")) {
        localStorage.removeItem("auth_user"); // El token principal
        localStorage.removeItem("admin_token"); // Token antiguo por si acaso
        localStorage.removeItem("sesion_residente");
        window.location.href = "login.html"; 
    }
};

// Esta función se llama al cargar header.html en cada página
window.initHeader = function() {
    // 1. Cargar Usuario
    if(typeof getAuthUser === 'function') {
        const au = getAuthUser();
        if (au) {
            const nameEl = document.getElementById('headerUserName');
            const roleEl = document.getElementById('headerUserRole');
            
            // CORRECCIÓN AQUÍ: Usamos au.nombre (minúscula) que es como se guarda en loginWithAppSheet
            if(nameEl) nameEl.textContent = (au.nombre || au.email || "Usuario").split(' ')[0];
            if(roleEl) roleEl.textContent = au.rol || "Agente";
        }
    }

    // 2. Marcar Link Activo
    const path = window.location.pathname.split("/").pop();
    document.querySelectorAll('.nav-link, .dropdown-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if(href && href.split('?')[0] === path) {
            if(link.closest('.dropdown-menu')) {
                link.style.fontWeight = "bold";
                link.style.color = "#3b82f6";
                link.style.backgroundColor = "#f1f5f9";
                const parent = link.closest('.nav-dropdown');
                if(parent) parent.querySelector('.dropdown-toggle').classList.add('active');
            } else {
                link.classList.add('active');
            }
        }
    });

    // 3. Lógica Mobile Redirect
    if (window.innerWidth <= 1100) {
        const btnListado = document.querySelector('a[href="prospectos.html"]');
        const btnMapa = document.querySelector('a[href="mapa.html"]');
        if (btnListado) btnListado.href = "mobile_prospecto.html";
        if (btnMapa) btnMapa.href = "mobile_mapa.html";
    }
};

/* ==========================================
   LÓGICA DE ENRUTAMIENTO PWA (Router)
   ========================================== */
function iniciarEnrutamientoInteligente() {
    // 1. Verificar si estamos en la Landing Page (index.html)
    const path = window.location.pathname;
    if (!path.includes("index.html") && path !== "/") return;

    // 2. Verificar Agente (Prioridad 1)
    const agente = localStorage.getItem("auth_user");
    if (agente) {
        console.log("Detectado Agente: Redirigiendo a Dashboard...");
        window.location.href = "dashboard.html";
        return;
    }

    // 3. Verificar Residente (Prioridad 2)
    const residente = localStorage.getItem("sesion_residente");
    if (residente) {
        console.log("Detectado Residente: Redirigiendo a Portal...");
        window.location.href = "portal.html"; // O como se llame tu home de residentes
        return;
    }
    
    // 4. Si no hay nadie, se queda en index.html para que elijan botón
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", iniciarEnrutamientoInteligente);

/* ================= CARGA DE HEADER Y NAVEGACIÓN ================= */

async function loadHeader() {
    try {
        const response = await fetch("header.html");
        if (!response.ok) throw new Error("No se pudo cargar header.html");
        
        const text = await response.text();
        const headerDiv = document.getElementById("header");
        
        if (headerDiv) {
            headerDiv.innerHTML = text;

            // 1. RE-EJECUTAR SCRIPTS INCRUSTADOS (Tu código original)
            const scripts = headerDiv.querySelectorAll("script");
            scripts.forEach(oldScript => {
                const newScript = document.createElement("script");
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });

            // 2. CONFIGURAR NAVEGACIÓN (Lógica Agente vs Residente)
            setupNavigation();
        }
    } catch (e) { 
        console.error("Error cargando header:", e); 
    }
}

function setupNavigation() {
    // Referencias al DOM (elementos que vienen en header.html)
    const menuAgente = document.getElementById('menuAgente');
    const menuResidente = document.getElementById('menuResidente');
    const lblUser = document.getElementById('navUserName'); // Desktop
    const btnLogout = document.getElementById('btnLogoutNav'); // Desktop

    // Chequear Sesiones
    const sesionAgente = localStorage.getItem('sesion_activa');
    const sesionResidente = localStorage.getItem('sesion_externa');

    // Resetear visualización
    if(menuAgente) menuAgente.style.display = 'none';
    if(menuResidente) menuResidente.style.display = 'none';

    // CASO 1: ES AGENTE
    if (sesionAgente) {
        if(menuAgente) {
            menuAgente.style.display = 'flex';
            highlightActiveLink(menuAgente);
        }
        
        try {
            const user = JSON.parse(sesionAgente);
            if(lblUser) lblUser.innerText = user.nombre || 'Agente';
            
            // Configurar Logout Agente
            if(btnLogout) {
                btnLogout.onclick = () => {
                    if(confirm("¿Cerrar sesión de administración?")) {
                        localStorage.removeItem('sesion_activa');
                        window.location.href = 'login.html';
                    }
                };
            }
        } catch(e) {}
    } 
    // CASO 2: ES RESIDENTE
    else if (sesionResidente) {
        if(menuResidente) {
            menuResidente.style.display = 'flex';
            highlightActiveLink(menuResidente);
        }

        try {
            const user = JSON.parse(sesionResidente);
            // El objeto residente suele tener estructura { datos: { Nombre: ... } }
            const nombre = user.datos ? user.datos.Nombre.split(' ')[0] : 'Vecino';
            
            if(lblUser) lblUser.innerText = nombre;
            
            // Configurar Logout Residente
            if(btnLogout) {
                btnLogout.onclick = () => {
                    if(confirm("¿Salir del portal de residentes?")) {
                        localStorage.removeItem('sesion_externa');
                        window.location.href = 'login_residente.html';
                    }
                };
            }
        } catch(e) {}
    }
}

// Función auxiliar para resaltar la página actual en el menú
function highlightActiveLink(menuContainer) {
    if(!menuContainer) return;
    const currentPath = window.location.pathname.split('/').pop(); // Ej: 'reservas.html'
    const links = menuContainer.getElementsByTagName('a');
    
    for(let link of links) {
        const href = link.getAttribute('href');
        if(href && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
            link.classList.add('active');
            link.style.color = 'white';
            link.style.fontWeight = '700';
            link.style.borderBottom = '2px solid white'; // Opcional para dar más énfasis
        }
    }
}

// Función global para el menú hamburguesa (móvil)
window.toggleMenu = function() {
    const m1 = document.getElementById('menuAgente');
    const m2 = document.getElementById('menuResidente');
    
    // Toggle solo al que esté visible (display: flex)
    if(m1 && m1.style.display !== 'none') {
        m1.classList.toggle('active');
    } else if(m2 && m2.style.display !== 'none') {
        m2.classList.toggle('active');
    }
};

/* ================= FIN HEADER ================= */


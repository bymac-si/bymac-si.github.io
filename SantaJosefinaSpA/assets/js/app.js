// ============================================================================
// app.js — utilidades del CRM Santa Josefina
//
// IMPORTANTE: este archivo YA NO habla con AppSheet. Toda la conexión con los
// datos vive en assets/js/api_cliente.js, que debe cargarse ANTES que este
// archivo en cada página:
//
//     <script src="assets/js/api_cliente.js"></script>
//     <script src="assets/js/app.js"></script>
//
// Aquí solo quedan: PWA, avisos de conexión, utilidades, UTM, honorarios,
// propuesta comercial, cabecera, navegación y router.
// ============================================================================

// ==========================================
// 0. CONFIGURACIÓN GLOBAL: PÁGINAS PÚBLICAS
// ✅ CAMBIO: lista central de páginas donde NUNCA debe redirigir el router
// ni inyectarse el header de administración.
// ==========================================
const PAGINAS_PUBLICAS = [
    "index.html",
    "landing_desktop.html",
    "landing_mobile.html",
    "checklist_seguridad.html",
    "propiedades_publicas.html",
    "login.html",
    "login_residente.html",
];

function esPaginaPublica() {
    const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (path === "" || path === "/") return true; // raíz del sitio
    return PAGINAS_PUBLICAS.includes(path);
}

// Protege páginas internas y conserva la cotización solicitada al iniciar sesión.
if (typeof window.requireAuth !== "function") {
    window.requireAuth = function requireAuth() {
        let usuario = null;
        if (typeof getAuthUser === "function") {
            usuario = getAuthUser();
        } else {
            const raw = localStorage.getItem("auth_user") || localStorage.getItem("sesion_activa");
            if (raw) {
                try { usuario = JSON.parse(raw); }
                catch (e) { usuario = raw; }
            }
        }
        if (usuario) return true;

        const returnTo = window.location.pathname + window.location.search + window.location.hash;
        const loginUrl = new URL("login.html", window.location.href);
        loginUrl.searchParams.set("returnTo", returnTo);
        window.location.replace(loginUrl.href);
        return false;
    };
}

// ==========================================
// 1. PWA REGISTRATION
// ✅ CAMBIO: no registrar Service Worker en páginas públicas (landing).
// ==========================================
if ('serviceWorker' in navigator && !esPaginaPublica()) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
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
// 2. UTILIDADES / HELPERS
// ==========================================

function formatearFecha(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
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
// 3. LÓGICA DE UTM AUTOMÁTICA (GLOBAL & CACHÉ)
// ==========================================

window.UTM_VALOR = 69751;

async function inicializarUTM() {
    const CACHE_KEY = 'utm_cache_v2';
    const CACHE_TIME = 1000 * 60 * 60 * 24;

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
// 4. CÁLCULO MATEMÁTICO
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
// 5. LÓGICA DE PROPUESTA COMERCIAL
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
        const data = (datos || []).find(r => getKeyVal(r) == idPropuesta);

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
// 6. INICIALIZACIÓN GLOBAL Y CARGA COMPONENTES
// ✅ CAMBIO: en páginas públicas (landing) NO se carga header, NO se
// inicializa UTM, NO se enruta. Solo se cargan helpers globales.
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // ✅ CAMBIO: salida temprana para páginas públicas
    if (esPaginaPublica()) {
        // En login solo se necesita el helper de sesión, nada más.
        // En landing no se necesita nada de app.js.
        return;
    }

    // 1. UTM
    inicializarUTM();

    // 2. Cargar Header (Independiente de la página)
    await loadHeader();

    // 3. Enrutamiento PWA
    iniciarEnrutamientoInteligente();

    // 4. Lógica de páginas específicas
    const path = window.location.pathname;
    if (path.includes('login.html')) return;

    const esPaginaPropuesta = document.querySelector('.print-table') && document.querySelector('.client-box');
    const esPaginaContrato = path.includes('admin-condominios') || path.includes('admin-copropiedades');

    if (esPaginaPropuesta && !esPaginaContrato) {
        cargarDatosPropuesta();
    }
});

// ==========================================
// 7. LÓGICA DEL HEADER (SISTEMA DE NAVEGACIÓN)
// ✅ CAMBIO: loadHeader() se salta páginas públicas para no inyectar
// el header de admin en la landing.
// ==========================================

async function loadHeader() {
    // ✅ CAMBIO: no cargar header de admin en páginas públicas
    if (esPaginaPublica()) return;

    const headerContainer = document.getElementById("header");
    if (!headerContainer) return;

    // Algunas páginas ya inyectan header.html por su cuenta (con initHeader()).
    if (headerContainer.querySelector('header') || headerContainer.dataset.cargado === '1') {
        setupNavigation();
        return;
    }

    try {
        const response = await fetch("header.html");
        if (!response.ok) throw new Error("No se pudo cargar header.html");

        const text = await response.text();
        headerContainer.innerHTML = text;
        headerContainer.dataset.cargado = '1';

        // --- RE-EJECUCIÓN DE SCRIPTS PARA MOBILE TOGGLE ---
        const scripts = headerContainer.querySelectorAll("script");
        scripts.forEach(oldScript => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            headerContainer.appendChild(newScript).parentNode.removeChild(newScript);
        });

        // Configurar UI según sesión
        setupNavigation();

    } catch (e) {
        console.error("Error cargando header:", e);
    }
}

function setupNavigation() {
    const menuAgente = document.getElementById('menuAgente') || document.getElementById('navMenu');
    const menuResidente = document.getElementById('menuResidente');
    const lblUser = document.getElementById('headerUserName') || document.getElementById('navUserName');
    const lblRole = document.getElementById('headerUserRole');

    const sesionAgente = localStorage.getItem('auth_user') || localStorage.getItem('sesion_activa');
    const sesionResidente = localStorage.getItem('sesion_residente') || localStorage.getItem('sesion_externa');

    // Reset Visual
    if (menuAgente) menuAgente.style.display = 'none';
    if (menuResidente) menuResidente.style.display = 'none';

    if (sesionAgente) {
        if (menuAgente) {
            menuAgente.style.display = 'flex';
            highlightActiveLink(menuAgente);
        }
        try {
            const user = JSON.parse(sesionAgente);
            if (lblUser) lblUser.innerText = (user.nombre || user.Nombre || 'Usuario').split(' ')[0];
            if (lblRole) lblRole.innerText = user.rol || user.Rol || 'Agente';
        } catch (e) {}
    }
    else if (sesionResidente) {
        if (menuResidente) {
            menuResidente.style.display = 'flex';
            highlightActiveLink(menuResidente);
        }
        try {
            const user = JSON.parse(sesionResidente);
            const nombre = user.datos ? user.datos.Nombre : (user.Nombre || 'Vecino');
            if (lblUser) lblUser.innerText = String(nombre).split(' ')[0];
            if (lblRole) lblRole.innerText = 'Residente';
        } catch (e) {}
    }

    // Ajuste links mobile
    if (window.innerWidth <= 1100) {
        document.querySelectorAll('a[href="prospectos.html"]').forEach(a => a.href = "mobile_prospecto.html");
        document.querySelectorAll('a[href="mapa.html"]').forEach(a => a.href = "mobile_mapa.html");
    }
}

function highlightActiveLink(container) {
    if (!container) return;
    const path = window.location.pathname.split("/").pop() || "index.html";
    container.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.split('?')[0] === path) {
            link.classList.add('active');
            if (link.closest('.dropdown-menu')) {
                link.style.fontWeight = "bold";
                link.style.color = "#3b82f6";
            }
        }
    });
}

// ==========================================
// 8. ENRUTAMIENTO PWA (Router)
// ✅ CAMBIO: el router ya NO actúa en páginas públicas. Además
// solo redirige si REALMENTE hay sesión activa.
// ==========================================

function iniciarEnrutamientoInteligente() {
    // ✅ CAMBIO: nunca redirigir desde páginas públicas
    if (esPaginaPublica()) return;

    const path = window.location.pathname.split("/").pop() || "index.html";

    // Solo actúa en la raíz real del sitio (index.html o "/")
    const isRoot = path === "index.html" || path === "" || window.location.pathname === "/";
    if (!isRoot) return;

    // El equipo tiene prioridad; los residentes van a su portal real.
    if (localStorage.getItem("auth_user") || localStorage.getItem("sesion_activa")) {
        window.location.href = "dashboard.html";
    } else if (localStorage.getItem("sesion_residente") || localStorage.getItem("sesion_externa")) {
        window.location.href = "portal_residente.html";
    }
    // ✅ Si no hay ninguna sesión, no hace nada: la landing se muestra normal.
}

// ==========================================
// 9. SESIÓN: SALIR Y MENÚ
// ==========================================

// Cierre de sesión del equipo. Borra el token del CRM y los datos de pantalla.
window.logout = function (event) {
    if (event) event.preventDefault();
    if (!confirm("¿Cerrar sesión?")) return;
    if (typeof cerrarSesionLocal === "function") {
        cerrarSesionLocal();
    } else {
        ["crm_token", "crm_cc", "auth_user", "sesion_activa"].forEach(k => localStorage.removeItem(k));
    }
    window.location.href = "login.html";
};

window.toggleMenu = function () {
    const menu = document.getElementById('navMenu') || document.getElementById('menuAgente') || document.getElementById('menuResidente');
    if (menu) menu.classList.toggle('active');
};

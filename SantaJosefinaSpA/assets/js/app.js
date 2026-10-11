// ============================================================================
// app.js: utilidades comunes del CRM Santa Josefina
// Requiere assets/js/api_cliente.js cargado ANTES (datos, sesión, fetchData, requireAuth...).
// Ya no contiene claves ni lógica de acceso a datos.
// ============================================================================

if (typeof apiPost !== 'function') {
    console.error('app.js: falta cargar assets/js/api_cliente.js antes de app.js');
}

// ==========================================
// 0. PWA Y AVISO SIN CONEXIÓN
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.error('Error SW:', err));
    });
}

window.addEventListener('offline', () => mostrarAvisoOffline(true));
window.addEventListener('online', () => mostrarAvisoOffline(false));

function mostrarAvisoOffline(estamosOffline) {
    let aviso = document.getElementById('aviso-offline');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'aviso-offline';
        aviso.style.cssText = "position:fixed; bottom:0; left:0; right:0; background:#ef4444; color:white; text-align:center; padding:10px; z-index:9999; font-weight:bold; display:none;";
        aviso.textContent = "⚠️ Sin conexión. No podrás guardar cambios.";
        document.body.appendChild(aviso);
    }
    aviso.style.display = estamosOffline ? 'block' : 'none';
}

// ==========================================
// 1. UTILIDADES
// ==========================================

// Escapa texto antes de ponerlo dentro de HTML (innerHTML). Úselo con TODO dato que venga de la hoja.
function escapeHtml(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Convierte lo que llegue de la hoja en una fecha LOCAL (sin correr un día por la zona horaria).
//  - "2026-10-09" o "2026-10-09T14:30:00" -> ISO (formato normal del backend)
//  - "10/09/2026" -> MM/DD/AAAA (formato antiguo de AppSheet); si el primer número pasa de 12 se lee como DD/MM
function parseFechaLocal(v) {
    if (v === undefined || v === null || v === '') return null;
    if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v;
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
        const a = +m[1], b = +m[2], y = +m[3];
        return a > 12 ? new Date(y, b - 1, a) : new Date(y, a - 1, b);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function formatearFecha(v) {
    const d = parseFechaLocal(v);
    return d ? d.toLocaleDateString("es-CL") : "";
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
// 2. UTM (valor del mes, con caché de 24 h)
// ==========================================
window.UTM_VALOR = 69751;        // valor de respaldo: solo se usa si no hay API ni caché
window.UTM_FUENTE = 'respaldo';  // 'api' | 'cache' | 'cache-antigua' | 'respaldo'

async function inicializarUTM() {
    const CACHE_KEY = 'utm_cache_v2';
    const CACHE_TIME = 1000 * 60 * 60 * 24;
    let guardado = null;

    try { guardado = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { guardado = null; }
    if (guardado && guardado.valor > 0 && Date.now() - guardado.timestamp < CACHE_TIME) {
        window.UTM_VALOR = guardado.valor;
        window.UTM_FUENTE = 'cache';
        actualizarDOMconUTM();
        return window.UTM_VALOR;
    }

    try {
        const res = await fetch('https://mindicador.cl/api/utm');
        if (!res.ok) throw new Error('Error API');
        const data = await res.json();
        const valorReal = data.serie[0].valor;
        if (!(valorReal > 0)) throw new Error('Valor inválido');
        window.UTM_VALOR = valorReal;
        window.UTM_FUENTE = 'api';
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ valor: valorReal, timestamp: Date.now() })); } catch (e) {}
    } catch (e) {
        if (guardado && guardado.valor > 0) {
            // Mejor un valor viejo real que el de respaldo fijo.
            window.UTM_VALOR = guardado.valor;
            window.UTM_FUENTE = 'cache-antigua';
        } else {
            window.UTM_FUENTE = 'respaldo';
        }
        console.warn("No se pudo obtener la UTM. Fuente:", window.UTM_FUENTE);
    }
    actualizarDOMconUTM();
    return window.UTM_VALOR;
}

async function obtenerUTM() {
    return await inicializarUTM();
}

function actualizarDOMconUTM() {
    let texto = formatoPrecio(window.UTM_VALOR);
    if (window.UTM_FUENTE === 'respaldo' || window.UTM_FUENTE === 'cache-antigua') texto += ' ⚠';
    const elId = document.getElementById('lblUTM');
    if (elId) elId.textContent = texto;
    document.querySelectorAll('.live-utm').forEach(el => { el.textContent = texto; });
}

// ==========================================
// 3. HONORARIO DE ADMINISTRACIÓN
// ==========================================
// Base del honorario en UTM para una comunidad de hasta 20 unidades con factor 1.
// ATENCIÓN: las propuestas usan 2 y dashboardcopropiedades.html usa 2,15. Conviene dejar un solo valor.
const HONORARIO_BASE_UTM = 2;

function calcularHonorarioGlobal(unidades, factor, utm, baseUtm = HONORARIO_BASE_UTM) {
    if (!(factor > 0 && utm > 0)) return { neto: 0, iva: 0, total: 0 };

    const baseF1 = utm * baseUtm;
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
// 4. PROPUESTA COMERCIAL
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
        // Solo se pide la fila del prospecto (la tabla tiene cientos de edificios).
        const filas = await fetchData("ProspectosCopro", { column: "ID", value: idPropuesta });
        const data = filas.find(r => String(getKeyVal(r)) === String(idPropuesta));

        if (!data) {
            alert("No se encontraron datos.");
            return;
        }

        const nombreCliente = data['Nombre'] || "Cliente";
        const clienteEl = document.querySelector('.client-box h3');
        if (clienteEl) clienteEl.textContent = nombreCliente;

        const unidades = parseInt(data['Unidades'] || 0) || 0;
        let precioNeto = parseInt(data['Presupuesto'] || 0) || 0;

        // Sin presupuesto cargado: se calcula con la tarifa de la comuna y la UTM del mes.
        if (!(precioNeto > 0) && unidades > 0) {
            if (window.UTM_FUENTE === 'respaldo') await inicializarUTM();
            const tarifas = await fetchData("TablaTarifas");
            const t = tarifas.find(x => norm(x.Comuna) === norm(data['Comuna']));
            const factor = t ? parseFloat(t.FactorComuna ?? t.Factor) : 0;
            precioNeto = calcularHonorarioGlobal(unidades, factor, window.UTM_VALOR).neto;
        }

        if (precioNeto > 0 && unidades > 0) {
            const total = precioNeto + Math.round(precioNeto * 0.19);
            const costoUnitario = Math.round(total / unidades);
            const tbody = document.querySelector('.print-table tbody');
            if (tbody) {
                // Solo números ya calculados: no entra texto de la hoja en este HTML.
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
// 5. HEADER Y FOOTER (se cargan aquí; las páginas no necesitan su propio cargador)
// ==========================================
async function loadHeader() {
    const headerContainer = document.getElementById("header");
    if (!headerContainer) return;

    try {
        const response = await fetch("header.html");
        if (!response.ok) throw new Error("No se pudo cargar header.html");
        headerContainer.innerHTML = await response.text();

        // innerHTML no ejecuta scripts: se vuelven a crear para que corran (menú, usuario, salir).
        headerContainer.querySelectorAll("script").forEach(oldScript => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.textContent));
            headerContainer.appendChild(newScript).parentNode.removeChild(newScript);
        });

        setupNavigation();
    } catch (e) {
        console.error("Error cargando header:", e);
    }
}

async function loadFooter() {
    const footerContainer = document.getElementById("footer");
    if (!footerContainer) return;
    try {
        const response = await fetch("footer.html");
        if (!response.ok) throw new Error("No se pudo cargar footer.html");
        footerContainer.innerHTML = await response.text();
        const y = document.getElementById("y");
        if (y) y.textContent = new Date().getFullYear();
    } catch (e) {
        console.error("Error cargando footer:", e);
    }
}

// ==========================================
// 6. NAVEGACIÓN SEGÚN SESIÓN
// ==========================================
function sesionEquipoValida() {
    const t = (typeof getToken === 'function') ? getToken() : null;
    return !!(t && !tokenVencido(t) && getAuthUser());
}

function sesionResidenteValida() {
    const t = localStorage.getItem('crm_token_res');
    return !!(t && !tokenVencido(t));
}

function setupNavigation() {
    // #navMenu (menú del equipo) NO se toca: su visibilidad la controla el CSS del header.
    // Esto solo aplica a headers que tengan #menuAgente / #menuResidente (portal).
    const menuAgente = document.getElementById('menuAgente');
    const menuResidente = document.getElementById('menuResidente');
    const lblUser = document.getElementById('headerUserName') || document.getElementById('navUserName');
    const lblRole = document.getElementById('headerUserRole');

    if (menuAgente) menuAgente.style.display = 'none';
    if (menuResidente) menuResidente.style.display = 'none';

    if (sesionEquipoValida()) {
        if (menuAgente) {
            menuAgente.style.display = 'flex';
            highlightActiveLink(menuAgente);
        }
        const user = getAuthUser() || {};
        if (lblUser) lblUser.textContent = String(user.nombre || user.Nombre || 'Usuario').split(' ')[0];
        if (lblRole) lblRole.textContent = user.rol || user.Rol || 'Agente';
    } else if (sesionResidenteValida()) {
        if (menuResidente) {
            menuResidente.style.display = 'flex';
            highlightActiveLink(menuResidente);
        }
        try {
            const user = JSON.parse(localStorage.getItem('sesion_residente'));
            const nombre = user && user.datos ? user.datos.Nombre : ((user && user.Nombre) || 'Vecino');
            if (lblUser) lblUser.textContent = String(nombre || 'Vecino').split(' ')[0];
            if (lblRole) lblRole.textContent = 'Residente';
        } catch (e) {}
    }

    // En pantallas chicas se usan las versiones móviles
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

// Desde la portada: con sesión válida va directo al panel (o al portal del residente).
function iniciarEnrutamientoInteligente() {
    const path = window.location.pathname;
    const isRoot = path.includes("index.html") || path === "/" || path.endsWith("/");
    if (!isRoot) return;

    if (sesionEquipoValida()) {
        if (localStorage.getItem("crm_cc") === "1") window.location.href = "cambiar-clave.html";
        else irAlPanel();
    } else if (sesionResidenteValida()) {
        window.location.href = "portal.html";
    }
}

// Cerrar sesión (equipo o residente)
window.logout = function (event) {
    if (event) event.preventDefault();
    if (!confirm("¿Cerrar sesión?")) return;
    const eraResidente = !sesionEquipoValida() && sesionResidenteValida();
    cerrarSesionLocal();
    logoutResidente();
    window.location.href = eraResidente ? LOGIN_RESIDENTE_URL : "login.html";
};

window.toggleMenu = function () {
    const menu = document.getElementById('navMenu') || document.getElementById('menuAgente') || document.getElementById('menuResidente');
    if (menu) menu.classList.toggle('active');
};

// ==========================================
// 7. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    inicializarUTM(); // no bloquea la carga de la página

    await Promise.all([loadHeader(), loadFooter()]);

    iniciarEnrutamientoInteligente();

    const path = window.location.pathname;
    if (path.includes('login')) return;

    const esPaginaPropuesta = document.querySelector('.print-table') && document.querySelector('.client-box');
    const esPaginaContrato = path.includes('admin-condominios') || path.includes('admin-copropiedades');

    if (esPaginaPropuesta && !esPaginaContrato) {
        cargarDatosPropuesta();
    }
});
// ==========================================
// 1. CONFIGURACIÓN APPSHEET
// ==========================================
const APP_ID = "247b67e5-5b42-49a5-92a1-16c4357f5c7e";
const API_KEY = "V2-bKT1n-onhYX-SHl8K-zPPx8-6QwfJ-pp9Pi-UIrcy-gcLGM"; // ⚠️ Ocultar en producción

// ==========================================
// 2. CORE: CONEXIÓN DE DATOS (CRUD)
// ==========================================

async function appSheetCRUD(tabla, action, rows, properties = {}) {
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
    // Ajuste simple de zona horaria para visualización
    const d = new Date(iso);
    return d.toLocaleDateString("es-CL");
}

function formatoPrecio(valor) {
    if (!valor && valor !== 0) return "$0";
    return "$" + new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(valor);
}

// Obtener ID de cualquier objeto de forma segura
function getKeyName(obj) {
    if (!obj) return "ID";
    const cands = ["ID", "Id", "Key", "Row ID", "RowID", "_ComputedKey", "_RowNumber"];
    return cands.find(k => Object.prototype.hasOwnProperty.call(obj, k)) || "ID";
}

function getKeyVal(row) {
    return row ? row[getKeyName(row)] : null;
}

// Normalizar texto para búsquedas (quita tildes y mayúsculas)
function norm(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ==========================================
// 4. LÓGICA DE UTM AUTOMÁTICA (GLOBAL & CACHÉ)
// ==========================================

// Variable Global Accesible desde todo el CRM
window.UTM_VALOR = 69751; // Valor por defecto (seguro)

async function inicializarUTM() {
    const CACHE_KEY = 'utm_cache_v2';
    const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 horas

    // A. Intentar leer de caché
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_TIME) {
                window.UTM_VALOR = data.valor;
                console.log("UTM (Caché):", window.UTM_VALOR);
                actualizarDOMconUTM(); 
                return window.UTM_VALOR;
            }
        } catch (e) { console.warn("Cache inválido"); }
    }

    // B. Consultar API
    try {
        console.log("Consultando API mindicador.cl...");
        const res = await fetch('https://mindicador.cl/api/utm');
        if (!res.ok) throw new Error('Error API');
        const data = await res.json();
        
        // Tomamos el valor de la serie
        const valorReal = data.serie[0].valor;
        
        // Actualizamos variable global y caché
        window.UTM_VALOR = valorReal;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ valor: valorReal, timestamp: Date.now() }));
        
        console.log("UTM (API):", window.UTM_VALOR);
        actualizarDOMconUTM();
        return window.UTM_VALOR;

    } catch (e) {
        console.warn("Fallo al obtener UTM online. Usando valor por defecto.", e);
        return window.UTM_VALOR;
    }
}

// Para compatibilidad con código antiguo que use obtenerUTM()
async function obtenerUTM() {
    // Si ya tenemos un valor fresco (distinto al default o confirmado), lo devolvemos
    // Pero mejor llamamos a inicializarUTM que maneja la lógica de caché
    return await inicializarUTM();
}

// Actualiza etiquetas visuales automáticamente
function actualizarDOMconUTM() {
    const texto = formatoPrecio(window.UTM_VALOR);
    
    // Elemento principal del header
    const elId = document.getElementById('lblUTM');
    if (elId) elId.textContent = texto;

    // Cualquier otro elemento con clase live-utm
    document.querySelectorAll('.live-utm').forEach(el => el.textContent = texto);
}


// ==========================================
// 5. CÁLCULO MATEMÁTICO CENTRALIZADO
// (Fórmula del contrato: Base 2.15 UTM + Redondeo)
// ==========================================
function calcularHonorarioGlobal(unidades, factor, utm) {
    if (!(factor > 0 && utm > 0)) return { neto: 0, iva: 0, total: 0 };

    const baseF1 = utm * 2; // Variable base
    let netoTeorico = 0;

    if (unidades < 20) {
        // Caso < 20
        netoTeorico = baseF1 * factor;
    } else {
        // Caso >= 20: (Base + Extra) * Factor
        const extra = unidades - 20;
        const incremento = baseF1 * 0.013;
        const sumaBase = baseF1 + (extra * incremento);
        netoTeorico = sumaBase * factor;
    }

    // REDOND.MULT( ; 1000) -> Redondear al 1000 más cercano
    const neto = Math.round(netoTeorico / 1000) * 1000;

    // Total = Neto * 1.19 (Redondeado al entero)
    const total = Math.round(neto * 1.19);

    // IVA por diferencia
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

function logout() {
    localStorage.removeItem('auth_user');
    window.location.href = 'login.html';
}

function requireAuth() {
    const u = getAuthUser();
    if (!u) { window.location.href = 'login.html'; }
}

async function loginWithAppSheet(email, password) {
    const usuarios = await fetchData("Usuarios");
    // Normalizamos email para evitar errores de mayúsculas/minúsculas
    const u = usuarios.find(x => (x.Email || '').toLowerCase() === email.toLowerCase());

    if (!u) { throw new Error('Usuario no encontrado.'); }

    const providedHash = await sha256(password);
    const storedHash = (u.PasswordHash || '').toLowerCase();

    // Comparación segura
    if (providedHash !== storedHash) {
        throw new Error('Contraseña inválida.');
    }

    setAuthUser({
        email: u.Email,
        nombre: u.Nombre || '',
        rol: u.Rol || 'Colaborador',
        ts: Date.now()
    });
    return true;
}

// ==========================================
// 7. LÓGICA DE PROPUESTA COMERCIAL (PDF)
// Se ejecuta solo en la vista de Propuesta
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

    if (!idPropuesta) return; // Modo diseño o sin ID

    try {
        document.body.style.cursor = 'wait';

        // Usamos la tabla "Propuestas" si existe, o "ProspectosCopro"
        // Ajusta "Propuestas" al nombre real de tu tabla si usas una distinta para guardar las generadas
        const tablaFuente = "ProspectosCopro"; 
        const datos = await fetchData(tablaFuente);
        const data = datos.find(r => getKeyVal(r) == idPropuesta);

        if (!data) {
            alert("No se encontraron datos para la propuesta.");
            return;
        }

        // --- Inyectar datos en el HTML ---
        
        // 1. Cliente
        const nombreCliente = data['Nombre'] || data['Nombre Condominio'] || data['Cliente'] || "Cliente";
        const clienteEl = document.querySelector('.client-box h3');
        if (clienteEl) clienteEl.textContent = nombreCliente;

        // 2. Cálculos (Usando UTM global)
        const unidades = parseInt(data['Unidades'] || 0);
        
        // Aseguramos que UTM esté cargada
        if (!window.UTM_VALOR || window.UTM_VALOR === 69751) {
             await inicializarUTM();
        }
        
        let precioNeto = parseInt(data['Precio Neto'] || 0);
        let total = 0;
        let costoUnitario = 0;

        if (precioNeto > 0) {
            // Si ya venía calculado
            const iva = Math.round(precioNeto * 0.19);
            total = precioNeto + iva;
        } else {
            // Si hay que calcular al vuelo (necesitaríamos cargar tarifas aquí, pero para simplificar...)
            // renderPropuestaCompleja() <- idealmente llamaríamos a la lógica completa
        }
        
        // Si hay datos calculados, llenar tabla
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
    // 1. Cargar UTM en segundo plano
    inicializarUTM();

    const path = window.location.pathname;

    // 2. Si es login, no hacemos nada más
    if (path.includes('login.html')) return;

    // 3. DETECCIÓN DE PÁGINA
    
    // A. ¿Es la página "Propuesta Comercial" (la del PDF simple)?
    const esPaginaPropuesta = document.querySelector('.print-table') && document.querySelector('.client-box');
    
    // B. ¿Es la página de "Contrato" (admin-condominios)?
    const esPaginaContrato = path.includes('admin-condominios') || path.includes('admin-copropiedades');

    // C. Ejecutar lógica específica solo si corresponde
    if (esPaginaPropuesta && !esPaginaContrato) {
        cargarDatosPropuesta();
    }
});

/* ==========================================
   LÓGICA GLOBAL DEL HEADER
   (Funciona aunque el header se cargue por fetch)
   ========================================== */

// 1. Función Toggle para el Menú Sandwich
window.toggleMenu = function() {
    const menu = document.getElementById('navMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
};

// 2. Función Logout Global
window.logout = function() {
    if(confirm("¿Cerrar sesión?")) {
        localStorage.removeItem("admin_token"); 
        localStorage.removeItem("sesion_residente");
        window.location.href = "login.html"; 
    }
};

// 3. Inicializar Header (Cargar usuario y marcar link activo)
// Esta función debe llamarse DESPUÉS de que el header.html se haya insertado.
window.initHeader = function() {
    // 1. Cargar Usuario (Código existente...)
    if(typeof getAuthUser === 'function') {
        const au = getAuthUser();
        if (au) {
            const nameEl = document.getElementById('headerUserName');
            const roleEl = document.getElementById('headerUserRole');
            if(nameEl) nameEl.textContent = (au.Nombre || au.email || "Usuario").split(' ')[0];
            if(roleEl) roleEl.textContent = au.rol || "Agente";
        }
    }

    // 2. Marcar Link Activo (Código existente...)
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

    /* ======================================================
       3. LÓGICA MOBILE REDIRECT (NUEVO)
       Si la pantalla es menor a 1100px, cambiamos los links
       ====================================================== */
    if (window.innerWidth <= 1100) {
        // Buscamos los enlaces específicos por su destino original
        const btnListado = document.querySelector('a[href="prospectos.html"]');
        const btnMapa = document.querySelector('a[href="mapa.html"]');

        // Si existen en el menú, les cambiamos el destino
        if (btnListado) {
            btnListado.href = "mobile_prospecto.html"; // Redirige al formulario móvil
            // Opcional: Cambiar icono o texto para indicar que es ingreso rápido
            // btnListado.innerHTML = '<i class="fa-solid fa-plus"></i> Nuevo Prospecto'; 
        }

        if (btnMapa) {
            btnMapa.href = "mobile_mapa.html"; // Redirige al mapa móvil (tipo App)
        }
    }
};
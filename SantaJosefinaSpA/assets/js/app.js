// =====================
// Configuración AppSheet
// =====================
const APP_ID = "247b67e5-5b42-49a5-92a1-16c4357f5c7e";
const API_KEY = "V2-bKT1n-onhYX-SHl8K-zPPx8-6QwfJ-pp9Pi-UIrcy-gcLGM"; // ⚠️ OJO: En producción esto no debería estar visible en el front-end.

// =====================
// CRUD genérico contra AppSheet
// =====================

async function appSheetCRUD(tabla, action, rows, properties = {}) {
    const url = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tabla}/Action`;
    const body = { Action: action, Properties: properties, Rows: rows };

    // console.log("➡️ Enviando a AppSheet"); // Comentado para limpiar consola

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "ApplicationAccessKey": API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const text = await res.text();
    // console.log("⬅️ Respuesta AppSheet");

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
    return "$" + new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(valor);
}

function getKeyName(obj) {
    const cands = ["ID", "Id", "Key", "Row ID", "RowID", "_ComputedKey", "_RowNumber"];
    return cands.find(k => Object.prototype.hasOwnProperty.call(obj, k)) || "ID";
}

function getKeyVal(row) {
    return row[getKeyName(row)];
}

// =====================
// AUTENTICACIÓN (MVP)
// =====================

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
    // Nota: Asegúrate que tu tabla en AppSheet se llame "Usuarios"
    const usuarios = await fetchData("Usuarios");
    const u = usuarios.find(x => (x.Email || '').toLowerCase() === email.toLowerCase());

    if (!u) { throw new Error('Usuario no encontrado.'); }

    const providedHash = await sha256(password);
    const storedHash = (u.PasswordHash || '').toLowerCase();

    // Si no tienes hasheado el pass en tu excel de prueba, comenta el if de abajo y usa:
    // if (password !== u.PasswordHash) ...
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

// =========================================
// LÓGICA PROPUESTA COMERCIAL (NUEVO)
// =========================================

/**
 * 1. Función para imprimir
 * Oculta elementos innecesarios y lanza el diálogo del navegador.
 */
function imprimirPDF() {
    const tituloOriginal = document.title;
    
    // Intentamos ponerle nombre al archivo PDF basado en el cliente
    const nombreCliente = document.querySelector('.client-box h3')?.innerText || "Cliente";
    document.title = `Propuesta_Santa_Josefina_${nombreCliente.replace(/\s+/g, '_')}`;

    window.print();

    document.title = tituloOriginal;
}

/**
 * 2. Cargar datos de la propuesta
 * Supone que en la URL viene ?id=XYZ y busca en la tabla "Propuestas"
 */
async function cargarDatosPropuesta() {
    // Obtener ID de la URL
    const params = new URLSearchParams(window.location.search);
    const idPropuesta = params.get('id');

    if (!idPropuesta) {
        console.log("No se especificó ID de propuesta en la URL.");
        return; // Estamos en modo diseño o sin datos
    }

    try {
        // Muestra algún indicador de carga si quieres
        document.body.style.cursor = 'wait';

        // 1. Traer datos de AppSheet (Ajusta el nombre de la tabla si es distinto)
        const propuestas = await fetchData("Propuestas"); 
        const data = propuestas.find(r => getKeyVal(r) == idPropuesta);

        if (!data) {
            alert("Propuesta no encontrada");
            return;
        }

        // 2. Inyectar datos en el DOM (HTML)
        // Asegúrate que los nombres de columna (data.NombreColumna) coincidan con tu AppSheet
        
        // A. Cliente y Título
        const clienteEl = document.querySelector('.client-box h3');
        if (clienteEl) clienteEl.textContent = data['Nombre Condominio'] || data['Cliente'];

        // B. Cálculos Matemáticos (Si vienen de AppSheet úsalos, si no, calcúlalos aquí)
        const unidades = parseInt(data['Unidades'] || 0);
        const precioNeto = parseInt(data['Precio Neto'] || 0); // Asumiendo que guardas el neto
        const iva = Math.round(precioNeto * 0.19);
        const total = precioNeto + iva;
        const costoPorUnidad = unidades > 0 ? Math.round(total / unidades) : 0;

        // C. Rellenar Tabla de Precios
        const tbody = document.querySelector('.print-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td>${unidades} Unidades</td>
                    <td class="text-right">${formatoPrecio(precioNeto)}</td>
                    <td class="text-right">${formatoPrecio(total)}</td>
                    <td class="text-right highlight"><strong>${formatoPrecio(costoPorUnidad)}</strong></td>
                </tr>
            `;
        }

        // D. Actualizar textos de desglose
        const notesDiv = document.querySelector('.notes');
        if (notesDiv) {
            notesDiv.innerHTML = `
                <p>(*) El costo aproximado por unidad se calcula con el Total con IVA y se ajusta al prorrateo de cada unidad.</p>
                <p><strong>Desglose por unidad:</strong> Neto: ${formatoPrecio(Math.round(precioNeto/unidades))} | IVA: ${formatoPrecio(Math.round(iva/unidades))} | Total: ${formatoPrecio(costoPorUnidad)}</p>
            `;
        }
        
        // E. Fecha u otros datos
        // document.querySelector('.fecha-propuesta').textContent = formatearFecha(data['Fecha']);

    } catch (e) {
        console.error("Error cargando propuesta:", e);
        alert("Error al cargar los datos: " + e.message);
    } finally {
        document.body.style.cursor = 'default';
    }
}

// =====================
// Inicialización
// =====================
// =====================
// Inicialización Segura
// =====================
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // 1. Si es login, no hacer nada
    if (path.includes('login.html')) return;

    // 2. DETECCIÓN INTELIGENTE:
    // Solo ejecutamos "cargarDatosPropuesta" si estamos en la página de propuesta
    // (buscamos si existe un elemento único de esa página, por ejemplo la tabla de precios)
    const esPaginaPropuesta = document.querySelector('.print-table') && document.querySelector('.client-box');
    
    // Además, evitamos correr esto si estamos en "admin-condominios" (o como se llame tu archivo de contrato)
    const esPaginaContrato = path.includes('admin-condominios') || path.includes('admin-copropiedades');

    if (esPaginaPropuesta && !esPaginaContrato) {
        // Solo aquí intentamos cargar la propuesta
        cargarDatosPropuesta();
    }
});
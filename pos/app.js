/**
 * POS El Carro del Ocho - Lógica de Venta (Frontend)
 * Versión Depurada: Solo Venta y Caja (Sin Administración)
 */

// ==========================================
// 1. CONFIGURACIÓN Y ESTADO
// ==========================================

// ¡IMPORTANTE! Pega aquí la misma URL de Apps Script que usas en el admin
const API_URL = "https://script.google.com/macros/s/AKfycbzXtHVx96y5T6c7qaqm0yTNzVL8ygCMmy7X2Q99ZrWDxSDEBzBRGvVhjDlSn457eERn/exec";

// Estado de la Aplicación
let db = {
    productos: [],
    categorias: [],
    usuarios: [],
    config: {}
};

let cart = [];
let currentUser = null; // Cajero logueado
let currentTurnData = null; // Info del turno (AM/PM, Fecha Comercial)

// Formateador de moneda (CLP)
const formatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
});

// ==========================================
// 2. INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadSystemData();       // Carga inicial
    updateClock();          // Iniciar reloj interno
    startAutoUpdate();      // Iniciar sincronización silenciosa
    setInterval(updateClock, 60000); // Actualizar reloj cada minuto
});

// Carga de datos (Soporta modo silencioso para no bloquear venta)
async function loadSystemData(silent = false) {
    const container = document.getElementById('products-container');

    if (!silent) {
        container.innerHTML = `
            <div style="grid-column: 1/-1;" class="text-center mt-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Cargando sistema...</p>
            </div>`;
    }

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // 1. Procesar Usuarios (Solo activos)
        db.usuarios = data.usuarios.filter(u => String(u.Activo).toLowerCase() === 'true');

        // 2. Procesar Categorías (Ordenadas)
        db.categorias = data.categorias.sort((a, b) => (parseInt(a.Orden) || 99) - (parseInt(b.Orden) || 99));

        // 3. Procesar Productos (Solo activos, limpieza de precios y colores)
        db.productos = data.productos
            .filter(p => String(p.Activo).trim().toUpperCase() === 'TRUE')
            .map(p => ({
                ...p,
                // Limpieza robusta de precio (quita signos $ y puntos)
                Precio: parseInt(String(p.Precio).replace(/\D/g, '')) || 0,
                Cocina: String(p.Imprimir_en_Cocina).toUpperCase() === 'TRUE',
                // Mapeo de color: Soporta Hex (#) o Nombre (Blue)
                Color: (p['Color Boton'] || p['ColorBoton'] || 'primary').trim(),
                Categoria: p.Categoria
            }))
            .sort((a, b) => (parseInt(a.Orden) || 99) - (parseInt(b.Orden) || 99));

        // 4. Renderizar Interfaz
        renderCategories();
        
        // Renderizado inteligente: Si ya hay productos, intentar mantener vista, sino mostrar todo
        // Por defecto refrescamos todo para asegurar precios nuevos
        renderProducts(db.productos); 

        // 5. Verificar Login (Solo si no es silencioso)
        if (!silent) checkLogin();

        console.log(`Sincronización completada: ${new Date().toLocaleTimeString()}`);

    } catch (error) {
        console.error("Error cargando datos:", error);
        if (!silent) {
            container.innerHTML = `<div class="alert alert-danger" style="grid-column: 1/-1;">Error de conexión. Revisa internet.</div>`;
        }
    }
}

// ==========================================
// 3. SEGURIDAD Y LOGIN
// ==========================================

function checkLogin() {
    if (!currentUser) {
        const loginModalEl = document.getElementById('loginModal');
        const modal = new bootstrap.Modal(loginModalEl, { backdrop: 'static', keyboard: false });
        modal.show();
    }
}

function attemptLogin() {
    const pinInput = document.getElementById('pin-input');
    const pin = pinInput.value.trim();

    // Comparar PIN (convertir a string por seguridad)
    const usuario = db.usuarios.find(u => String(u.PIN) === pin);

    if (usuario) {
        currentUser = usuario;
        
        // Actualizar UI
        const userDisplay = document.getElementById('user-display');
        if(userDisplay) userDisplay.innerText = `Cajero: ${usuario.Nombre}`;
        
        // Cerrar modal
        const modalEl = document.getElementById('loginModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
        
        // Limpiar
        pinInput.value = '';
        document.getElementById('login-error').innerText = '';
        
        calcularTurno(); // Calcular turno al entrar
    } else {
        document.getElementById('login-error').innerText = 'PIN incorrecto';
        pinInput.value = '';
        pinInput.focus();
    }
}

// ==========================================
// 4. LÓGICA DE NEGOCIO (TURNOS)
// ==========================================

// ==========================================
// CÁLCULO DE TURNO (FORZADO A CHILE 🇨🇱)
// ==========================================

// ==========================================
// CÁLCULO DE TURNO (CORREGIDO)
// ==========================================
function calcularTurno() {
    // 1. Hora actual del navegador
    const ahora = new Date();
    
    // 2. FORZAR HORA CHILENA
    // Convertimos la hora actual a string en zona horaria de Santiago
    const santiagoStr = ahora.toLocaleString("en-US", { timeZone: "America/Santiago" });
    const santiagoDate = new Date(santiagoStr);

    const hora = santiagoDate.getHours();

    // 3. Lógica Fecha Comercial (Corte 03:00 AM)
    let fechaComercial = new Date(santiagoDate);
    if (hora < 3) {
        fechaComercial.setDate(fechaComercial.getDate() - 1);
    }
    
    // Formato YYYY-MM-DD manual (seguro)
    const yyyy = fechaComercial.getFullYear();
    const mm = String(fechaComercial.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaComercial.getDate()).padStart(2, '0');
    const fechaStr = `${yyyy}-${mm}-${dd}`;

    // 4. Lógica Turnos (Corte 18:00 PM)
    let idTurno = 1;
    if (hora >= 18 || hora < 3) {
        idTurno = 2;
    }

    currentTurnData = {
        fechaHora: santiagoDate.toLocaleString("es-CL"), 
        fechaComercial: fechaStr,
        idTurno: idTurno,
        turnoKey: `${fechaStr}-T${idTurno}`
    };
}
    calcularTurno();
    // Aquí podrías actualizar un reloj en pantalla si lo tuvieras


// ==========================================
// 5. INTERFAZ (RENDER)
// ==========================================

function renderCategories() {
    const container = document.getElementById('category-container');
    // Botón "Todo" primero
    let html = `<button class="btn btn-dark shadow-sm flex-shrink-0" onclick="filterProducts('Todo')">Todo</button>`;
    
    // Categorías desde DB
    db.categorias.forEach(cat => {
        // Usamos el color de la categoría si existe
        // Si no, un gris por defecto
        const color = cat.Color ? mapColor(cat.Color) : "secondary";
        html += `<button class="btn btn-${color} shadow-sm flex-shrink-0" onclick="filterProducts('${cat.Nombre}')">${cat.Nombre}</button>`;
    });
    container.innerHTML = html;
}

function filterProducts(catName) {
    if (catName === 'Todo') {
        renderProducts(db.productos);
    } else {
        renderProducts(db.productos.filter(p => p.Categoria === catName));
    }
}

function renderProducts(lista) {
    const container = document.getElementById('products-container');
    
    if(lista.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1;" class="text-center text-muted mt-5">No hay productos disponibles</div>';
        return;
    }

    container.innerHTML = lista.map(p => {
        // Lógica de color híbrida (Hex o Bootstrap)
        const esHex = p.Color.startsWith('#');
        const claseBg = esHex ? '' : `bg-${mapColor(p.Color)}`;
        const estiloBg = esHex ? `background-color: ${p.Color}; color: white;` : '';

        return `
        <div class="card product-card h-100 shadow-sm border-0 ${claseBg}" 
             style="${estiloBg}"
             onclick="addToCart('${p.ID_Producto}')">
             
            <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-1">
                <h6 class="card-title fw-bold mb-1" style="color: inherit;">${p.Nombre}</h6>
                <span class="badge bg-white text-dark bg-opacity-90 mt-auto px-2 py-1">${formatter.format(p.Precio)}</span>
            </div>
        </div>
        `;
    }).join('');
}

// Helper para colores de texto (inglés -> bootstrap)
function mapColor(c) {
    if (!c) return 'primary';
    const map = {
        'red': 'danger', 'orange': 'warning', 'yellow': 'warning',
        'green': 'success', 'blue': 'primary', 'cyan': 'info',
        'black': 'dark', 'grey': 'secondary', 'gray': 'secondary'
    };
    return map[String(c).toLowerCase()] || 'primary';
}

// ==========================================
// 6. GESTIÓN DEL CARRITO
// ==========================================

function addToCart(id) {
    const prod = db.productos.find(p => p.ID_Producto === id);
    if (!prod) return;

    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.cantidad++;
    } else {
        cart.push({
            id: prod.ID_Producto,
            nombre: prod.Nombre,
            precio: prod.Precio,
            cantidad: 1,
            cocina: prod.Cocina,
            comentario: ''
        });
    }
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-container');
    let total = 0;

    container.innerHTML = cart.map((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        return `
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                <div style="overflow: hidden;">
                    <div class="fw-bold text-truncate">${item.nombre}</div>
                    <div class="small text-muted">${item.cantidad} x ${formatter.format(item.precio)}</div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold">${formatter.format(subtotal)}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">✕</button>
                </div>
            </div>`;
    }).join('');

    const totalFmt = formatter.format(total);
    document.getElementById('total-display').innerText = totalFmt;
    
    const modalTotal = document.getElementById('modal-total-pagar');
    if (modalTotal) modalTotal.innerText = totalFmt;
}

// ==========================================
// 7. COBRO Y FINALIZACIÓN
// ==========================================

let selectedPaymentMethod = 'Efectivo';

// ==========================================
// CORRECCIÓN EN app.js
// ==========================================

function openPaymentModal() {
    if (cart.length === 0) return alert("El carrito está vacío.");
    
    const modalEl = document.getElementById('paymentModal');
    
    // CORRECCIÓN: Usamos getOrCreateInstance
    // Esto evita crear duplicados que causan el error de aria-hidden
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    
    modal.show();
    
    // Resetear formulario
    setPaymentMethod('Efectivo');
    document.getElementById('amount-tendered').value = '';
    document.getElementById('change-display').innerText = '$0';
    
    // Opcional: Dar foco al campo de dinero automáticamente al abrir
    // Esto mejora la experiencia en el POS
    setTimeout(() => {
        const input = document.getElementById('amount-tendered');
        if(input) input.focus();
    }, 500);
}

function setPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    document.querySelectorAll('#pills-tab .nav-link').forEach(btn => {
        if (btn.dataset.method === method) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    const cashSection = document.getElementById('cash-section');
    cashSection.style.display = (method === 'Efectivo') ? 'block' : 'none';
}

function calculateChange() {
    const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const inputVal = document.getElementById('amount-tendered').value;
    const received = parseInt(inputVal) || 0;
    
    const change = received - total;
    const display = document.getElementById('change-display');
    
    if (change >= 0) {
        display.innerText = formatter.format(change);
        display.classList.remove('text-danger');
        display.classList.add('text-success');
    } else {
        display.innerText = "Falta dinero";
        display.classList.remove('text-success');
        display.classList.add('text-danger');
    }
}

// ... (Mantén tu código anterior de Configuración, Carga de datos, Login, etc.) ...

// ==========================================
// NUEVO: GENERADOR DE NÚMERO DE PEDIDO (Diario 001 - 999)
// ==========================================
// --- GENERADOR DE NÚMERO DIARIO ---
function getNextOrderNumber() {
    const today = new Date().toLocaleDateString('es-CL'); // Clave por fecha local
    let data = JSON.parse(localStorage.getItem('pos_turno_counter')) || { date: '', count: 0 };

    // Si cambió el día, reiniciar a 0
    if (data.date !== today) {
        data = { date: today, count: 0 };
    }

    data.count++; // Sumar 1
    localStorage.setItem('pos_turno_counter', JSON.stringify(data));

    // Retorna string de 3 dígitos: "001", "002"...
    return String(data.count).padStart(3, '0');
}

// --- PROCESAR VENTA ---
async function processSale() {
    if (!currentUser) return checkLogin();
    
    // 1. Validar Montos
    const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    if (selectedPaymentMethod === 'Efectivo') {
        const received = parseInt(document.getElementById('amount-tendered').value) || 0;
        if (received < total) return alert("Monto insuficiente.");
    }

    // 2. Cerrar modal y mostrar indicador de carga visual (opcional)
    const modalEl = document.getElementById('paymentModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance.hide();

    // 3. GENERAR DATOS
    calcularTurno(); // Asegurar fecha/hora actual
    const idPedido = `PED-${Date.now()}`;
    const numeroDia = getNextOrderNumber(); // Generamos el "001"
    
    console.log("Procesando Venta...", { idPedido, numeroDia }); // DEBUG

    // 4. IMPRIMIR (Primero imprimimos, es lo más importante en comida rápida)
    if (typeof window.printTicket === 'function') {
        try {
            // Enviamos el numeroDia a printer.js
            await window.printTicket(cart, total, selectedPaymentMethod, numeroDia);
        } catch (e) {
            console.error("Error Impresión:", e);
            alert("⚠️ La venta se registró, pero NO SE PUDO IMPRIMIR. Revisa el cable USB.");
        }
    } else {
        console.warn("printer.js no cargado o función printTicket no existe");
    }

    // 5. PREPARAR DATOS PARA GOOGLE SHEETS
    const saleData = {
        action: "create_order",
        pedido: {
            ID_Pedido: idPedido,
            Numero_Turno: numeroDia, // ESTE CAMPO DEBE COINCIDIR CON CODE.GS
            FechaHora: currentTurnData.fechaHora,
            Fecha_Comercial: currentTurnData.fechaComercial,
            Turno: currentTurnData.idTurno,
            ID_Turno: currentTurnData.turnoKey,
            Usuario_Caja: currentUser.Nombre,
            Total_Bruto: total,
            Total_Neto: total,
            Medio_Pago: selectedPaymentMethod,
            Estado: "Pagado"
        },
        detalles: cart.map(item => ({
            ID_Detalle: `DET-${Math.random().toString(36).substr(2, 9)}`,
            ID_Pedido: idPedido,
            Fecha_Comercial: currentTurnData.fechaComercial,
            Turno: currentTurnData.idTurno,
            ID_Producto: item.id,
            Nombre_Producto: item.nombre,
            Cantidad: item.cantidad,
            Precio_Unitario: item.precio,
            Subtotal: item.cantidad * item.precio,
            Comentarios: item.comentario || ""
        }))
    };

    // 6. GUARDAR EN NUBE (Segundo plano)
    saveToDatabase(saleData);

    // 7. LIMPIAR INTERFAZ
    cart = [];
    updateCartUI();
    // Opcional: Feedback visual
    // alert(`Venta #${numeroDia} Lista!`); 
}

// ... (Resto de funciones: saveToDatabase, startAutoUpdate, etc.) ...
async function saveToDatabase(payload) {
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        console.log("Venta sincronizada");
    } catch (error) {
        console.error("Error guardando venta:", error);
        alert("⚠️ Venta realizada pero NO guardada en la nube (Error de red). Anótala.");
    }
}

// ==========================================
// 8. SINCRONIZACIÓN AUTOMÁTICA
// ==========================================

const UPDATE_INTERVAL = 300000; // 5 minutos

function startAutoUpdate() {
    setInterval(() => {
        // Solo actualizamos si el carrito está vacío para no interrumpir venta
        if (cart.length === 0) {
            console.log("Auto-sincronizando...");
            loadSystemData(true); // true = modo silencioso
        }
    }, UPDATE_INTERVAL);
}
// ==========================================
// REPORTE DIARIO (CIERRE Z)
// ==========================================
let currentReportData = null;

async function showDailyReport() {
    // 1. Pedir PIN de Admin para ver cierres (Opcional, recomendado)
    // const pin = prompt("Ingrese PIN Admin:");
    // if (pin !== "1234") return alert("Acceso denegado");

    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();

    calcularTurno(); // Asegurar fecha actual
    const fecha = currentTurnData.fechaComercial;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_daily_report", fecha: fecha })
        });
        
        const result = await response.json();
        
        if (result.status === "success") {
            currentReportData = result.data;
            renderReportUI(result.data);
        } else {
            document.getElementById('report-body').innerHTML = `<div class="alert alert-danger">Error: ${result.message}</div>`;
        }
    } catch (e) {
        document.getElementById('report-body').innerHTML = `<div class="alert alert-danger">Error de red: ${e.message}</div>`;
    }
}

// --- app.js (Actualización Reporte) ---

function renderReportUI(data) {
    const fmt = (n) => formatter.format(n);
    
    // 1. Generar HTML de la lista de productos
    // Ordenamos de mayor venta a menor
    let productosHtml = '<table class="table table-sm table-striped mb-0">';
    const ranking = Object.entries(data.productos).sort((a,b) => b[1] - a[1]);
    
    if(ranking.length === 0) {
        productosHtml += '<tr><td class="text-muted text-center">Sin ventas</td></tr>';
    } else {
        ranking.forEach(([nombre, cantidad]) => {
            productosHtml += `
                <tr>
                    <td>${nombre}</td>
                    <td class="text-end fw-bold">${cantidad}</td>
                </tr>
            `;
        });
    }
    productosHtml += '</table>';

    // 2. Armar el HTML completo
    const html = `
        <h4 class="text-center fw-bold mb-3">${data.fecha}</h4>
        
        <div class="row g-2 mb-3">
            <div class="col-6">
                <div class="card bg-light border-0 h-100">
                    <div class="card-body py-2 px-2" style="font-size: 0.9em">
                        <h6 class="fw-bold text-primary mb-1">🌅 AM</h6>
                        <div>Efec: ${fmt(data.turnos[1].efectivo)}</div>
                        <div>Tarj: ${fmt(data.turnos[1].tarjeta)}</div>
                        <div>Trans: ${fmt(data.turnos[1].transferencia)}</div>
                        <div class="border-top fw-bold mt-1">Total: ${fmt(data.turnos[1].total)}</div>
                    </div>
                </div>
            </div>
            <div class="col-6">
                <div class="card bg-light border-0 h-100">
                    <div class="card-body py-2 px-2" style="font-size: 0.9em">
                        <h6 class="fw-bold text-primary mb-1">🌆 PM</h6>
                        <div>Efec: ${fmt(data.turnos[2].efectivo)}</div>
                        <div>Tarj: ${fmt(data.turnos[2].tarjeta)}</div>
                        <div>Trans: ${fmt(data.turnos[2].transferencia)}</div>
                        <div class="border-top fw-bold mt-1">Total: ${fmt(data.turnos[2].total)}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mb-3 border-0">
            <div class="card-header bg-white fw-bold">📦 Desglose Productos</div>
            <div class="card-body p-0 overflow-auto" style="max-height: 200px;">
                ${productosHtml}
            </div>
        </div>

        <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between align-items-center bg-dark text-white fs-5">
                TOTAL DÍA
                <span class="fw-bold">${fmt(data.gran_total)}</span>
            </li>
        </ul>
    `;
    document.getElementById('report-body').innerHTML = html;
}

// Función corregida para el botón de imprimir
async function printReportAction() {
    console.log("Intentando imprimir reporte...", currentReportData);

    if (!currentReportData) {
        return alert("No hay datos de reporte cargados. Presiona 'Cierre' nuevamente.");
    }
    
    // Verificamos si printer.js cargó bien
    if (typeof window.printDailyReport !== 'function') {
        return alert("Error: El archivo printer.js no está cargado o la función no existe.");
    }

    try {
        await window.printDailyReport(currentReportData);
    } catch (e) {
        console.error(e);
        alert("Error de comunicación con la impresora: " + e.message);
    }
}
/**
 * POS El Carro del Ocho - Lógica Principal
 * APP.JS
 */

// URL DE TU SCRIPT GOOGLE
const API_URL = "https://script.google.com/macros/s/AKfycbyTsarYzEHOqu8Xtqx8qOaxgjRY-7fsUIT6TLcOv5VFQaL7nOGecbxGGhMbJJg6igAG/exec";

let db = { productos: [], categorias: [], usuarios: [] };
let cart = [];
let currentUser = null;
let currentTurnData = null;
let currentReportData = null;

const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    loadSystemData();
    updateClock();
    startAutoUpdate();
    setInterval(updateClock, 60000);
});

// --- CARGA DE DATOS ---
async function loadSystemData(silent = false) {
    const container = document.getElementById('products-container');
    if (!silent) container.innerHTML = `<div style="grid-column:1/-1;" class="text-center mt-5"><div class="spinner-border text-primary"></div><p>Cargando...</p></div>`;

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        db.usuarios = data.usuarios.filter(u => String(u.Activo).toLowerCase() === 'true');
        db.categorias = data.categorias.sort((a, b) => (parseInt(a.Orden)||99) - (parseInt(b.Orden)||99));
        
        db.productos = data.productos
            .filter(p => String(p.Activo).trim().toUpperCase() === 'TRUE')
            .map(p => ({
                ...p,
                Precio: parseInt(String(p.Precio).replace(/\D/g, '')) || 0,
                Cocina: String(p.Imprimir_en_Cocina).toUpperCase() === 'TRUE',
                Color: (p['ColorBoton'] || 'primary').trim(),
                Categoria: p.Categoria
            }))
            .sort((a, b) => (parseInt(a.Orden)||99) - (parseInt(b.Orden)||99));

        renderCategories();
        renderProducts(db.productos);
        if (!silent) checkLogin();

    } catch (error) {
        if (!silent) container.innerHTML = `<div class="alert alert-danger" style="grid-column:1/-1;">Error de conexión.</div>`;
    }
}

// --- LOGIN ---
function checkLogin() {
    if (!currentUser) new bootstrap.Modal(document.getElementById('loginModal'), { backdrop: 'static', keyboard: false }).show();
}

function attemptLogin() {
    const pin = document.getElementById('pin-input').value.trim();
    const usuario = db.usuarios.find(u => String(u.PIN) === pin);

    if (usuario) {
        currentUser = usuario;
        document.getElementById('user-display').innerText = `Cajero: ${usuario.Nombre}`;
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        document.getElementById('pin-input').value = '';
        calcularTurno();
    } else {
        document.getElementById('login-error').innerText = 'PIN incorrecto';
    }
}

// --- LÓGICA DE TURNO (HORA CHILE) ---
function calcularTurno() {
    const ahora = new Date();
    // Forzar zona horaria Santiago
    const santiagoStr = ahora.toLocaleString("en-US", { timeZone: "America/Santiago" });
    const santiagoDate = new Date(santiagoStr);
    const hora = santiagoDate.getHours();

    // Día Comercial (Corte 3 AM)
    let fechaComercial = new Date(santiagoDate);
    if (hora < 3) fechaComercial.setDate(fechaComercial.getDate() - 1);
    
    const yyyy = fechaComercial.getFullYear();
    const mm = String(fechaComercial.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaComercial.getDate()).padStart(2, '0');
    const fechaStr = `${yyyy}-${mm}-${dd}`;

    // Turno (Corte 18:00)
    let idTurno = (hora >= 18 || hora < 3) ? 2 : 1;

    currentTurnData = {
        fechaHora: santiagoDate.toLocaleString("es-CL"),
        fechaComercial: fechaStr,
        idTurno: idTurno,
        turnoKey: `${fechaStr}-T${idTurno}`
    };
}

function updateClock() { calcularTurno(); }

// --- NÚMERO DE PEDIDO ---
function getNextOrderNumber() {
    // Usamos fecha comercial para agrupar pedidos de la noche con el día anterior
    calcularTurno();
    const key = `pos_counter_${currentTurnData.fechaComercial}`;
    
    let count = parseInt(localStorage.getItem(key)) || 0;
    count++;
    localStorage.setItem(key, count);
    return String(count).padStart(3, '0');
}

// --- RENDERIZADO ---
function renderCategories() {
    const container = document.getElementById('category-container');
    let html = `<button class="btn btn-dark shadow-sm flex-shrink-0" onclick="filterProducts('Todo')">Todo</button>`;
    db.categorias.forEach(cat => {
        const color = cat.Color ? mapColor(cat.Color) : "secondary";
        html += `<button class="btn btn-${color} shadow-sm flex-shrink-0" onclick="filterProducts('${cat.Nombre}')">${cat.Nombre}</button>`;
    });
    container.innerHTML = html;
}

function filterProducts(catName) {
    renderProducts(catName === 'Todo' ? db.productos : db.productos.filter(p => p.Categoria === catName));
}

function renderProducts(lista) {
    const container = document.getElementById('products-container');
    if(lista.length === 0) return container.innerHTML = '<div style="grid-column:1/-1;" class="text-center text-muted mt-5">Sin productos</div>';

    container.innerHTML = lista.map(p => {
        const esHex = p.Color.startsWith('#');
        const claseBg = esHex ? '' : `bg-${mapColor(p.Color)}`;
        const estiloBg = esHex ? `background-color: ${p.Color}; color: white;` : '';
        return `
        <div class="card product-card h-100 shadow-sm border-0 ${claseBg}" style="${estiloBg}" onclick="addToCart('${p.ID_Producto}')">
            <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-1">
                <h6 class="card-title fw-bold mb-1" style="color: inherit;">${p.Nombre}</h6>
                <span class="badge bg-white text-dark bg-opacity-90 mt-auto px-2 py-1">${formatter.format(p.Precio)}</span>
            </div>
        </div>`;
    }).join('');
}

function mapColor(c) {
    if (!c) return 'primary';
    const map = { 'red': 'danger', 'orange': 'warning', 'yellow': 'warning', 'green': 'success', 'blue': 'primary', 'cyan': 'info', 'black': 'dark', 'grey': 'secondary' };
    return map[String(c).toLowerCase()] || 'primary';
}

// --- CARRITO ---
function addToCart(id) {
    const prod = db.productos.find(p => p.ID_Producto === id);
    if (!prod) return;
    const existing = cart.find(i => i.id === id);
    if (existing) existing.cantidad++;
    else cart.push({ id: prod.ID_Producto, nombre: prod.Nombre, precio: prod.Precio, cantidad: 1, cocina: prod.Cocina, comentario: '' });
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
    document.getElementById('modal-total-pagar').innerText = totalFmt;
}

// --- COBRO ---
let selectedPaymentMethod = 'Efectivo';

function openPaymentModal() {
    if (cart.length === 0) return alert("Carrito vacío");
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentModal'));
    modal.show();
    setPaymentMethod('Efectivo');
    document.getElementById('amount-tendered').value = '';
    document.getElementById('change-display').innerText = '$0';
    setTimeout(() => document.getElementById('amount-tendered').focus(), 500);
}

function setPaymentMethod(method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('#pills-tab .nav-link').forEach(btn => {
        if (btn.dataset.method === method) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.getElementById('cash-section').style.display = (method === 'Efectivo') ? 'block' : 'none';
}

function calculateChange() {
    const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const received = parseInt(document.getElementById('amount-tendered').value) || 0;
    const change = received - total;
    const display = document.getElementById('change-display');
    
    if (change >= 0) { display.innerText = formatter.format(change); display.classList.replace('text-danger', 'text-success'); } 
    else { display.innerText = "Falta dinero"; display.classList.replace('text-success', 'text-danger'); }
}

async function processSale() {
    if (!currentUser) return checkLogin();
    
    const total = cart.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    if (selectedPaymentMethod === 'Efectivo') {
        const received = parseInt(document.getElementById('amount-tendered').value) || 0;
        if (received < total) return alert("Monto insuficiente");
    }

    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    
    calcularTurno();
    const idPedido = `PED-${Date.now()}`;
    const numeroDia = getNextOrderNumber();

    // 1. IMPRIMIR
    try {
        if (typeof window.printTicket === 'function') {
            await window.printTicket(cart, total, selectedPaymentMethod, numeroDia);
        }
    } catch (e) { alert("Error impresión, pero se guardará."); }

    // 2. GUARDAR
    const saleData = {
        action: "create_order",
        pedido: {
            ID_Pedido: idPedido, Numero_Turno: numeroDia,
            FechaHora: currentTurnData.fechaHora, Fecha_Comercial: currentTurnData.fechaComercial,
            Turno: currentTurnData.idTurno, ID_Turno: currentTurnData.turnoKey,
            Usuario_Caja: currentUser.Nombre, Total_Bruto: total, Total_Neto: total,
            Medio_Pago: selectedPaymentMethod, Estado: "Pagado"
        },
        detalles: cart.map(item => ({
            ID_Detalle: `DET-${Math.random().toString(36).substr(2, 9)}`,
            ID_Pedido: idPedido, Fecha_Comercial: currentTurnData.fechaComercial,
            Turno: currentTurnData.idTurno, ID_Producto: item.id, Nombre_Producto: item.nombre,
            Cantidad: item.cantidad, Precio_Unitario: item.precio, Subtotal: item.cantidad * item.precio,
            Comentarios: item.comentario
        }))
    };
    saveToDatabase(saleData);

    cart = [];
    updateCartUI();
}

async function saveToDatabase(payload) {
    try { await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); } 
    catch (e) { console.error("Error guardando:", e); alert("Error guardando en nube (Anótalo)."); }
}

// --- REPORTE Z ---
async function showDailyReport() {
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();
    calcularTurno();
    
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "get_daily_report", fecha: currentTurnData.fechaComercial }) });
        const result = await response.json();
        if (result.status === "success") {
            currentReportData = result.data;
            renderReportUI(result.data);
        } else { document.getElementById('report-body').innerHTML = `<div class="alert alert-danger">${result.message}</div>`; }
    } catch (e) { document.getElementById('report-body').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function renderReportUI(data) {
    const fmt = (n) => formatter.format(n);
    let fechaFormateada = data.fecha;
    if (data.fecha && data.fecha.includes('-')) {
        const [anio, mes, dia] = data.fecha.split('-');
        fechaFormateada = `${dia}/${mes}/${anio}`;
    }
    let ranking = Object.entries(data.productos).sort((a,b)=>b[1]-a[1]);
    let prodHtml = '<table class="table table-sm table-striped"><tbody>';
    if(ranking.length===0) prodHtml += '<tr><td>Sin ventas</td></tr>';
    else ranking.forEach(([n,c])=> prodHtml += `<tr><td>${n}</td><td class="text-end fw-bold">${c}</td></tr>`);
    prodHtml += '</tbody></table>';

    document.getElementById('report-body').innerHTML = `
        <h5 class="text-center fw-bold">Fecha: ${fechaFormateada}</h5>
        <div class="row g-2 mb-2"><div class="col-6"><div class="card bg-light p-2"><div class="fw-bold text-primary">Turno 1</div><div>Total: ${fmt(data.turnos[1].total)}</div></div></div>
        <div class="col-6"><div class="card bg-light p-2"><div class="fw-bold text-primary">Turno 2</div><div>Total: ${fmt(data.turnos[2].total)}</div></div></div></div>
        <div class="card p-2 mb-2" style="max-height:200px;overflow:auto;">${prodHtml}</div>
        <div class="bg-dark text-white p-2 d-flex justify-content-between"><span>TOTAL DIA</span><span class="fw-bold">${fmt(data.gran_total)}</span></div>
    `;
}

async function printReportAction() {
    if(currentReportData && window.printDailyReport) await window.printDailyReport(currentReportData);
}

function startAutoUpdate() {
    // Sincronizar datos cada 5 min
    setInterval(() => { if (cart.length === 0) loadSystemData(true); }, 300000);
    
    // Chequeo de hora cada 30 segundos para cambio de turno
    setInterval(() => {
        updateClock();
        checkAutoShiftChange(); 
    }, 30000); 
}

// ==========================================
// LOGICA DE CAMBIO DE TURNO (FINAL)
// ==========================================

// 1. CAMBIO MANUAL
window.manualShiftChange = function() {
    console.log("Intentando cambio de turno..."); 

    if (cart.length > 0) {
        if (!confirm("⚠️ Hay una venta en curso.\n¿Seguro que desea cambiar de turno?\nSe perderá el pedido actual.")) {
            return;
        }
    }
    
    // Forzamos la recarga ignorando caché
    window.location.reload(true);
};

// 2. CAMBIO AUTOMÁTICO (18:00)
function checkAutoShiftChange() {
    const ahora = new Date();
    const santiagoStr = ahora.toLocaleString("en-US", { timeZone: "America/Santiago" });
    const santiagoDate = new Date(santiagoStr);
    
    const hora = santiagoDate.getHours();
    const min = santiagoDate.getMinutes();

    if (hora === 18 && min <= 1) {
        const key = `turno_cambiado_${santiagoDate.getDate()}`;
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "true");
            alert("⏰ SON LAS 18:00 HRS.\nCierre de turno automático.");
            window.location.reload(true);
        }
    }
}
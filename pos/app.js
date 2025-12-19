/**
 * POS El Carro del Ocho - Lógica de Venta (Frontend)
 * Versión Depurada: Solo Venta y Caja (Sin Administración)
 */

// ==========================================
// 1. CONFIGURACIÓN Y ESTADO
// ==========================================

// ¡IMPORTANTE! Pega aquí la misma URL de Apps Script que usas en el admin
const API_URL = "https://script.google.com/macros/s/AKfycbzimvh8RF1r4YD_h5-UzPYKi5K-92YNVaI6f82KqO8R52vnx6aEJ5FQTGi_-DIr4DJm/exec";

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

function calcularTurno() {
    const ahora = new Date();
    const hora = ahora.getHours();

    // Fecha Comercial: Si es antes de las 3 AM, cuenta como "ayer"
    let fechaComercial = new Date(ahora);
    if (hora < 3) {
        fechaComercial.setDate(fechaComercial.getDate() - 1);
    }
    const fechaComercialStr = fechaComercial.toISOString().split('T')[0];

    // Turno: 1 (AM) o 2 (PM - empieza a las 19:00)
    let idTurno = 1;
    if (hora >= 19 || hora < 3) {
        idTurno = 2;
    }

    currentTurnData = {
        fechaHora: ahora.toISOString(),
        fechaComercial: fechaComercialStr,
        idTurno: idTurno,
        turnoKey: `${fechaComercialStr}-T${idTurno}`
    };
}

function updateClock() {
    calcularTurno();
    // Aquí podrías actualizar un reloj en pantalla si lo tuvieras
}

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

function openPaymentModal() {
    if (cart.length === 0) return alert("El carrito está vacío.");
    
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
    
    setPaymentMethod('Efectivo');
    document.getElementById('amount-tendered').value = '';
    document.getElementById('change-display').innerText = '$0';
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

async function processSale() {
    if (!currentUser) return checkLogin();
    
    calcularTurno();
    const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    
    // Validación Efectivo
    if (selectedPaymentMethod === 'Efectivo') {
        const received = parseInt(document.getElementById('amount-tendered').value) || 0;
        if (received < total) return alert("Monto insuficiente.");
    }

    // Cerrar modal
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();

    // ID Único para el pedido
    const idPedido = `PED-${Date.now()}`;

    // 1. Preparar Payload (Pedido + Detalles)
    const saleData = {
        action: "create_order",
        pedido: {
            ID_Pedido: idPedido,
            FechaHora: currentTurnData.fechaHora,
            Fecha_Comercial: currentTurnData.fechaComercial,
            Turno: currentTurnData.idTurno,
            ID_Turno: currentTurnData.turnoKey,
            Usuario_Caja: currentUser.Nombre,
            Total_Bruto: total,
            Descuento: 0,
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
            Comentarios: item.comentario
        }))
    };

    // 2. Imprimir (Si printer.js está cargado y conectado)
    if (typeof window.printTicket === 'function') {
        try {
            await window.printTicket(cart, total, selectedPaymentMethod, idPedido);
        } catch (e) {
            console.warn("Error impresión:", e);
            // No bloqueamos la venta si falla la impresora
        }
    }

    // 3. Guardar en Backend (Async)
    saveToDatabase(saleData);

    // 4. Limpiar
    cart = [];
    updateCartUI();
    // Opcional: Mostrar alerta flotante de éxito
}

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
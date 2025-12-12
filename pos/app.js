/**
 * POS El Carro del Ocho - Lógica Principal
 * Stack: Vanilla JS + Bootstrap 5 + Google Apps Script Backend
 */

// ==========================================
// 1. CONFIGURACIÓN Y ESTADO
// ==========================================

// ¡IMPORTANTE! Reemplaza esto con la URL de tu implementación de Google Apps Script
const API_URL =
  "https://script.google.com/macros/s/AKfycbwlsRu_5_hqbX84z0VLWi1p1AkFk8rEIumqRttgs9unki436_0xAVQKzbj2Iu680gM1/exec";

// Estado de la Aplicación
let db = {
  productos: [],
  categorias: [],
  usuarios: [],
  config: {},
};

let cart = [];
let currentUser = null; // Usuario logueado (Cajero)
let currentTurnData = null; // Información calculada del turno actual

// Formateador de moneda (CLP)
const formatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
});

// ==========================================
// 2. INICIALIZACIÓN
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  loadSystemData();
  updateClock();
  setInterval(updateClock, 60000); // Actualizar reloj cada minuto
});

// Acepta un parámetro 'silent' (falso por defecto)
async function loadSystemData(silent = false) {
  const container = document.getElementById("products-container");

  // Solo mostramos el spinner si NO es una actualización silenciosa
  if (!silent) {
    container.innerHTML = `
            <div class="col-12 text-center mt-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Cargando menú...</p>
            </div>`;
  }

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // ... (Tu lógica de procesar usuarios y categorías sigue igual) ...
    db.usuarios = data.usuarios.filter(
      (u) => String(u.Activo).toLowerCase() === "true"
    );
    db.categorias = data.categorias.sort(
      (a, b) => parseInt(a.Orden) - parseInt(b.Orden)
    );

    // ... (Tu lógica de procesar productos sigue igual) ...
    db.productos = data.productos
      .filter((p) => String(p.Activo).trim().toUpperCase() === "TRUE")
      .map((p) => ({
        ...p,
        Precio: parseInt(String(p.Precio).replace(/\D/g, "")) || 0,
        Cocina: String(p.Imprimir_en_Cocina).toUpperCase() === "TRUE",

        // CAMBIO IMPORTANTE:
        // Leemos la columna (con o sin espacio) y guardamos el valor tal cual viene
        Color: (p["Color Boton"] || p["ColorBoton"] || "primary").trim(),

        Categoria: p.Categoria,
      }))
      .sort((a, b) => parseInt(a.Orden) - parseInt(b.Orden));

    // RENDERIZADO
    // Si es silencioso, solo actualizamos si el usuario NO está filtrando una categoría específica
    // Para simplificar, refrescamos todo, el usuario apenas lo notará si es rápido.
    renderCategories();

    // Truco UI: Si el usuario estaba viendo una categoría específica, mantenerla
    // Si no, mostrar todo o lo que estaba viendo.
    // Por defecto renderizamos todo:
    renderProducts(db.productos);

    if (!silent) checkLogin();

    console.log("Datos sincronizados " + new Date().toLocaleTimeString());
  } catch (error) {
    console.error("Error actualizando datos:", error);
    if (!silent) {
      container.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
  }
}

// ==========================================
// 3. SEGURIDAD Y LOGIN
// ==========================================

function checkLogin() {
  if (!currentUser) {
    // Abrir modal de login y no dejar cerrar
    const loginModalEl = document.getElementById("loginModal");
    const modal = new bootstrap.Modal(loginModalEl, {
      backdrop: "static",
      keyboard: false,
    });
    modal.show();
  }
}

// Función llamada desde el botón "Entrar" del modal
function attemptLogin() {
  const pinInput = document.getElementById("pin-input");
  const pin = pinInput.value.trim();

  // Convertimos a string ambos lados para evitar errores de tipo (número vs texto)
  const usuario = db.usuarios.find((u) => String(u.PIN) === pin);

  if (usuario) {
    console.log("Login exitoso:", usuario.Nombre); // Para depurar en consola
    currentUser = usuario;

    // 1. Actualizar nombre en pantalla (CON PROTECCIÓN)
    const displayEl = document.getElementById("user-display");
    if (displayEl) {
      displayEl.innerText = `Cajero: ${usuario.Nombre}`;
    } else {
      console.warn(
        "Advertencia: No existe el elemento con id='user-display' en el HTML."
      );
    }

    // 2. Cerrar Modal (FORZADO)
    const modalEl = document.getElementById("loginModal");
    const modal = bootstrap.Modal.getInstance(modalEl);

    if (modal) {
      modal.hide();
    } else {
      // Si por alguna razón la instancia se perdió, forzamos cierre visual
      modalEl.classList.remove("show");
      modalEl.style.display = "none";
      document.body.classList.remove("modal-open");
      const backdrop = document.querySelector(".modal-backdrop");
      if (backdrop) backdrop.remove();
    }

    // 3. Limpiar errores
    document.getElementById("login-error").innerText = "";
    pinInput.value = "";

    // 4. Iniciar lógica de turno
    if (typeof calcularTurno === "function") {
      calcularTurno();
    }
  } else {
    // Si el PIN está mal
    console.log("PIN fallido para:", pin);
    document.getElementById("login-error").innerText =
      "PIN incorrecto o usuario inactivo";
    pinInput.value = "";
    pinInput.focus();
  }
}

// ==========================================
// 4. LÓGICA DE NEGOCIO (FECHAS Y TURNOS)
// ==========================================

function calcularTurno() {
  const ahora = new Date();
  const hora = ahora.getHours(); // 0 a 23

  // Lógica: El día comercial termina a las 03:00 AM del día siguiente.
  // Si son las 00, 01 o 02 AM, seguimos en el día comercial "de ayer".
  let fechaComercial = new Date(ahora);
  if (hora < 3) {
    fechaComercial.setDate(fechaComercial.getDate() - 1);
  }
  const fechaComercialStr = fechaComercial.toISOString().split("T")[0]; // YYYY-MM-DD

  // Lógica Turnos: Cambio a las 19:00
  // Turno 1: 09:00 (o apertura) hasta 18:59
  // Turno 2: 19:00 hasta cierre (03:00 AM)
  let idTurno = 1;
  let nombreTurno = "AM";

  if (hora >= 19 || hora < 3) {
    idTurno = 2;
    nombreTurno = "PM";
  }

  currentTurnData = {
    fechaHora: ahora.toISOString(), // TIMESTAMP real para log
    fechaComercial: fechaComercialStr, // DATE para contabilidad
    idTurno: idTurno,
    nombreTurno: nombreTurno,
    turnoKey: `${fechaComercialStr}-T${idTurno}`, // Key única para la tabla Turnos
  };

  console.log("Contexto Turno:", currentTurnData);
}

function updateClock() {
  calcularTurno(); // Recalcular contexto
  const el = document.getElementById("clock-display"); // Asegúrate de tener este ID
  if (el) {
    const now = new Date();
    el.innerText = `${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} | T${currentTurnData.idTurno}`;
  }
}

// ==========================================
// 5. INTERFAZ (RENDER)
// ==========================================

function renderCategories() {
  const container = document.getElementById("category-container");
  let html = `<button class="btn btn-primary btn-lg flex-shrink-0" onclick="filterProducts('Todo')">Todo</button>`;

  db.categorias.forEach((cat) => {
    const color = cat.Color ? mapColor(cat.Color) : "secondary";
    html += `<button class="btn btn-${color} btn-lg flex-shrink-0" onclick="filterProducts('${cat.Nombre}')">${cat.Nombre}</button>`;
  });
  container.innerHTML = html;
}

function filterProducts(catName) {
  if (catName === "Todo") {
    renderProducts(db.productos);
  } else {
    renderProducts(db.productos.filter((p) => p.Categoria === catName));
  }
}

function renderProducts(lista) {
    const container = document.getElementById('products-container');
    
    if(lista.length === 0) {
        // Usamos grid-column: 1 / -1 para que el mensaje ocupe todo el ancho
        container.innerHTML = '<div style="grid-column: 1 / -1;" class="text-center text-muted mt-4">No hay productos en esta categoría</div>';
        return;
    }

    container.innerHTML = lista.map(p => {
        const esHex = p.Color.startsWith('#');
        const claseBg = esHex ? '' : `bg-${mapColor(p.Color)}`;
        const estiloBg = esHex ? `background-color: ${p.Color}; color: white;` : '';

        // NOTA: Ya no hay <div class="col-..."> envolviendo la card.
        // La card es hija directa del grid container.
        return `
            <div class="card product-card h-100 shadow-sm border-0 ${claseBg}" 
                 style="${estiloBg}"
                 onclick="addToCart('${p.ID_Producto}')">
                 
                <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-1">
                    <h6 class="card-title fw-bold mb-1" style="color: inherit;">${p.Nombre}</h6>
                    <span class="badge bg-white text-dark bg-opacity-75 mt-auto p-1">$${p.Precio.toLocaleString('es-CL')}</span>
                </div>
            </div>
        `;
    }).join('');
}
// ==========================================
// 6. GESTIÓN DEL CARRITO
// ==========================================

function addToCart(id) {
  const prod = db.productos.find((p) => p.ID_Producto === id);
  if (!prod) return;

  const existing = cart.find((i) => i.id === id);
  if (existing) {
    existing.cantidad++;
  } else {
    cart.push({
      id: prod.ID_Producto,
      nombre: prod.Nombre,
      precio: prod.Precio,
      cantidad: 1,
      cocina: prod.Cocina,
      comentario: "", // Futuro: Modificadores
    });
  }
  updateCartUI();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function updateCartUI() {
  const container = document.getElementById("cart-container");
  let total = 0;

  container.innerHTML = cart
    .map((item, index) => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      return `
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                <div style="width: 60%">
                    <div class="fw-bold text-truncate">${item.nombre}</div>
                    <div class="small text-muted">${
                      item.cantidad
                    } x ${formatter.format(item.precio)}</div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold">${formatter.format(subtotal)}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">✕</button>
                </div>
            </div>`;
    })
    .join("");

  // Actualizar totales en pantalla principal y modal
  const totalFmt = formatter.format(total);
  document.getElementById("total-display").innerText = totalFmt;

  // Si existe el elemento del modal (puede no estar renderizado aún)
  const modalTotal = document.getElementById("modal-total-pagar");
  if (modalTotal) modalTotal.innerText = totalFmt;
}

// ==========================================
// 7. COBRO Y FINALIZACIÓN
// ==========================================

let selectedPaymentMethod = "Efectivo";

function openPaymentModal() {
  if (cart.length === 0) return alert("El carrito está vacío.");

  const modal = new bootstrap.Modal(document.getElementById("paymentModal"));
  modal.show();

  // Resetear formulario
  selectedPaymentMethod = "Efectivo";
  setPaymentMethod("Efectivo");
  document.getElementById("amount-tendered").value = "";
  document.getElementById("change-display").innerText = "$0";
}

function setPaymentMethod(method) {
  selectedPaymentMethod = method;

  // Toggle visual de botones
  document.querySelectorAll("#pills-tab .nav-link").forEach((btn) => {
    if (btn.dataset.method === method) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  // Mostrar/Ocultar sección efectivo
  const cashSection = document.getElementById("cash-section");
  cashSection.style.display = method === "Efectivo" ? "block" : "none";
}

function calculateChange() {
  const total = cart.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  );
  const inputVal = document.getElementById("amount-tendered").value;
  const received = parseInt(inputVal) || 0;

  const change = received - total;
  const display = document.getElementById("change-display");

  if (change >= 0) {
    display.innerText = formatter.format(change);
    display.classList.remove("text-danger");
    display.classList.add("text-success");
  } else {
    display.innerText = "Falta dinero";
    display.classList.remove("text-success");
    display.classList.add("text-danger");
  }
}

async function processSale() {
  if (!currentUser) return checkLogin();

  calcularTurno(); // Asegurar timestamp exacto
  const total = cart.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  );

  // Validación de efectivo
  if (selectedPaymentMethod === "Efectivo") {
    const received =
      parseInt(document.getElementById("amount-tendered").value) || 0;
    if (received < total) return alert("El monto recibido es insuficiente.");
  }

  // Cerrar modal
  bootstrap.Modal.getInstance(document.getElementById("paymentModal")).hide();

  // ID Único
  const idPedido = `PED-${Date.now()}`;

  // 1. Preparar Datos para AppSheet/Sheets
  const saleData = {
    action: "create_order", // Para que el backend sepa qué hacer
    pedido: {
      ID_Pedido: idPedido,
      FechaHora: currentTurnData.fechaHora, // 2023-12-01T23:59:00
      Fecha_Comercial: currentTurnData.fechaComercial, // 2023-12-01
      Turno: currentTurnData.idTurno,
      ID_Turno: currentTurnData.turnoKey,
      Usuario_Caja: currentUser.Nombre, // O ID_Usuario
      Total_Bruto: total,
      Descuento: 0,
      Total_Neto: total,
      Medio_Pago: selectedPaymentMethod,
      Estado: "Pagado",
    },
    detalles: cart.map((item) => ({
      ID_Detalle: `DET-${Math.random().toString(36).substr(2, 9)}`,
      ID_Pedido: idPedido,
      Fecha_Comercial: currentTurnData.fechaComercial,
      Turno: currentTurnData.idTurno,
      ID_Producto: item.id,
      Nombre_Producto: item.nombre,
      Cantidad: item.cantidad,
      Precio_Unitario: item.precio,
      Subtotal: item.cantidad * item.precio,
      Comentarios: item.comentario,
    })),
  };

  // 2. Imprimir Ticket (Hardware)
  // Asume que window.printTicket existe (cargado desde printer.js)
  if (typeof window.printTicket === "function") {
    try {
      await window.printTicket(cart, total, selectedPaymentMethod, idPedido);
    } catch (e) {
      console.warn("No se pudo imprimir:", e);
      alert("Venta registrada, pero falló la impresión.");
    }
  }

  // 3. Enviar a Base de Datos (Async - No bloqueamos la UI)
  saveToDatabase(saleData);

  // 4. Limpiar UI
  cart = [];
  updateCartUI();
  // Opcional: Mostrar Toast de éxito
}

async function saveToDatabase(payload) {
  try {
    // Enviar como texto plano para evitar CORS preflight complex en Google Scripts
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log("Venta sincronizada correctamente.");
  } catch (error) {
    console.error("Error guardando venta:", error);
    alert(
      "¡ATENCIÓN! La venta se hizo pero no se guardó en la nube (Error de red). Anótala manualmente."
    );
    // Aquí podrías implementar localStorage para reintentar luego
  }
}
// --- ACTUALIZACIÓN AUTOMÁTICA ---

// Configuración: Tiempo entre actualizaciones (en milisegundos)
// 300000 ms = 5 minutos. No recominedo menos de 1 minuto para no saturar Google Sheets.
const UPDATE_INTERVAL = 300000;

function startAutoUpdate() {
  setInterval(() => {
    // REGLA DE SEGURIDAD:
    // Solo actualizamos si el carrito está vacío.
    // No queremos cambiar precios o botones mientras el cajero está cobrando.
    if (cart.length === 0) {
      console.log("Ejecutando actualización automática en segundo plano...");
      loadSystemData(true); // true = modo silencioso
    } else {
      console.log("Actualización pospuesta: Hay una venta en curso.");
    }
  }, UPDATE_INTERVAL);
}

// Iniciar el motor cuando carga la página
document.addEventListener("DOMContentLoaded", () => {
  // ... tus otras llamadas ...
  startAutoUpdate(); // <--- AGREGAR ESTO
});

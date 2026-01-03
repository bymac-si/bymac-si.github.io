// URL ACTUALIZADA
const API_URL = "https://script.google.com/macros/s/AKfycbysFSSAiFnmnY2eX_7YmJHX7dm7JaMJula7KSIXUUxjbDdogjKU6B3bpA9yTDpToKh2/exec";

let db = {
  menu: [],
  modifiers: { agregados: [], elimina: [], cambia: [] },
  categorias: [],
  usuarios: [],
};
let cart = [];
let currentUser = null;
let currentTurnData = null;
let currentReportData = null;
let selectedPaymentMethod = "Efectivo";

const formatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", () => {
  loadSystemData();
  updateClock();
  startAutoUpdate();
  setInterval(updateClock, 60000);
});

async function loadSystemData(silent = false) {
  const container = document.getElementById("products-container");
  if (!silent)
    container.innerHTML = `<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p>Cargando...</p></div>`;
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    db.usuarios = data.usuarios.filter(
      (u) => String(u.Activo).toLowerCase() === "true"
    );
    db.categorias = data.categorias.sort(
      (a, b) => (parseInt(a.Orden) || 99) - (parseInt(b.Orden) || 99)
    );

    const allProducts = data.productos
      .filter((p) => String(p.Activo).trim().toUpperCase() === "TRUE")
      .map((p) => ({
        ...p,
        Precio: parseInt(String(p.Precio).replace(/\D/g, "")) || 0,
        Cocina: String(p.Imprimir_en_Cocina).toUpperCase() === "TRUE",
        Color: (p["ColorBoton"] || "primary").trim(),
        Categoria: p.Categoria,
      }));

    db.menu = [];
    db.modifiers.agregados = [];
    db.modifiers.elimina = [];
    db.modifiers.cambia = [];
    allProducts.forEach((p) => {
      const cat = p.Categoria.toUpperCase();
      if (cat === "AGREGADOS") db.modifiers.agregados.push(p);
      else if (cat === "ELIMINA") db.modifiers.elimina.push(p);
      else if (cat === "CAMBIA") db.modifiers.cambia.push(p);
      else db.menu.push(p);
    });
    db.menu.sort(
      (a, b) => (parseInt(a.Orden) || 99) - (parseInt(b.Orden) || 99)
    );
    renderCategories();
    renderProducts(db.menu);
    if (!silent) checkLogin();
  } catch (error) {
    if (!silent)
      container.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
  }
}

function checkLogin() {
  if (!currentUser)
    new bootstrap.Modal(document.getElementById("loginModal"), {
      backdrop: "static",
      keyboard: false,
    }).show();
}

function attemptLogin() {
  const pin = document.getElementById("pin-input").value.trim();
  const usuario = db.usuarios.find((u) => String(u.PIN) === pin);
  if (usuario) {
    currentUser = usuario;
    document.getElementById(
      "user-display"
    ).innerText = `Cajero: ${usuario.Nombre}`;
    bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
    document.getElementById("pin-input").value = "";
    calcularTurno();
  } else {
    document.getElementById("login-error").innerText = "PIN incorrecto";
  }
}

function calcularTurno() {
  const ahora = new Date();
  const santiagoStr = ahora.toLocaleString("en-US", {
    timeZone: "America/Santiago",
  });
  const santiagoDate = new Date(santiagoStr);
  const hora = santiagoDate.getHours();
  let fechaComercial = new Date(santiagoDate);
  if (hora < 3) fechaComercial.setDate(fechaComercial.getDate() - 1);
  const yyyy = fechaComercial.getFullYear();
  const mm = String(fechaComercial.getMonth() + 1).padStart(2, "0");
  const dd = String(fechaComercial.getDate()).padStart(2, "0");
  const fechaStr = `${yyyy}-${mm}-${dd}`;
  let idTurno = hora >= 18 || hora < 3 ? 2 : 1;
  currentTurnData = {
    fechaHora: santiagoDate.toLocaleString("es-CL"),
    fechaComercial: fechaStr,
    idTurno: idTurno,
    turnoKey: `${fechaStr}-T${idTurno}`,
  };
}
function updateClock() {
  calcularTurno();
}

function getNextOrderNumber() {
  calcularTurno();
  const key = `pos_counter_${currentTurnData.fechaComercial}`;
  let count = parseInt(localStorage.getItem(key)) || 0;
  count++;
  localStorage.setItem(key, count);
  return String(count).padStart(3, "0");
}

function renderCategories() {
  const container = document.getElementById("category-container");
  const techCats = ["AGREGADOS", "ELIMINA", "CAMBIA"];
  const visibleCats = db.categorias.filter(
    (c) => !techCats.includes(c.Nombre.toUpperCase())
  );
  let html = `<button class="btn btn-dark shadow-sm flex-shrink-0" onclick="filterProducts('Todo')">Todo</button>`;
  visibleCats.forEach((cat) => {
    const color = cat.Color ? mapColor(cat.Color) : "secondary";
    html += `<button class="btn btn-${color} shadow-sm flex-shrink-0" onclick="filterProducts('${cat.Nombre}')">${cat.Nombre}</button>`;
  });
  container.innerHTML = html;
}
function filterProducts(catName) {
  renderProducts(
    catName === "Todo"
      ? db.menu
      : db.menu.filter((p) => p.Categoria === catName)
  );
}

function renderProducts(lista) {
  const container = document.getElementById("products-container");
  if (lista.length === 0)
    return (container.innerHTML =
      '<div style="grid-column:1/-1;" class="text-center text-muted mt-5">Sin productos</div>');
  container.innerHTML = lista
    .map((p) => {
      const esHex = p.Color.startsWith("#");
      const claseBg = esHex ? "" : `bg-${mapColor(p.Color)}`;
      const estiloBg = esHex
        ? `background-color: ${p.Color}; color: white;`
        : "";
      return `<div class="card product-card h-100 shadow-sm border-0 ${claseBg}" style="${estiloBg}" onclick="prepareAddToCart('${
        p.ID_Producto
      }')">
            <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-1">
                <h6 class="card-title fw-bold mb-1" style="color: inherit; font-size:0.9rem;">${
                  p.Nombre
                }</h6>
                <span class="badge bg-white text-dark bg-opacity-90 mt-auto px-2 py-1">${formatter.format(
                  p.Precio
                )}</span>
            </div></div>`;
    })
    .join("");
}
function mapColor(c) {
  if (!c) return "primary";
  const map = {
    red: "danger",
    orange: "warning",
    yellow: "warning",
    green: "success",
    blue: "primary",
    cyan: "info",
    black: "dark",
    grey: "secondary",
  };
  return map[String(c).toLowerCase()] || "primary";
}

// --- LOGICA MODAL ---

function renderCheckboxes(containerId, list, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = list
    .map((item) => {
      const priceText = item.Precio > 0 ? ` (+${item.Precio})` : "";
      return `
        <div class="form-check">
            <input class="form-check-input mod-check" type="checkbox" 
                   value="${item.ID_Producto}" data-price="${item.Precio}" data-name="${item.Nombre}" data-type="${type}"
                   id="mod-${item.ID_Producto}" onchange="calculateModalTotal()">
            <label class="form-check-label mod-check-label" for="mod-${item.ID_Producto}">
                <span>${item.Nombre}</span><span class="fw-bold text-muted">${priceText}</span>
            </label>
        </div>`;
    })
    .join("");
}

function setupModalView(prodCategoria) {
  const cat = prodCategoria.toUpperCase();
  const restrictedCats = [
    "BEBIDAS",
    "BEBIDA",
    "SNACKS",
    "OTROS",
  ];
  const isRestricted = restrictedCats.some((rc) => cat.includes(rc));
  const allowSwaps =
    cat.includes("VIENESA") ||
    cat.includes("COMPLETO") ||
    cat.includes("AS");

  const notAllowdDel =
    cat.includes("FRITOS");

  const colAgregados = document.getElementById("col-agregados");
  const colElimina = document.getElementById("col-elimina");
  const colCambios = document.getElementById("col-cambios");

  renderCheckboxes("list-agregados", db.modifiers.agregados, "ADD");
  renderCheckboxes("list-elimina", db.modifiers.elimina, "DEL");
  renderCheckboxes("list-cambios", db.modifiers.cambia, "SWAP");

  if (isRestricted) {
    colAgregados.style.display = "none";
    colElimina.style.display = "none";
    colCambios.style.display = "none";
  } else {
    colAgregados.style.display = "block";
    colElimina.style.display = notAllowdDel ? "none" : "block";
    colCambios.style.display =
      allowSwaps && db.modifiers.cambia.length > 0 ? "block" : "none";
  }

  const visibleCols = [colAgregados, colElimina, colCambios].filter(
    (c) => c.style.display !== "none"
  );
  if (visibleCols.length === 3)
    visibleCols.forEach((c) => (c.className = "col-md-4"));
  else if (visibleCols.length === 2)
    visibleCols.forEach((c) => (c.className = "col-md-6"));
  else if (visibleCols.length === 1)
    visibleCols.forEach((c) => (c.className = "col-12"));
}

function prepareAddToCart(id) {
  const prod = db.menu.find((p) => p.ID_Producto === id);
  if (!prod) return;

  document.getElementById("configModalTitle").innerText = "Agregar Producto";
  document.getElementById("config-product-name").innerText = prod.Nombre;
  document.getElementById("config-mode").value = "add";
  document.getElementById("config-index").value = id;
  document.getElementById("config-base-price").value = prod.Precio;
  document.getElementById("config-comments").value = "";
  document.getElementById("item-srv").checked = true;
  document.getElementById("config-qty").value = 1;
  document.getElementById("btn-delete-item").style.display = "none";
  document.getElementById("btn-split-item").style.display = "none"; // OCULTAR AL AGREGAR

  setupModalView(prod.Categoria);
  calculateModalTotal();
  new bootstrap.Modal(document.getElementById("productConfigModal")).show();
}

function editCartItem(index) {
  const item = cart[index];
  const originalProd = db.menu.find((p) => p.ID_Producto === item.id);
  if (!originalProd) return alert("Producto no encontrado");

  document.getElementById("configModalTitle").innerText = "Modificar Item";
  document.getElementById("config-product-name").innerText = item.nombre;
  document.getElementById("config-mode").value = "edit";
  document.getElementById("config-index").value = index;
  document.getElementById("config-base-price").value = originalProd.Precio;

  setupModalView(originalProd.Categoria);

  document.getElementById("config-qty").value = item.cantidad;
  document.getElementById("config-comments").value = item.manualNote || "";

  if (item.tipoServicio === "LLEVAR")
    document.getElementById("item-llv").checked = true;
  else document.getElementById("item-srv").checked = true;

  if (item.selectedModifiers && item.selectedModifiers.length > 0) {
    item.selectedModifiers.forEach((modId) => {
      const chk = document.getElementById(`mod-${modId}`);
      if (chk) chk.checked = true;
    });
  }

  // MOSTRAR BOTON BORRAR
  document.getElementById("btn-delete-item").style.display = "block";
  
  // MOSTRAR BOTON SEPARAR SOLO SI HAY > 1
  if (item.cantidad > 1) {
      document.getElementById("btn-split-item").style.display = "block";
  } else {
      document.getElementById("btn-split-item").style.display = "none";
  }

  calculateModalTotal();
  new bootstrap.Modal(document.getElementById("productConfigModal")).show();
}

function adjustModalQty(delta) {
  let qty = parseInt(document.getElementById("config-qty").value) || 1;
  qty += delta;
  if (qty < 1) qty = 1;
  document.getElementById("config-qty").value = qty;
  calculateModalTotal();
}

function calculateModalTotal() {
  let unitPrice =
    parseInt(document.getElementById("config-base-price").value) || 0;
  document.querySelectorAll(".mod-check:checked").forEach((chk) => {
    unitPrice += parseInt(chk.dataset.price) || 0;
  });
  const qty = parseInt(document.getElementById("config-qty").value) || 1;
  const total = unitPrice * qty;
  document.getElementById("modal-item-price").innerText =
    formatter.format(total);
}

function saveConfigItem() {
  const mode = document.getElementById("config-mode").value;
  const ref = document.getElementById("config-index").value;
  const basePrice = parseInt(
    document.getElementById("config-base-price").value
  );
  const manualNote = document
    .getElementById("config-comments")
    .value.toUpperCase();
  const serviceType = document.querySelector(
    'input[name="itemServiceType"]:checked'
  ).value;
  const qty = parseInt(document.getElementById("config-qty").value) || 1;

  let unitFinalPrice = basePrice;
  let modTextArray = [];
  let selectedModifiers = [];

  document.querySelectorAll(".mod-check:checked").forEach((chk) => {
    unitFinalPrice += parseInt(chk.dataset.price) || 0;
    selectedModifiers.push(chk.value);
    const type = chk.dataset.type;
    const name = chk.dataset.name;
    if (type === "DEL") modTextArray.push(`SIN ${name}`);
    else if (type === "SWAP") modTextArray.push(`CAMBIO ${name}`);
    else modTextArray.push(`+ ${name}`);
  });

  if (manualNote) modTextArray.push(manualNote);
  const finalComment = modTextArray.join(", ");

  if (mode === "add") {
    const prod = db.menu.find((p) => p.ID_Producto === ref);
    cart.push({
      uuid: Date.now(),
      id: prod.ID_Producto,
      nombre: prod.Nombre,
      precio: unitFinalPrice,
      cantidad: qty,
      cocina: prod.Cocina,
      comentario: finalComment,
      manualNote: manualNote,
      selectedModifiers: selectedModifiers,
      tipoServicio: serviceType,
    });
  } else if (mode === "edit") {
    const index = parseInt(ref);
    if (cart[index]) {
      cart[index].precio = unitFinalPrice;
      cart[index].cantidad = qty;
      cart[index].comentario = finalComment;
      cart[index].manualNote = manualNote;
      cart[index].selectedModifiers = selectedModifiers;
      cart[index].tipoServicio = serviceType;
    }
  }

  updateCartUI();
  bootstrap.Modal.getInstance(
    document.getElementById("productConfigModal")
  ).hide();
}

function deleteConfigItem() {
  const mode = document.getElementById("config-mode").value;
  if (mode === "edit") {
    const index = parseInt(document.getElementById("config-index").value);
    cart.splice(index, 1);
    updateCartUI();
  }
  bootstrap.Modal.getInstance(
    document.getElementById("productConfigModal")
  ).hide();
}

// FUNCION NUEVA: Separar producto
function splitConfigItem() {
    const index = parseInt(document.getElementById('config-index').value);
    const originalItem = cart[index];

    // Seguridad
    if (!originalItem || originalItem.cantidad <= 1) return;

    // 1. Restamos 1 al item original
    originalItem.cantidad -= 1;

    // 2. Creamos clon exacto (con cantidad 1)
    const newItem = JSON.parse(JSON.stringify(originalItem));
    newItem.cantidad = 1;
    newItem.uuid = Date.now() + Math.random();

    // 3. Agregamos al final
    cart.push(newItem);
    
    // 4. Actualizamos vista
    updateCartUI();

    // 5. Cambiamos modal para editar el nuevo
    const newIndex = cart.length - 1;
    document.getElementById('config-index').value = newIndex;
    document.getElementById('config-qty').value = 1;
    
    // Ocultar botón separar
    document.getElementById('btn-split-item').style.display = 'none';

    calculateModalTotal();
    alert("✅ Item separado. Modifique este item individualmente.");
}

function updateCartUI() {
  const container = document.getElementById("cart-container");
  let total = 0;
  container.innerHTML = cart
    .map((item, index) => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;

      const iconService = item.tipoServicio === "LLEVAR" ? "🛍️" : "🍽️";
      const classService =
        item.tipoServicio === "LLEVAR" ? "text-primary" : "text-success";
      const commentHtml = item.comentario
        ? `<div class="text-danger small fw-bold" style="font-size:0.75rem;">${item.comentario}</div>`
        : "";

      return `
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2" onclick="editCartItem(${index})" style="cursor:pointer;">
                <div style="overflow: hidden;">
                    <div class="fw-bold text-truncate">
                        <span class="${classService}">${iconService}</span> ${
        item.nombre
      }
                    </div>
                    ${commentHtml}
                    <div class="small text-muted">${
                      item.cantidad
                    } x ${formatter.format(item.precio)}</div>
                </div>
                <span class="fw-bold">${formatter.format(subtotal)}</span>
            </div>`;
    })
    .join("");

  const totalFmt = formatter.format(total);
  document.getElementById("total-display").innerText = totalFmt;
  document.getElementById("modal-total-pagar").innerText = totalFmt;
}

window.setOpeningBalance = async function () {
  calcularTurno();
  const key = `apertura_${currentTurnData.fechaComercial}_T${currentTurnData.idTurno}`;
  const currentVal = localStorage.getItem(key) || "0";
  const input = prompt(
    `💰 FONDO DE CAJA (Turno ${currentTurnData.idTurno})\n\nIngrese monto inicial:`,
    currentVal
  );
  if (input !== null) {
    const amount = parseInt(input.replace(/\D/g, "")) || 0;
    localStorage.setItem(key, amount);
    if (window.printOpeningTicket) {
      const cajero = currentUser ? currentUser.Nombre : "Admin";
      await window.printOpeningTicket(amount, cajero, currentTurnData.idTurno);
    }
  }
};

function openPaymentModal() {
  if (cart.length === 0) return alert("Carrito vacío");
  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("paymentModal")
  );
  modal.show();
  setPaymentMethod("Efectivo");
  ["amount-tendered", "mix-cash", "mix-card", "mix-transfer"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  document.getElementById("change-display").innerText = "$0";
  document.getElementById("mix-remaining").innerText = "$0";
  setTimeout(() => document.getElementById("amount-tendered").focus(), 500);
}

window.setPaymentMethod = function (method) {
  selectedPaymentMethod = method;
  document.querySelectorAll("#pills-tab .nav-link").forEach((btn) => {
    if (btn.dataset.method === method) btn.classList.add("active");
    else btn.classList.remove("active");
  });
  document.getElementById("cash-section").style.display =
    method === "Efectivo" ? "block" : "none";
  document.getElementById("mixed-section").style.display =
    method === "Mixto" ? "block" : "none";
  if (method === "Mixto") calculateMixed();
};

function calculateChange() {
  const total = cart.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  );
  const received =
    parseInt(document.getElementById("amount-tendered").value) || 0;
  const change = received - total;
  const display = document.getElementById("change-display");
  if (change >= 0) {
    display.innerText = formatter.format(change);
    display.classList.replace("text-danger", "text-success");
  } else {
    display.innerText = "Falta dinero";
    display.classList.replace("text-success", "text-danger");
  }
}

window.calculateMixed = function () {
  const total = cart.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const c = parseInt(document.getElementById("mix-cash").value) || 0;
  const t = parseInt(document.getElementById("mix-card").value) || 0;
  const tr = parseInt(document.getElementById("mix-transfer").value) || 0;

  const diff = total - (c + t + tr);
  const lbl = document.getElementById("mix-remaining");
  if (diff > 0) {
    lbl.innerText = `$${diff.toLocaleString("es-CL")}`;
    lbl.className = "text-danger";
  } else if (diff === 0) {
    lbl.innerText = "¡COMPLETO!";
    lbl.className = "text-success";
  } else {
    lbl.innerText = `Sobran: $${Math.abs(diff).toLocaleString("es-CL")}`;
    lbl.className = "text-warning";
  }
};

async function processSale() {
  if (!currentUser) return checkLogin();
  const total = cart.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  let finalPaymentString = selectedPaymentMethod;

  if (selectedPaymentMethod === "Efectivo") {
    const received =
      parseInt(document.getElementById("amount-tendered").value) || 0;
    if (received < total) return alert("Monto insuficiente");
  }

  if (selectedPaymentMethod === "Mixto") {
    const c = parseInt(document.getElementById("mix-cash").value) || 0;
    const t = parseInt(document.getElementById("mix-card").value) || 0;
    const tr = parseInt(document.getElementById("mix-transfer").value) || 0;
    if (c + t + tr !== total) return alert("⚠️ El pago no cuadra.");
    finalPaymentString = `MIXTO|E:${c}|T:${t}|Tr:${tr}`;
  }

  // Nota: Ya no tomamos un servicio global, cada producto tiene su propio tipo
  // Se envía un default para el encabezado del ticket
  const serviceType = "MIXTO"; 

  bootstrap.Modal.getInstance(document.getElementById("paymentModal")).hide();
  calcularTurno();
  const idPedido = `PED-${Date.now()}`;
  const numeroDia = getNextOrderNumber();

  try {
    if (typeof window.printTicket === "function")
      await window.printTicket(cart, total, finalPaymentString, numeroDia);
  } catch (e) {
    console.error(e);
  }

  const saleData = {
    action: "create_order",
    pedido: {
      ID_Pedido: idPedido,
      Numero_Turno: numeroDia,
      FechaHora: currentTurnData.fechaHora,
      Fecha_Comercial: currentTurnData.fechaComercial,
      Turno: currentTurnData.idTurno,
      ID_Turno: currentTurnData.turnoKey,
      Usuario_Caja: currentUser.Nombre,
      Total_Bruto: total,
      Total_Neto: total,
      Medio_Pago: finalPaymentString,
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
      Comentarios: `[${item.tipoServicio}] ${item.comentario || ""}`,
    })),
  };
  saveToDatabase(saleData);
  cart = [];
  updateCartUI();
}
async function saveToDatabase(payload) {
  try {
    await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
  } catch (e) {
    console.error(e);
    alert("Error guardando.");
  }
}

async function showDailyReport() {
  const modal = new bootstrap.Modal(document.getElementById("reportModal"));
  modal.show();
  calcularTurno();
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "get_daily_report",
        fecha: currentTurnData.fechaComercial,
      }),
    });
    const result = await response.json();
    if (result.status === "success") {
      currentReportData = result.data;
      renderReportUI(result.data);
    } else {
      document.getElementById(
        "report-body"
      ).innerHTML = `<div class="alert alert-danger">${result.message}</div>`;
    }
  } catch (e) {
    document.getElementById(
      "report-body"
    ).innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function renderReportUI(data) {
  const fmt = (n) => formatter.format(n);
  document.getElementById(
    "report-body"
  ).innerHTML = `<h5 class="text-center">Total Día: <b>${fmt(
    data.gran_total
  )}</b></h5>`;
}
async function printReportAction() {
  const modalElement = document.getElementById("reportModal");
  const modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (modalInstance) modalInstance.hide();
  if (currentReportData && window.printDailyReport)
    setTimeout(async () => {
      await window.printDailyReport(currentReportData);
    }, 300);
}
function startAutoUpdate() {
  setInterval(() => {
    if (cart.length === 0) loadSystemData(true);
  }, 300000);
  setInterval(() => {
    updateClock();
    checkAutoShiftChange();
  }, 30000);
}
function checkAutoShiftChange() {
  const ahora = new Date();
  const santiagoStr = ahora.toLocaleString("en-US", {
    timeZone: "America/Santiago",
  });
  const santiagoDate = new Date(santiagoStr);
  if (santiagoDate.getHours() === 18 && santiagoDate.getMinutes() <= 1) {
    const key = `turno_cambiado_${santiagoDate.getDate()}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "true");
      alert("⏰ 18:00 HRS. Cambio de Turno.");
      window.location.reload(true);
    }
  }
}
window.manualShiftChange = function () {
  if (cart.length > 0) {
    if (!confirm("⚠️ Hay venta en curso. ¿Cambiar turno?")) return;
  }
  window.location.reload(true);
};
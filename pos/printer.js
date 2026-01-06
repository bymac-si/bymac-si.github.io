/**
 * printer.js - VERSIÓN REPORTE Z UNIFICADO (DÍA COMPLETO)
 * Diseñado para cuadrar caja sumando Turno 1 + Turno 2
 */

function getPrintableArea() {
  let area = document.getElementById("printable-area");
  if (!area) {
    area = document.createElement("div");
    area.id = "printable-area";
    document.body.appendChild(area);
  }
  return area;
}

function connectPrinter() {
  console.log("🖨️ Sistema de impresión listo");
  alert("✅ Impresión Nativa Activada.");
}

function imprimirYLimpiar(area) {
  area.style.display = "block";
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      area.style.display = "none";
      area.innerHTML = "";
    }, 100);
  }, 50);
}

const footerHtml = `
    <div class="text-center" style="font-size: 0.6rem; margin-top: 15px; margin-bottom: 5px; color: #444;">
        Desarrollado por Asesorías Profesionales<br>
        Marcos Alberto Castro Abarca E.I.R.L
    </div>
`;

// === 1. TICKET DE APERTURA (Se mantiene igual) ===
window.printOpeningTicket = async function (amount, cashier, turno) {
  const area = getPrintableArea();
  const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  area.innerHTML = `
        <div class="ticket-header fs-big">APERTURA CAJA</div>
        <div class="text-center fw-bold">El Carro del 8</div>
        <div class="ticket-divider"></div>
        <div class="text-center">${fecha}</div>
        <div class="text-center">Turno: ${turno}</div>
        <div class="text-center">Cajero: ${cashier}</div>
        <br>
        <div class="text-center fs-huge">FONDO: $${amount.toLocaleString("es-CL")}</div>
        <br><br>
        <div class="ticket-divider"></div>
        <div class="text-center">Firma Cajero</div>
        <br>
        ${footerHtml}
        <br>.
    `;
  imprimirYLimpiar(area);
};

// === 2. TICKET DE VENTA (Se mantiene igual) ===
window.printTicket = async function (cart, total, method, orderNum) {
  const ticketArea = getPrintableArea();
  const fechaHora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  const soloHora = fechaHora.split(" ")[1] || fechaHora;
  const nombreCajero = typeof currentUser !== "undefined" && currentUser ? currentUser.Nombre : "Cajero";
  
  let displayMethod = method;
  if (method.includes("MIXTO")) displayMethod = "Mixto";

  // COCINA
  const itemsCocina = cart.filter((i) => i.cocina);
  let htmlCocina = "";
  if (itemsCocina.length > 0) {
    let listadoCocina = "";
    itemsCocina.forEach((item) => {
      const srvTag = item.tipoServicio === "LLEVAR" ? "LLEVAR" : "SERVIR";
      const nota = item.comentario ? `<div style="font-size:0.8em; font-weight:normal;">( ${item.comentario} )</div>` : "";
      listadoCocina += `<div>${item.cantidad} x ${item.nombre} <b>${srvTag}</b> ${nota}</div>`;
    });
    htmlCocina = `
            <div class="ticket-header fs-big">COCINA</div>
            <div class="text-center fs-huge" style="font-size:2.5rem;font-weight: bold;">#${orderNum}</div>
            <div class="text-center" style="font-size:1.1rem;font-weight: bold;">${soloHora}</div>
            <div class="ticket-divider"></div>
            <div class="fs-big text-uppercase" style="text-align:left; margin-bottom: 10px; font-size: 1.8rem;">${listadoCocina}</div>
            <div class="text-center">.</div><div class="force-break"></div>`;
  }

  // CLIENTE
  let listadoCliente = "";
  cart.forEach((item) => {
    const totalItem = (item.precio * item.cantidad).toLocaleString("es-CL");
    const srvTag = item.tipoServicio === "LLEVAR" ? "(LLEVAR)" : "(SERVIR)";
    const nota = item.comentario ? `<div style="font-size:0.8em; font-style:italic;">* ${item.comentario}</div>` : "";
    listadoCliente += `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2px; font-size:1.2rem;">
                <span style="flex:1; padding-right:5px; text-align:left;">${item.cantidad} x ${item.nombre} ${srvTag} ${nota}</span>
                <span style="white-space:nowrap;">$${totalItem}</span>
            </div>`;
  });

  const htmlCliente = `
        <div class="ticket-header"><img src="img/logo_8_sf.png" width="80px" alt="" /><br>EL CARRO DEL OCHO</div>
        <div class="text-center ticket-divider"><span class="fs-huge">PEDIDO: #${orderNum}</span></div>
        <div class="text-center text-uppercase" style="font-size:1.1rem; margin-bottom:5px;">${fechaHora}<br>ATENDIDO POR: ${nombreCajero}</div>
        <div class="ticket-divider text-uppercase" style="font-size: 1rem;">${listadoCliente}</div>
        <div class="d-flex-between fs-big" style="margin-top:5px;"><span>TOTAL:</span><span>$${total.toLocaleString("es-CL")}</span></div>
        <div style="font-size: 1.2rem;">Pago: ${displayMethod}</div>
        <div class="text-center" style="margin-top:15px; font-size:1.1rem;">¡Gracias por su preferencia!</div>
        ${footerHtml}
        <div style="text-align:center; margin-top:10px;">.</div>`;

  ticketArea.innerHTML = htmlCocina + htmlCliente;
  imprimirYLimpiar(ticketArea);
};

// === 3. REPORTE Z (UNIFICADO DIARIO) ===
window.printDailyReport = async function (data) {
  const ticketArea = getPrintableArea();
  
  // Formatear Fecha
  let fechaFormateada = data.fecha;
  if (data.fecha && data.fecha.includes("-")) {
    const [anio, mes, dia] = data.fecha.split("-");
    fechaFormateada = `${dia}/${mes}/${anio}`;
  }

  // 1. OBTENER DATOS UNIFICADOS (T1 + T2)
  // 'fondo_inicial' viene de la nube y es la suma de TODAS las aperturas de hoy
  const totalApertura = parseInt(data.fondo_inicial) || 0;

  // Sumar ventas de ambos turnos
  const totalEfectivo = (data.turnos[1].efectivo || 0) + (data.turnos[2].efectivo || 0);
  const totalTarjeta = (data.turnos[1].tarjeta || 0) + (data.turnos[2].tarjeta || 0);
  const totalTransf = (data.turnos[1].transferencia || 0) + (data.turnos[2].transferencia || 0);
  
  // Total Venta (Sin fondo)
  const totalVentaDia = totalEfectivo + totalTarjeta + totalTransf;

  // Total Dinero en Caja (Lo que el cajero debe contar físicamente en billetes)
  const totalEnCaja = totalApertura + totalEfectivo;

  // Lógica de Productos (Ranking)
  let prodHtml = "";
  const ranking = Object.entries(data.productos).sort((a, b) => b[1] - a[1]);
  if (ranking.length === 0) prodHtml = "<div>Sin ventas.</div>";
  else ranking.forEach(([nom, cant]) => (prodHtml += `<div style="display:flex; justify-content:space-between;"><span style="flex:1;">${cant} x ${nom}</span></div>`));

  // --- GENERAR HTML DEL TICKET ---
  ticketArea.innerHTML = `
        <div class="ticket-header fs-big">REPORTE Z (DIARIO)<br><b>El Carro del 8</b></div>
        <div class="text-center fs-big">Fecha: ${fechaFormateada}</div>
        <div class="text-center small">Consolidado Turno 1 + Turno 2</div>
        <div class="ticket-divider"></div>
        <br>
        
        <div class="text-center fw-bold" style="font-size: 1.1rem; text-decoration: underline;">CUADRATURA EFECTIVO</div>
        
        <div class="d-flex-between" style="font-size:1.1rem; margin-top:5px;">
            <span>(+) Fondos Iniciales:</span>
            <span>$${totalApertura.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between" style="font-size:1.1rem;">
            <span>(+) Ventas Efectivo:</span>
            <span>$${totalEfectivo.toLocaleString("es-CL")}</span>
        </div>
        
        <div class="ticket-divider"></div>
        
        <div class="d-flex-between fw-bold fs-big" style="margin: 5px 0;">
            <span>EN CAJA:</span>
            <span>$${totalEnCaja.toLocaleString("es-CL")}</span>
        </div>
        <div class="text-center small">(Dinero físico que debe haber)</div>
        <br>
        
        <div class="ticket-divider"></div>
        <div class="d-flex-between" style="font-size:1.1rem;">
            <span>💳 Tarjetas (Total):</span>
            <span>$${totalTarjeta.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between" style="font-size:1.1rem;">
            <span>🏦 Transferencias:</span>
            <span>$${totalTransf.toLocaleString("es-CL")}</span>
        </div>
        <br>

        <div class="ticket-divider"></div>
        <div class="d-flex-between fw-bold" style="font-size:1.2rem;">
            <span>VENTA TOTAL DÍA:</span>
            <span>$${totalVentaDia.toLocaleString("es-CL")}</span>
        </div>
        <br>
        
        <div class="ticket-divider"></div>
        <div class="fs-big text-center">PRODUCTOS VENDIDOS</div>
        <br>
        <div style="font-size:1.1em">${prodHtml}</div>
        <br>
        <div class="ticket-divider"></div>
        <div class="text-center fs-big">UNIDADES: <strong>${data.total_unidades}</strong></div>
        <br>
        
        ${footerHtml}
        <br><br>.`;

  imprimirYLimpiar(ticketArea);
};
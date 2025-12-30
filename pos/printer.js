/**
 * printer.js - VERSIÓN FINAL CON CORTE DE PÁGINA FÍSICO
 * Incluye: Letra grande en cocina, Apertura de Caja y Pagos Mixtos en Reporte Z
 */

// Helper para obtener/crear el área de impresión
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
  alert(
    "✅ Impresión Nativa Activada.\nSe usará la impresora predeterminada de Windows/Mac."
  );
}

// === IMPRIMIR TICKET DE VENTA ===
window.printTicket = async function (cart, total, method, orderNum, serviceType) {
  const ticketArea = getPrintableArea();

  // Hora forzada a Chile
  const fechaHora = new Date().toLocaleString("es-CL", {
    timeZone: "America/Santiago",
  });
  const soloHora = fechaHora.split(" ")[1] || fechaHora;

  // Detectar nombre del cajero
  const nombreCajero =
    typeof currentUser !== "undefined" && currentUser
      ? currentUser.Nombre
      : "Cajero";

  // --- 1. SECCIÓN COCINA ---
  const itemsCocina = cart.filter((i) => i.cocina);
  let htmlCocina = "";

  if (itemsCocina.length > 0) {
    let listadoCocina = "";
    itemsCocina.forEach((item) => {
      listadoCocina += `<div>${item.cantidad} x ${item.nombre}</div>`;
    });

    htmlCocina = `
            <div class="ticket-header fs-big">COCINA</div>
            <div class="text-center fs-huge">#${orderNum}</div>
            <div class="text-center" style="font-size:1em;font-weight: bold;">${soloHora}</div>
            
            <div class="text-center" style="border: 2px solid black; margin: 5px 0; font-weight:bold; font-size:1.8em; padding:2px;">
                ${serviceType}
            </div>

            <div class="ticket-divider"></div>
            <div class="fs-big text-uppercase" style="text-align:left; margin-bottom: 10px; font-size: 2.1em;">
                ${listadoCocina}
            </div>
            
            <div class="text-center">.</div>
            <div class="force-break"></div>
        `;
  }

  // --- 2. SECCIÓN CLIENTE ---
  let listadoCliente = "";
  cart.forEach((item) => {
    const totalItem = (item.precio * item.cantidad).toLocaleString("es-CL");
    listadoCliente += `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2px; font-size:1.5em;">
                <span style="flex:1; padding-right:5px; text-align:left;">${item.cantidad} x ${item.nombre}</span>
                <span style="white-space:nowrap;">$${totalItem}</span>
            </div>
        `;
  });

  const htmlCliente = `
        <div class="ticket-header">
        <img src="img/logo_8_sf.png" width="80px" alt="" /><br>
            EL CARRO DEL OCHO
        </div>
        <div class="text-center ticket-divider">
            <span class="fs-huge">PEDIDO: #${orderNum}</span>
        </div>
        
        <div class="text-center fw-bold" style="font-size:1.4em; margin-bottom:5px;">
            << ${serviceType} >>
        </div>
      
        <div class="text-center text-uppercase" style="font-size:1.4em; margin-bottom:5px;">
            ${fechaHora}<br>
            ATENDIDO POR: ${nombreCajero}
        </div>
        
        <div class="ticket-divider text-uppercase" style="font-size: 1.2em;">
            ${listadoCliente}
        </div>
        
        <div class="d-flex-between fs-big" style="margin-top:5px;">
            <span>TOTAL:</span>
            <span>$${total.toLocaleString("es-CL")}</span>
        </div>
        <div style="font-size: 1.5em;">Pago: ${method}</div>
        
        <div class="text-center" style="margin-top:15px; font-size:1.3em;">
            ¡Gracias por su preferencia!
        </div>
        <div style="text-align:center; margin-top:10px;">.</div> 
    `;

  // 3. RENDERIZAR
  ticketArea.innerHTML = htmlCocina + htmlCliente;
  imprimirYLimpiar(ticketArea);
};

// === IMPRIMIR REPORTE Z (CORREGIDO: Detecta AM y PM) ===
window.printDailyReport = async function (data) {
  const ticketArea = getPrintableArea();

  // 1. Formato de Fecha
  let fechaFormateada = data.fecha;
  if (data.fecha && data.fecha.includes("-")) {
    const [anio, mes, dia] = data.fecha.split("-");
    fechaFormateada = `${dia}/${mes}/${anio}`;
  }
  
  // 2. RECUPERAR MONTO DE APERTURA (AM y PM)
  // Buscamos en la memoria del navegador usando la fecha del reporte
  const keyAM = `apertura_${data.fecha}_T1`;
  const keyPM = `apertura_${data.fecha}_T2`;
  
  const aperturaAM = parseInt(localStorage.getItem(keyAM)) || 0;
  const aperturaPM = parseInt(localStorage.getItem(keyPM)) || 0;
  const totalApertura = aperturaAM + aperturaPM;
  
  // 3. CALCULAMOS TOTALES
  const totalEfectivo = (data.turnos[1].efectivo || 0) + (data.turnos[2].efectivo || 0);
  const totalTarjeta = (data.turnos[1].tarjeta || 0) + (data.turnos[2].tarjeta || 0);
  const totalTransf = (data.turnos[1].transferencia || 0) + (data.turnos[2].transferencia || 0);

  // 4. Lógica de Productos
  let prodHtml = "";
  const ranking = Object.entries(data.productos).sort((a, b) => b[1] - a[1]);

  if (ranking.length === 0) {
    prodHtml = "<div>Sin ventas registradas.</div>";
  } else {
    ranking.forEach(([nom, cant]) => {
      prodHtml += `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <span style="flex:1; text-align:left;">${cant} x ${nom}</span>
            </div>`;
    });
  }

  // 5. GENERAR HTML
  // Nota: Si hubo apertura en ambos turnos, se muestran sumados o separados.
  // Aquí mostraré el total de apertura para simplificar el arqueo.
  
  ticketArea.innerHTML = `
        <div class="ticket-header fs-big">REPORTE DE VENTAS<br><b>El Carro del 8</b></div>
        <div class="text-center fs-big">Fecha: ${fechaFormateada}</div><br>
        <div class="ticket-divider"></div>
        <br>
        
        <div class="d-flex-between fw-bold" style="font-size:1.1em;">
            <span>💰 Fondo Inicial (Total):</span>
            <span>$${totalApertura.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between fw-bold" style="font-size:1.1em;">
            <span>💵 Efectivo Venta:</span>
            <span>$${totalEfectivo.toLocaleString("es-CL")}</span>
        </div>
        <div class="ticket-divider"></div>
        <div class="d-flex-between fw-bold" style="font-size:1.2em;">
            <span>TOTAL CAJA:</span>
            <span>$${(totalApertura + totalEfectivo).toLocaleString("es-CL")}</span>
        </div>
        <br>
        
        <div class="ticket-divider"></div>
        <div class="d-flex-between" style="font-size:1.1em;">
            <span>💳 Tarjeta:</span>
            <span>$${totalTarjeta.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between" style="font-size:1.1em;">
            <span>🏦 Transferencia:</span>
            <span>$${totalTransf.toLocaleString("es-CL")}</span>
        </div>
        <br>

        <div class="ticket-divider"></div>
        <div class="d-flex-between" style="font-size:1.1em;">
            <span>Venta Turno AM:</span>
            <span>$${data.turnos[1].total.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between" style="font-size:1.1em;">
            <span>Venta Turno PM:</span>
            <span>$${data.turnos[2].total.toLocaleString("es-CL")}</span>
        </div>
        
        <br>
        <div class="ticket-divider"></div>
        <div class="fs-big text-center">PRODUCTOS VENDIDOS</div><br>
        <div style="font-size:1.1em">${prodHtml}</div>
        
        <br>
        <div class="ticket-divider"></div>
        <div class="text-center fs-big">UNIDADES: <strong>${data.total_unidades}</strong></div><br>
        <div class="text-center fs-huge" style="border:2px solid black; padding:5px; margin-top:5px;">
            TOTAL: $${data.gran_total.toLocaleString("es-CL")}
        </div>
        <br><br>.
  `;

  imprimirYLimpiar(ticketArea);
};

// Helper de impresión
function imprimirYLimpiar(area) {
  area.style.display = "block";
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      area.style.display = "none";
      area.innerHTML = "";
    }, 500);
  }, 100);
}
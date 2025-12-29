/**
 * printer.js - VERSIÓN FINAL CON CORTE DE PÁGINA FÍSICO
 * CORREGIDO: Variable de usuario y comillas en estilos.
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

// === IMPRIMIR TICKET DE VENTA (Con corte físico entre Cocina y Cliente) ===
window.printTicket = async function (
  cart,
  total,
  method,
  orderNum,
  serviceType
) {
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
            <div class="fs-big" style="text-align:left; margin-bottom: 10px;">
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
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2px;">
                <span style="flex:1; padding-right:5px; text-align:left;">${item.cantidad} x ${item.nombre}</span>
                <span style="white-space:nowrap;">$${totalItem}</span>
            </div>
        `;
  });

  const htmlCliente = `
        <div class="ticket-header">
        <img src="img/logo_8_sf.png" width="50px" alt="" /><br>
            EL CARRO DEL OCHO
        </div>
        <div class="text-center ticket-divider">
            <span class="fs-huge">PEDIDO: #${orderNum}</span>
        </div>
        
        <div class="text-center fw-bold" style="font-size:1.2em; margin-bottom:5px;">
            << ${serviceType} >>
        </div>
      
        <div class="text-center" style="font-size:1em; margin-bottom:5px;">
            ${fechaHora}<br>
            ATENDIDO POR: ${nombreCajero}
        </div>
        
        <div class="ticket-divider" style="font-size: 1.5em;">
            ${listadoCliente}
        </div>
        
        <div class="d-flex-between fs-big" style="margin-top:5px;">
            <span>TOTAL:</span>
            <span>$${total.toLocaleString("es-CL")}</span>
        </div>
        <div style="font-size: 1.1em;">Pago: ${method}</div>
        
        <div class="text-center" style="margin-top:15px; font-size:0.8em;">
            ¡Gracias por su preferencia!
        </div>
        <div style="text-align:center; margin-top:10px;">.</div> 
    `;

  // 3. RENDERIZAR
  ticketArea.innerHTML = htmlCocina + htmlCliente;
  imprimirYLimpiar(ticketArea);
};
// === IMPRIMIR REPORTE Z CON DESGLOSE DE PAGO ===
window.printDailyReport = async function (data) {
  const ticketArea = getPrintableArea();

  // Formato de Fecha DD/MM/YYYY
  let fechaFormateada = data.fecha;
  if (data.fecha && data.fecha.includes("-")) {
    const [anio, mes, dia] = data.fecha.split("-");
    fechaFormateada = `${dia}/${mes}/${anio}`;
  }

  // 1. CALCULAMOS LOS TOTALES
  const totalEfectivo =
    (data.turnos[1].efectivo || 0) + (data.turnos[2].efectivo || 0);
  const totalTarjeta =
    (data.turnos[1].tarjeta || 0) + (data.turnos[2].tarjeta || 0);
  const totalTransf =
    (data.turnos[1].transferencia || 0) + (data.turnos[2].transferencia || 0);

  // 2. Lógica de Productos (Nombres completos)
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

  // 3. GENERAMOS EL HTML DEL REPORTE
  // CORRECCIÓN: Se agregaron las comillas de cierre (") faltantes en los atributos style
  ticketArea.innerHTML = `
        <div class="ticket-header fs-big">REPORTE DE VENTAS<br><b>El Carro del 8</b></div>
        
        <div class="text-center fs-big">Fecha: ${fechaFormateada}</div><br>
        
        <div class="ticket-divider"></div>
        <br>
        <div class="text-center fs-big">RESUMEN POR MEDIO DE PAGO</div>
        
        <div class="d-flex-between fw-bold" style="font-size:1.3em;">
            <span>Efectivo (Caja):</span>
            <span>$${totalEfectivo.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between fw-bold" style="font-size:1.3em;">
            <span>Tarjeta:</span>
            <span>$${totalTarjeta.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between fw-bold" style="font-size:1.3em;">
            <span>Transferencia:</span>
            <span>$${totalTransf.toLocaleString("es-CL")}</span>
        </div><br>
        
        <div class="ticket-divider"></div>
        <br>
        <div class="fs-big text-center">TOTALES POR TURNO</div>
        
        <div class="d-flex-between fw-bold" style="font-size:1.3em;">
            <span>Venta Turno 1 (AM): </span>
            <span>$${data.turnos[1].total.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between fw-bold" style="font-size:1.3em;">
            <span>Venta Turno 2 (PM): </span>
            <span>$${data.turnos[2].total.toLocaleString("es-CL")}</span>
        </div>
        
        <br>
        <div class="ticket-divider"></div>
        <br>
        <div class="fs-big text-center">PRODUCTOS</div><br>
        <div style="font-size:1.4em; font-weight:bold;">${prodHtml}</div>
        <br>
        <div class="ticket-divider"></div>
        <br>
        <div class="text-center fs-big">UNIDADES: <strong>${
          data.total_unidades
        }</strong></div><br>
        <div class="text-center fs-huge" style="border:1px solid black; margin-top:5px;">
            $${data.gran_total.toLocaleString("es-CL")}
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

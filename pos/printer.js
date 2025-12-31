function getPrintableArea() {
  let area = document.getElementById("printable-area");
  if (!area) { area = document.createElement("div"); area.id = "printable-area"; document.body.appendChild(area); }
  return area;
}
function connectPrinter() { alert("✅ Impresión Nativa Activada."); }
function imprimirYLimpiar(area) { area.style.display = "block"; setTimeout(() => { window.print(); setTimeout(() => { area.style.display = "none"; area.innerHTML = ""; }, 500); }, 100); }

window.printOpeningTicket = async function(amount, cashier, turno) {
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
        <div class="text-center fs-huge">FONDO: $${amount.toLocaleString('es-CL')}</div>
        <br><br>
        <div class="ticket-divider"></div>
        <div class="text-center">Firma Cajero</div>
        <br>.
    `;
    imprimirYLimpiar(area);
};

window.printTicket = async function (cart, total, method, orderNum) {
  const ticketArea = getPrintableArea();
  const fechaHora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  const soloHora = fechaHora.split(" ")[1] || fechaHora;
  const nombreCajero = typeof currentUser !== "undefined" && currentUser ? currentUser.Nombre : "Cajero";
  let displayMethod = method;
  if(method.includes("MIXTO")) displayMethod = "Mixto";

  const itemsCocina = cart.filter((i) => i.cocina);
  let htmlCocina = "";
  if (itemsCocina.length > 0) {
    let listadoCocina = "";
    itemsCocina.forEach((item) => {
      // Icono o texto para Cocina
      const srvTag = item.tipoServicio === 'LLEVAR' ? '(LL)' : '(SRV)';
      const nota = item.comentario ? `<div style="font-size:0.6em; font-weight:normal;">( ${item.comentario} )</div>` : '';
      listadoCocina += `<div>${item.cantidad} x ${item.nombre} <b>${srvTag}</b> ${nota}</div>`;
    });
    htmlCocina = `
            <div class="ticket-header fs-big">COCINA</div>
            <div class="text-center fs-huge" style="font-size:1.1rem;font-weight: bold;">#${orderNum}</div>
            <div class="text-center" style="font-size:1.1rem;font-weight: bold;">${soloHora}</div>
            <div class="ticket-divider"></div>
            <div class="fs-big text-uppercase" style="text-align:left; margin-bottom: 10px; font-size: 2.5rem;">${listadoCocina}</div>
            <div class="text-center">.</div><div class="force-break"></div>`;
  }

  let listadoCliente = "";
  cart.forEach((item) => {
    const totalItem = (item.precio * item.cantidad).toLocaleString("es-CL");
    const srvTag = item.tipoServicio === 'LLEVAR' ? '(LL)' : '(SRV)';
    const nota = item.comentario ? `<div style="font-size:0.7em; font-style:italic;">* ${item.comentario}</div>` : '';
    listadoCliente += `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2px; font-size:1.5rem;">
                <span style="flex:1; padding-right:5px; text-align:left;">${item.cantidad} x ${item.nombre} ${srvTag} ${nota}</span>
                <span style="white-space:nowrap;">$${totalItem}</span>
            </div>`;
  });

  const htmlCliente = `
        <div class="ticket-header"><img src="img/logo_8_sf.png" width="80px" alt="" /><br>EL CARRO DEL OCHO</div>
        <div class="text-center ticket-divider"><span class="fs-huge">PEDIDO: #${orderNum}</span></div>
        <div class="text-center text-uppercase" style="font-size:1.4rem; margin-bottom:5px;">${fechaHora}<br>ATENDIDO POR: ${nombreCajero}</div>
        <div class="ticket-divider text-uppercase" style="font-size: 1.2rem;">${listadoCliente}</div>
        <div class="d-flex-between fs-big" style="margin-top:5px;"><span>TOTAL:</span><span>$${total.toLocaleString("es-CL")}</span></div>
        <div style="font-size: 1.5rem;">Pago: ${displayMethod}</div>
        <div class="text-center" style="margin-top:15px; font-size:1.3rem;">¡Gracias por su preferencia!</div>
        <div style="text-align:center; margin-top:10px;">.</div>`;

  ticketArea.innerHTML = htmlCocina + htmlCliente;
  imprimirYLimpiar(ticketArea);
};

window.printDailyReport = async function (data) {
  const ticketArea = getPrintableArea();
  let fechaFormateada = data.fecha;
  if (data.fecha && data.fecha.includes("-")) { const [anio, mes, dia] = data.fecha.split("-"); fechaFormateada = `${dia}/${mes}/${anio}`; }
  
  const keyAM = `apertura_${data.fecha}_T1`; const keyPM = `apertura_${data.fecha}_T2`;
  const aperturaAM = parseInt(localStorage.getItem(keyAM)) || 0;
  const aperturaPM = parseInt(localStorage.getItem(keyPM)) || 0;
  const totalApertura = aperturaAM + aperturaPM;
  
  const totalEfectivo = (data.turnos[1].efectivo || 0) + (data.turnos[2].efectivo || 0);
  const totalTarjeta = (data.turnos[1].tarjeta || 0) + (data.turnos[2].tarjeta || 0);
  const totalTransf = (data.turnos[1].transferencia || 0) + (data.turnos[2].transferencia || 0);

  let prodHtml = "";
  const ranking = Object.entries(data.productos).sort((a, b) => b[1] - a[1]);
  if (ranking.length === 0) prodHtml = "<div>Sin ventas.</div>";
  else ranking.forEach(([nom, cant]) => prodHtml += `<div style="display:flex; justify-content:space-between;"><span style="flex:1;">${cant} x ${nom}</span></div>`);

  ticketArea.innerHTML = `
        <div class="ticket-header fs-big">REPORTE Z<br><b>El Carro del 8</b></div>
        <div class="text-center fs-big">Fecha: ${fechaFormateada}</div><br>
        <div class="ticket-divider"></div><br>
        
        <div class="d-flex-between fw-bold" style="font-size:1.1rem;"><span>💰 Fondo Inicial:</span><span>$${totalApertura.toLocaleString("es-CL")}</span></div>
        <div class="d-flex-between fw-bold" style="font-size:1.1rem;"><span>💵 Efec. Venta:</span><span>$${totalEfectivo.toLocaleString("es-CL")}</span></div>
        <div class="ticket-divider"></div>
        <div class="d-flex-between fw-bold" style="font-size:1.2rem;"><span>TOTAL CAJA:</span><span>$${(totalApertura + totalEfectivo).toLocaleString("es-CL")}</span></div>
        <br>
        
        <div class="ticket-divider"></div>
        <div class="d-flex-between"><span>💳 Tarjeta:</span><span>$${totalTarjeta.toLocaleString("es-CL")}</span></div>
        <div class="d-flex-between"><span>🏦 Transf:</span><span>$${totalTransf.toLocaleString("es-CL")}</span></div>
        <br>

        <div class="ticket-divider"></div>
        <div class="d-flex-between"><span>Venta Turno AM:</span><span>$${data.turnos[1].total.toLocaleString("es-CL")}</span></div>
        <div class="d-flex-between"><span>Venta Turno PM:</span><span>$${data.turnos[2].total.toLocaleString("es-CL")}</span></div>
        <br>
        
        <div class="ticket-divider"></div><div class="fs-big text-center">PRODUCTOS</div><br><div style="font-size:1.1em">${prodHtml}</div><br>
        <div class="ticket-divider"></div><div class="text-center fs-big">UNIDADES: <strong>${data.total_unidades}</strong></div><br>
        <div class="text-center fs-huge" style="border:2px solid black; padding:5px;">TOTAL: $${data.gran_total.toLocaleString("es-CL")}</div><br><br>.`;

  imprimirYLimpiar(ticketArea);
};
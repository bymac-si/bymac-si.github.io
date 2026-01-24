/**
 * printer.js
 * Módulo de impresión directa para POS web en Windows/Kiosco.
 * Utiliza la impresora predeterminada del sistema operativo.
 */

// Referencia al contenedor de impresión
function getPrintableArea() {
    let area = document.getElementById("printable-area");
    if (!area) {
        area = document.createElement("div");
        area.id = "printable-area";
        document.body.appendChild(area);
    }
    return area;
}

// Simulación de conexión (En web usamos el driver del SO)
function connectPrinter() {
    console.log("🖨️ Sistema de impresión listo (Driver SO)");
    alert("✅ Impresión lista. Asegúrate de que tu impresora térmica sea la predeterminada en Windows.");
}

// Función core: Muestra, Imprime y Limpia
function imprimirYLimpiar(area) {
    // 1. Hacemos visible el área
    area.style.display = "block";

    // 2. Damos tiempo al navegador para renderizar el HTML (200ms)
    setTimeout(() => {
        window.print(); // Lanza la orden al spooler de Windows

        // 3. Ocultamos y limpiamos después de enviar la orden
        setTimeout(() => {
            area.style.display = "none";
            area.innerHTML = "";
        }, 500);
    }, 200);
}

// Pie de página estándar
const footerHtml = `
    <div class="text-center" style="font-size: 0.7rem; margin-top: 15px; border-top: 1px dashed #ccc; padding-top:5px; color: #444;">
        Desarrollado por Asesorías Profesionales<br>
        Marcos Alberto Castro Abarca E.I.R.L
    </div>
`;

/**
 * 1. TICKET DE APERTURA DE CAJA
 */
window.printOpeningTicket = async function (amount, cashier, turno) {
    const area = getPrintableArea();
    const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
    
    area.innerHTML = `
        <div class="ticket-header fs-big">APERTURA CAJA</div>
        <div class="text-center fw-bold">El Carro del Ocho</div>
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

/**
 * 2. TICKET DE VENTA (COCINA + CLIENTE)
 */
window.printTicket = async function (cart, total, method, orderNum, cashInfo = null) {
    const ticketArea = getPrintableArea();
    const fechaHora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
    const soloHora = fechaHora.split(" ")[1] || fechaHora; // Extraer solo la hora
    const nombreCajero = typeof currentUser !== "undefined" && currentUser ? currentUser.Nombre : "Cajero";
    
    // Formatear método de pago para visualización
    let displayMethod = method;
    if (method.includes("MIXTO")) displayMethod = "Mixto";

    // --- SECCIÓN COCINA (Solo si hay items marcados para cocina) ---
    const itemsCocina = cart.filter((i) => i.cocina);
    let htmlCocina = "";
    
    if (itemsCocina.length > 0) {
        let listadoCocina = "";
        itemsCocina.forEach((item) => {
            const srvTag = item.tipoServicio === "LLEVAR" ? "LLEVAR" : "SERVIR";
            // Nota: Si hay comentario, se muestra
            const nota = item.comentario ? `<div style="font-size:0.9rem; font-weight:normal;">( ${item.comentario} )</div>` : "";
            
            listadoCocina += `
                <div style="border-bottom: 1px dotted #999; margin-bottom: 5px; padding-bottom: 2px;">
                    <div style="font-size: 1.3rem;"><strong>${item.cantidad}</strong> x ${item.nombre}</div>
                    <div style="font-size: 1.1rem; font-weight: bold;">[${srvTag}]</div> 
                    ${nota}
                </div>`;
        });

        htmlCocina = `
            <div class="ticket-header fs-big">COCINA</div>
            <div class="text-center fs-huge" style="font-size:2.5rem; font-weight: bold;">#${orderNum}</div>
            <div class="text-center" style="font-size:1.2rem; font-weight: bold;">${soloHora}</div>
            <div class="ticket-divider"></div>
            <div style="text-align:left; width: 100%;">${listadoCocina}</div>
            <div class="text-center" style="margin-top:10px;">- fin cocina -</div>
            <br>
            <div class="ticket-divider"></div>
            <br>
        `;
    }

    // --- SECCIÓN CLIENTE ---
    let listadoCliente = "";
    cart.forEach((item) => {
        const totalItem = (item.precio * item.cantidad).toLocaleString("es-CL");
        const srvTag = item.tipoServicio === "LLEVAR" ? "(LLEVAR)" : "(SERVIR)";
        const nota = item.comentario ? `<div style="font-size:0.8rem; font-style:italic;">* ${item.comentario}</div>` : "";
        
        listadoCliente += `
            <div style="margin-bottom: 4px;">
                <div class="d-flex-between" style="font-size:1rem; align-items:flex-start;">
                    <span style="flex:1; padding-right:5px;">${item.cantidad} x ${item.nombre} <small>${srvTag}</small></span>
                    <span style="white-space:nowrap;">$${totalItem}</span>
                </div>
                ${nota}
            </div>`;
    });

    // Info de pago (Efectivo y Vuelto)
    let cashHtml = "";
    if (cashInfo) {
        cashHtml = `
            <div class="ticket-divider"></div>
            <div class="d-flex-between" style="font-size:1.1rem;">
                <span>Efectivo:</span>
                <span>$${cashInfo.recibido.toLocaleString("es-CL")}</span>
            </div>
            <div class="d-flex-between fw-bold" style="font-size:1.3rem;">
                <span>Vuelto:</span>
                <span>$${cashInfo.vuelto.toLocaleString("es-CL")}</span>
            </div>
        `;
    }

    // HTML Final del Cliente
    const htmlCliente = `
        <div class="ticket-header">
            <img src="img/logo_8_sf.png" alt="El Carro del Ocho" style="width:120px; margin-bottom:5px;"><br>
            EL CARRO DEL OCHO
        </div>
        <div class="text-center ticket-divider"><span class="fs-huge">PEDIDO: #${orderNum}</span></div>
        <div class="text-center text-uppercase" style="font-size:0.9rem; margin-bottom:5px;">
            ${fechaHora}<br>
            Atendido por: ${nombreCajero}
        </div>
        
        <div class="ticket-divider"></div>
        <div style="width:100%;">${listadoCliente}</div>
        <div class="ticket-divider"></div>
        
        <div class="d-flex-between fs-big" style="margin-top:5px;">
            <span>TOTAL:</span>
            <span>$${total.toLocaleString("es-CL")}</span>
        </div>
        
        ${cashHtml}

        <div style="font-size: 1rem; margin-top: 5px;">Método Pago: <strong>${displayMethod}</strong></div>
        <div class="text-center" style="margin-top:15px; font-size:1rem;">¡Gracias por su preferencia!</div>
        ${footerHtml}
        <div style="text-align:center; margin-top:10px;">.</div>
    `;

    // Combinar e imprimir
    ticketArea.innerHTML = htmlCocina + htmlCliente;
    imprimirYLimpiar(ticketArea);
};

/**
 * 3. REPORTE Z (DIARIO)
 */
window.printDailyReport = async function (data) {
    const ticketArea = getPrintableArea();
    
    // Formatear fecha
    let fechaFormateada = data.fecha;
    if (data.fecha && data.fecha.includes("-")) {
        const [anio, mes, dia] = data.fecha.split("-");
        fechaFormateada = `${dia}/${mes}/${anio}`;
    }

    // Hora de cierre (usamos la actual si no viene en data)
    const horaCierre = new Date().toLocaleTimeString("es-CL", {hour: '2-digit', minute:'2-digit'});

    // Cálculos
    const totalApertura = parseInt(data.fondo_inicial) || 0;
    
    // Suma de ambos turnos
    const totalEfectivo = (data.turnos[1].efectivo || 0) + (data.turnos[2].efectivo || 0);
    const totalTarjeta = (data.turnos[1].tarjeta || 0) + (data.turnos[2].tarjeta || 0);
    const totalTransf = (data.turnos[1].transferencia || 0) + (data.turnos[2].transferencia || 0);
    
    const totalVentaDia = totalEfectivo + totalTarjeta + totalTransf;
    const totalEnCaja = totalApertura + totalEfectivo; // Lo que debería haber físicamente en el cajón

    // Ranking de productos
    let prodHtml = "";
    const ranking = Object.entries(data.productos).sort((a, b) => b[1] - a[1]); // Ordenar mayor a menor
    
    if (ranking.length === 0) {
        prodHtml = "<div>Sin ventas registradas.</div>";
    } else {
        ranking.forEach(([nom, cant]) => {
            prodHtml += `
            <div class="d-flex-between" style="font-size:0.9rem;">
                <span>${nom}</span>
                <span>x${cant}</span>
            </div>`;
        });
    }

    ticketArea.innerHTML = `
        <div class="ticket-header fs-big">REPORTE Z (DIARIO)<br><b>El Carro del 8</b></div>
        <div class="text-center" style="font-size:1.1rem;">Fecha: ${fechaFormateada}</div>
        <div class="text-center fw-bold">Hora Cierre: ${horaCierre}</div>
        <div class="text-center small">Consolidado Turno 1 + Turno 2</div>
        <div class="ticket-divider"></div>
        <br>
        
        <div class="text-center fw-bold" style="font-size: 1.1rem; text-decoration: underline;">CUADRATURA EFECTIVO</div>
        
        <div class="d-flex-between" style="font-size:1rem; margin-top:5px;">
            <span>(+) Fondos Iniciales:</span>
            <span>$${totalApertura.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between" style="font-size:1rem;">
            <span>(+) Ventas Efectivo:</span>
            <span>$${totalEfectivo.toLocaleString("es-CL")}</span>
        </div>
        
        <div class="ticket-divider"></div>
        
        <div class="d-flex-between fw-bold fs-big" style="margin: 5px 0;">
            <span>EN CAJA:</span>
            <span>$${totalEnCaja.toLocaleString("es-CL")}</span>
        </div>
        <div class="text-center small" style="margin-bottom:10px;">(Dinero físico esperado)</div>
        
        <div class="ticket-divider"></div>
        <div class="d-flex-between" style="font-size:1rem;">
            <span>💳 Tarjetas:</span>
            <span>$${totalTarjeta.toLocaleString("es-CL")}</span>
        </div>
        <div class="d-flex-between" style="font-size:1rem;">
            <span>🏦 Transferencias:</span>
            <span>$${totalTransf.toLocaleString("es-CL")}</span>
        </div>
        <br>

        <div class="ticket-divider"></div>
        <div class="d-flex-between fw-bold" style="font-size:1.3rem;">
            <span>VENTA TOTAL:</span>
            <span>$${totalVentaDia.toLocaleString("es-CL")}</span>
        </div>
        <br>
        
        <div class="ticket-divider"></div>
        <div class="fs-big text-center">PRODUCTOS VENDIDOS</div>
        <br>
        <div style="width:100%;">${prodHtml}</div>
        <br>
        <div class="ticket-divider"></div>
        <div class="text-center fs-big">Total Items: <strong>${data.total_unidades}</strong></div>
        <br>
        
        ${footerHtml}
        <br><br>.`;

    imprimirYLimpiar(ticketArea);
};
/**
 * printer.js - VERSIÓN UNIVERSAL (HTML/CSS)
 * Genera Cocina + Cliente en una sola tira.
 */

// Helper para obtener/crear el área de impresión
function getPrintableArea() {
    let area = document.getElementById('printable-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'printable-area';
        document.body.appendChild(area);
    }
    return area;
}

function connectPrinter() {
    alert("✅ Impresión Nativa Activada.\nSe usará la impresora predeterminada de Windows/Mac.");
}

// === IMPRIMIR TICKET DE VENTA ===
window.printTicket = async function(cart, total, method, orderNum) {
    const ticketArea = getPrintableArea();
    // Hora forzada a Chile
    const fechaHora = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    const soloHora = fechaHora.split(' ')[1] || fechaHora; // Intento de sacar solo la hora

    // 1. GENERAR SECCIÓN COCINA
    // Filtramos items que tengan la propiedad cocina = true
    const itemsCocina = cart.filter(i => i.cocina);
    let htmlCocina = '';

    if (itemsCocina.length > 0) {
        let listadoCocina = '';
        itemsCocina.forEach(item => {
            // Cocina necesita letra grande y clara: CANTIDAD x NOMBRE
            listadoCocina += `<div>${item.cantidad} x ${item.nombre}</div>`;
        });

        htmlCocina = `
            <div class="ticket-header fs-big">COCINA</div>
            <div class="text-center fs-huge">#${orderNum}</div>
            <div class="text-center" style="font-size:0.9em">${soloHora}</div>
            <div class="ticket-divider"></div>
            <div class="fs-big" style="text-align:left; margin-bottom: 10px;">
                ${listadoCocina}
            </div>
            <div class="ticket-cut">- - - - CORTAR AQUÍ - - - -</div>
        `;
    }

    // 2. GENERAR SECCIÓN CLIENTE (Detalle Completo)
    let listadoCliente = '';
    cart.forEach(item => {
        const totalItem = (item.precio * item.cantidad).toLocaleString('es-CL');
        // Nombre truncado a 18 chars para que quepa precio al lado
        listadoCliente += `
            <div class="d-flex-between">
                <span>${item.cantidad} x ${item.nombre.substring(0, 20)}</span>
                <span>$${totalItem}</span>
            </div>
        `;
    });

    const htmlCliente = `
        <div class="ticket-header">
            EL CARRO DEL OCHO<br>Sandwicheria
        </div>
        <div class="text-center ticket-divider">
            PEDIDO: <span class="fs-huge">#${orderNum}</span>
        </div>
        <div class="text-center" style="font-size:0.8em; margin-bottom:5px;">
            ${fechaHora}
        </div>
        
        <div class="ticket-divider" style="font-size: 0.9em;">
            ${listadoCliente}
        </div>
        
        <div class="d-flex-between fs-big" style="margin-top:5px;">
            <span>TOTAL:</span>
            <span>$${total.toLocaleString('es-CL')}</span>
        </div>
        <div style="font-size: 0.9em;">Pago: ${method}</div>
        
        <div class="text-center" style="margin-top:15px; font-size:0.8em;">
            ¡Gracias por su preferencia!
        </div>
        <div style="text-align:center; margin-top:10px;">.</div> 
    `;

    // 3. RENDERIZAR E IMPRIMIR
    // Concatenamos: Cocina (si existe) + Cliente
    ticketArea.innerHTML = htmlCocina + htmlCliente;
    
    imprimirYLimpiar(ticketArea);
};

// === IMPRIMIR REPORTE Z ===
window.printDailyReport = async function(data) {
    const ticketArea = getPrintableArea();
    
    // Tabla de productos vendidos
    let prodHtml = '';
    const ranking = Object.entries(data.productos).sort((a,b) => b[1] - a[1]);
    
    if (ranking.length === 0) {
        prodHtml = '<div>Sin ventas registradas.</div>';
    } else {
        ranking.forEach(([nom, cant]) => {
            prodHtml += `<div class="d-flex-between"><span>${cant} x ${nom.substring(0,20)}</span></div>`;
        });
    }

    ticketArea.innerHTML = `
        <div class="ticket-header fs-big">REPORTE Z</div>
        <div class="text-center">${data.fecha}</div>
        <div class="ticket-divider"></div>
        
        <div class="fs-big">FINANZAS</div>
        <div class="d-flex-between"><span>AM:</span><span>$${data.turnos[1].total.toLocaleString('es-CL')}</span></div>
        <div class="d-flex-between"><span>PM:</span><span>$${data.turnos[2].total.toLocaleString('es-CL')}</span></div>
        <div class="ticket-divider"></div>
        
        <div class="fs-big">PRODUCTOS</div>
        <div style="font-size:0.9em">${prodHtml}</div>
        <div class="ticket-divider"></div>
        
        <div class="text-center">UNIDADES: <strong>${data.total_unidades}</strong></div>
        <div class="text-center fs-huge" style="border:1px solid black; margin-top:5px;">
            $${data.gran_total.toLocaleString('es-CL')}
        </div>
        <br><br>.
    `;

    imprimirYLimpiar(ticketArea);
};

// Helper de impresión
function imprimirYLimpiar(area) {
    area.style.display = 'block';
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            area.style.display = 'none';
            area.innerHTML = '';
        }, 500);
    }, 100);
}
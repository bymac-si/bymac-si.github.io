/**
 * printer.js - VERSIÓN UNIVERSAL (HTML/CSS) - A PRUEBA DE ERRORES
 */

// Helper: Asegura que exista el área de impresión
function getPrintableArea() {
    let area = document.getElementById('printable-area');
    
    // Si no existe (causa del error), lo creamos al vuelo
    if (!area) {
        area = document.createElement('div');
        area.id = 'printable-area';
        document.body.appendChild(area);
        console.log("Área de impresión creada automáticamente.");
    }
    return area;
}

// 1. CONEXIÓN (Ficticia en este modo)
async function connectPrinter() {
    alert("✅ Modo Impresión Nativa activado.\nSe usará la impresora predeterminada.");
    
    // Cambiar visualmente el botón a OK
    const btn = document.querySelector('button[onclick="connectPrinter()"]');
    if(btn) {
        btn.className = "btn btn-sm btn-success text-white border border-3 border-white shadow";
        btn.innerText = "🖨️ OK";
    }
}

// 2. IMPRIMIR TICKET VENTA
window.printTicket = async function(cart, total, method, orderNum) {
    const ticketArea = getPrintableArea(); // <--- USA LA FUNCIÓN SEGURA
const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });


    let itemsHtml = '';
    cart.forEach(item => {
        const totalItem = (item.precio * item.cantidad).toLocaleString('es-CL');
        itemsHtml += `
            <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>${item.cantidad} x ${item.nombre.substring(0, 18)}</span>
                <span>$${totalItem}</span>
            </div>
        `;
    });

    ticketArea.innerHTML = `
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;"><img src="img/logo_8_sf.png" width="50px" alt="" /><br>
            EL CARRO DEL OCHO<br>
        </div>
        <div style="text-align: center; border-bottom: 1px dashed black; padding-bottom: 5px; margin-bottom: 5px;">
            PEDIDO: <span style="font-size: 1.5em; font-weight:bold;">#${orderNum}</span>
        </div>
        <div style="font-size: 0.8em; margin-bottom: 10px; text-align:center;">
            ${fecha}
        </div>
        
        <div style="border-bottom: 1px dashed black; padding-bottom: 5px; margin-bottom: 5px; font-size: 0.9em;">
            ${itemsHtml}
        </div>
        
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size: 1.1em; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>$${total.toLocaleString('es-CL')}</span>
        </div>
        <div style="margin-top: 5px; font-size: 0.9em;">
            Pago: ${method}
        </div>
        <div style="text-align: center; margin-top: 15px; font-size: 0.8em;">
            ¡Gracias por su preferencia!
        </div>
        <br>.
    `;

    imprimirYLimpiar(ticketArea);
};

// 3. IMPRIMIR REPORTE Z
window.printDailyReport = async function(data) {
    const ticketArea = getPrintableArea(); // <--- USA LA FUNCIÓN SEGURA
    await print(`Impreso: ${new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago' })}\n`);
    
    // Generar tabla de productos
    let prodHtml = '';
    const ranking = Object.entries(data.productos).sort((a,b) => b[1] - a[1]);
    
    if (ranking.length === 0) {
        prodHtml = '<div>Sin ventas registradas.</div>';
    } else {
        ranking.forEach(([nom, cant]) => {
            prodHtml += `
                <div style="display:flex; justify-content:space-between;">
                    <span>${cant} x ${nom.substring(0,20)}</span>
                </div>`;
        });
    }

    ticketArea.innerHTML = `
        <div style="text-align: center; font-weight: bold; font-size: 1.1em;">REPORTE CIERRE (Z)</div>
        <div style="text-align: center; font-size: 0.9em;">${data.fecha}</div>
        <hr style="border-top: 1px dashed black;">
        
        <strong style="display:block; margin-bottom:5px;">RESUMEN FINANCIERO:</strong>
        <div style="display:flex; justify-content:space-between;"><span>AM:</span> <span>$${data.turnos[1].total.toLocaleString('es-CL')}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>PM:</span> <span>$${data.turnos[2].total.toLocaleString('es-CL')}</span></div>
        <hr style="border-top: 1px dashed black;">
        
        <strong style="display:block; margin-bottom:5px;">VENDIDOS:</strong>
        <div style="font-size: 0.9em;">
            ${prodHtml}
        </div>
        <hr style="border-top: 1px dashed black;">
        
        <div style="text-align: center; margin: 10px 0;">
            UNIDADES: <strong>${data.total_unidades}</strong>
        </div>
        <div style="text-align: right; font-weight: bold; font-size: 1.3em; border: 1px solid black; padding: 5px;">
            TOTAL: $${data.gran_total.toLocaleString('es-CL')}
        </div>
        <br><br>.
    `;

    imprimirYLimpiar(ticketArea);
};

// Helper para lanzar la impresión
function imprimirYLimpiar(area) {
    area.style.display = 'block';
    
    // Pequeño timeout para asegurar que el renderizado terminó
    setTimeout(() => {
        window.print();
        
        // Ocultar después de imprimir
        setTimeout(() => {
            area.style.display = 'none';
            area.innerHTML = '';
        }, 500);
    }, 100);
}
/**
 * printer.js - MODO HÍBRIDO (Físico + Virtual para Mac/Dev)
 */

// CAMBIA ESTO A 'false' CUANDO CONECTES LA IMPRESORA REAL EN WINDOWS
const SIMULATION_MODE = false; 

let printerPort;

// Comandos ESC/POS (Iguales)
const CMD = {
    LF: '\x0A', CUT: '\x1D\x56\x41\x00', INIT: '\x1B\x40',
    CENTER: '\x1B\x61\x01', LEFT: '\x1B\x61\x00',
    BOLD_ON: '\x1B\x45\x01', BOLD_OFF: '\x1B\x45\x00',
    DOUBLE_H: '\x1D\x21\x10', NORMAL: '\x1D\x21\x00', HUGE: '\x1D\x21\x30'
};

function setButtonSuccess() {
    const btn = document.querySelector('button[onclick="connectPrinter()"]');
    if(btn) {
        btn.className = "btn btn-sm btn-success text-white border border-3 border-white shadow";
        btn.innerText = SIMULATION_MODE ? "🖨️ VIRTUAL" : "🖨️ OK";
    }
}

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    if (SIMULATION_MODE) {
        console.warn("⚠️ MODO IMPRESORA VIRTUAL ACTIVADO ⚠️");
        setButtonSuccess();
        return;
    }

    if ("serial" in navigator) {
        try {
            const ports = await navigator.serial.getPorts();
            if (ports.length > 0) {
                printerPort = ports[0];
                await printerPort.open({ baudRate: 9600 });
                setButtonSuccess();
            }
        } catch (err) { console.error(err); }
    }
});

// 2. CONEXIÓN (Simulada o Real)
async function connectPrinter() {
    if (SIMULATION_MODE) {
        alert("Modo Virtual: La impresora está 'lista' para pruebas en pantalla.");
        setButtonSuccess();
        return;
    }

    if (!navigator.serial) return alert("Navegador no compatible (Usa Chrome).");
    
    try {
        printerPort = await navigator.serial.requestPort();
        await printerPort.open({ baudRate: 9600 });
        setButtonSuccess();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// 3. IMPRIMIR TICKET (Lógica Híbrida)
window.printTicket = async function(cart, total, method, orderNum) {
    console.log(`%c 🖨️ IMPRIMIENDO PEDIDO #${orderNum} `, 'background: #222; color: #bada55; font-size: 14px');

    // --- MODO VIRTUAL (MAC / PRUEBAS) ---
    if (SIMULATION_MODE) {
        // Simulamos el tiempo que tarda la impresora
        await new Promise(r => setTimeout(r, 500));
        
        console.group("🧾 TICKET VIRTUAL");
        console.log("=== COCINA ===");
        const cocina = cart.filter(i => i.cocina);
        if(cocina.length > 0) {
            console.log(`PEDIDO #${orderNum}`);
            cocina.forEach(i => console.log(`${i.cantidad}x ${i.nombre}`));
        } else {
            console.log("(Sin items de cocina)");
        }
        
        console.log("\n=== CLIENTE ===");
        console.log(`SU NUMERO: #${orderNum}`);
        cart.forEach(i => console.log(`${i.cantidad}x ${i.nombre} - $${i.precio}`));
        console.log(`TOTAL: $${total}`);
        console.log(`MEDIO: ${method}`);
        console.groupEnd();
        
        return; // Salimos exitosamente
    }

    // --- MODO REAL (Hardware) ---
    if (!printerPort || !printerPort.writable) {
        return alert("⚠️ Conecta la impresora real.");
    }

    const encoder = new TextEncoder();
    const writer = printerPort.writable.getWriter();
    const print = async (txt) => await writer.write(encoder.encode(txt));

    try {
        // TICKET COCINA
        const itemsCocina = cart.filter(i => i.cocina);
        if (itemsCocina.length > 0) {
            await print(CMD.INIT + CMD.CENTER + CMD.BOLD_ON + "COCINA\n" + CMD.BOLD_OFF);
            await print(CMD.HUGE + `#${orderNum}\n` + CMD.NORMAL);
            await print(CMD.LEFT + "--------------------------------\n");
            await print(CMD.DOUBLE_H);
            for (const item of itemsCocina) await print(`${item.cantidad}x ${item.nombre}\n`);
            await print(CMD.NORMAL + "\n\n" + CMD.CUT);
            await new Promise(r => setTimeout(r, 1000));
        }

        // TICKET CLIENTE
        await print(CMD.INIT + CMD.CENTER + CMD.BOLD_ON + "EL CARRO DEL OCHO\n" + CMD.BOLD_OFF);
        await print("Sandwicheria\n--------------------------------\nSU NUMERO:\n");
        await print(CMD.HUGE + `#${orderNum}\n` + CMD.NORMAL);
        await print("--------------------------------\n" + CMD.LEFT);
        
        for (const item of cart) {
            const precio = `$${(item.precio * item.cantidad).toLocaleString('es-CL')}`;
            await print(`${item.cantidad}x ${item.nombre.slice(0,15)} ${precio}\n`);
        }

        await print("--------------------------------\n");
        await print(CMD.BOLD_ON + `TOTAL: $${total.toLocaleString('es-CL')}\n` + CMD.BOLD_OFF);
        await print(`Pago: ${method}\n\nGracias por su compra!\n\n\n` + CMD.CUT);

    } catch (err) { alert("Error imprimiendo"); } 
    finally { writer.releaseLock(); }
};

// 4. REPORTE Z (Híbrido)
window.printDailyReport = async function(data) {
    console.log(`%c 📊 REPORTE DIARIO `, 'background: #000; color: #fff; font-size: 14px');

    if (SIMULATION_MODE) {
        console.table(data.turnos);
        console.log("Total Unidades:", data.total_unidades);
        console.log("GRAN TOTAL:", data.gran_total);
        return;
    }

    if (!printerPort || !printerPort.writable) return alert("Impresora desconectada.");
    
    // ... (Aquí iría el código real de impresión del reporte que ya tienes) ...
    // Puedes dejar esta parte vacía o copiar la lógica anterior si planeas conectar la impresora al Mac eventualmente.
};

// Comandos ESC/POS
const ESC = '\x1B';
const GS = '\x1D';
const INIT = '\x1B@';
const CUT = '\x1DVA\x00';
const BOLD_ON = '\x1BE\x01';
const BOLD_OFF = '\x1BE\x00';
const CENTER = '\x1Ba\x01';
const LEFT = '\x1Ba\x00';

let printerPort;
let printerWriter;

async function connectPrinter() {
    if (!navigator.serial) return alert("Navegador no soporta Web Serial");
    try {
        printerPort = await navigator.serial.requestPort();
        await printerPort.open({ baudRate: 9600 });
        alert("Impresora Conectada");
    } catch (e) {
        console.error(e);
        alert("Error conectando impresora");
    }
}

window.printTicket = async function(cart, total, medioPago, idPedido) {
    if (!printerPort || !printerPort.writable) {
        console.warn("Impresora no conectada");
        return;
    }

    const encoder = new TextEncoder();
    const writer = printerPort.writable.getWriter();

    const write = async (text) => await writer.write(encoder.encode(text));

    try {
        // --- 1. TICKET COCINA (Solo items de cocina) ---
        const itemsCocina = cart.filter(i => i.cocina);
        
        if (itemsCocina.length > 0) {
            await write(INIT + CENTER + BOLD_ON + "COCINA\n" + BOLD_OFF);
            await write(`Pedido: ${idPedido.slice(-4)}\n`);
            await write("--------------------------------\n" + LEFT);
            
            itemsCocina.forEach(item => {
                await write(`${BOLD_ON}${item.cantidad}x ${item.nombre}${BOLD_OFF}\n`);
                if(item.comentarios) await write(`   (${item.comentarios})\n`);
            });
            
            await write("\n\n" + CUT);
            // Pequeña pausa para que la impresora respire
            await new Promise(r => setTimeout(r, 500)); 
        }

        // --- 2. PRECUENTA / BOLETA CLIENTE ---
        await write(INIT + CENTER);
        await write(BOLD_ON + "EL CARRO DEL OCHO\n" + BOLD_OFF);
        await write("Sandwicheria & Comida Rapida\n");
        await write(`Fecha: ${new Date().toLocaleString()}\n`);
        await write(`Orden: ${idPedido}\n`);
        await write("--------------------------------\n" + LEFT);

        cart.forEach(item => {
            const linea = `${item.cantidad}x ${item.nombre}`;
            // Simulación básica de espaciado
            const precio = `$${item.precio * item.cantidad}`;
            await write(`${linea.padEnd(20).slice(0,20)} ${precio.padStart(10)}\n`);
        });

        await write("--------------------------------\n" + CENTER);
        await write(BOLD_ON + `TOTAL: $${total}\n` + BOLD_OFF);
        await write(`Pago: ${medioPago}\n`);
        
        // Si es efectivo y calculaste vuelto, podrías pasarlo como argumento e imprimirlo aquí
        
        await write("\nGracias por su preferencia!\n\n\n" + CUT);

    } catch (err) {
        console.error("Error imprimiendo", err);
    } finally {
        writer.releaseLock();
    }
};
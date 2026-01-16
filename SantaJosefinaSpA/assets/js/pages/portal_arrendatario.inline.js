// ===== Extracted from portal_arrendatario.html =====

// --- LÓGICA DEL PORTAL ---
        
        // 1. Obtener Sesión (Simulada para el ejemplo, usar localStorage real)
        // En producción: const SESION = JSON.parse(localStorage.getItem('sesion_arrendatario'));
        const SESION_DEMO = {
            RUT: "11.111.111-1",
            Nombre: "Juan Arrendatario",
            ContratoID: "CNT_001",
            Propiedad: "Av. Las Condes 1234, Depto 505",
            Monto: 450000,
            DiaPago: 5
        };

        document.addEventListener("DOMContentLoaded", () => {
            // Verificar Login
            // if(!localStorage.getItem('sesion_arrendatario')) window.location.href = 'login_residente.html';
            
            cargarInfo(SESION_DEMO);
            cargarHistorialDemo(); // Reemplazar por fetch a PagosArriendo
        });

        function cargarInfo(datos) {
            document.getElementById("lblInquilino").innerText = datos.Nombre.split(" ")[0];
            document.getElementById("lblDireccion").innerText = datos.Propiedad;
            
            // Formatear Monto
            const montoFmt = new Intl.NumberFormat('es-CL', {style: 'currency', currency: 'CLP'}).format(datos.Monto);
            document.getElementById("lblMonto").innerText = montoFmt;
            document.getElementById("pagoMonto").value = datos.Monto; // Prellenar modal

            // Calcular próximo vencimiento
            const hoy = new Date();
            let mes = hoy.getMonth();
            if (hoy.getDate() > datos.DiaPago) mes++; // Si ya pasó el día, es el otro mes
            
            // Asignar mes actual al input date
            const anioActual = hoy.getFullYear();
            const mesStr = (hoy.getMonth() + 1).toString().padStart(2, '0');
            document.getElementById("pagoPeriodo").value = `${anioActual}-${mesStr}`;

            document.getElementById("lblEstadoPago").innerHTML = `<i class="fa-regular fa-clock"></i> Próximo pago: <b>${datos.DiaPago}/${mes + 1}</b>`;
        }

        /* --- UX --- */
        function abrirModalPago() {
            document.getElementById("overlay").classList.add("open");
            document.getElementById("modalPago").classList.add("open");
        }
        function abrirModalMantencion() {
            document.getElementById("overlay").classList.add("open");
            document.getElementById("modalMantencion").classList.add("open");
        }
        function cerrarModals() {
            document.getElementById("overlay").classList.remove("open");
            document.querySelectorAll(".sheet-modal").forEach(e => e.classList.remove("open"));
        }

        /* --- ACCIONES --- */
        async function enviarReportePago() {
            const monto = document.getElementById("pagoMonto").value;
            const periodo = document.getElementById("pagoPeriodo").value;

            if(!monto || !periodo) return alert("Completa los datos");

            const payload = {
                "ID": "PAY_ARR_" + Date.now(),
                "ContratoID": SESION_DEMO.ContratoID,
                "Periodo": periodo,
                "Monto": monto,
                "Fecha Reporte": new Date().toISOString().split('T')[0],
                "Estado": "Pendiente"
                // Aquí iría el base64 de la imagen
            };

            // await appSheetCRUD("PagosArriendo", "Add", [payload]);
            alert("¡Reporte enviado! Lo validaremos a la brevedad.");
            cerrarModals();
        }

        async function enviarSolicitud() {
            const desc = document.getElementById("manDesc").value;
            if(!desc) return alert("Describe el problema");

            // Lógica de envío a Tickets
            alert("Solicitud enviada al equipo de Corretaje.");
            cerrarModals();
        }

        function verContrato() {
            alert("Descargando PDF del contrato...");
            // window.open(SESION_DEMO.ContratoURL);
        }

        function cargarHistorialDemo() {
            const lista = document.getElementById("listaPagos");
            // Mock de datos
            const historial = [
                { periodo: "2026-04", monto: 450000, estado: "Pendiente", fecha: "04-05-2026" },
                { periodo: "2026-03", monto: 450000, estado: "Validado", fecha: "05-03-2026" },
                { periodo: "2026-02", monto: 450000, estado: "Validado", fecha: "04-02-2026" }
            ];

            lista.innerHTML = historial.map(h => {
                const esOk = h.estado === 'Validado';
                return `
                <div class="trx-item ${esOk ? 'trx-ok' : 'trx-pending'}">
                    <div>
                        <div style="font-weight: bold; font-size: 14px;">Arriendo ${h.periodo}</div>
                        <div style="font-size: 12px; color: #64748b;">Reportado el ${h.fecha}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 800; color: #134e4a;">$${h.monto.toLocaleString()}</div>
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: ${esOk ? '#166534' : '#b45309'};">${h.estado}</span>
                    </div>
                </div>`;
            }).join("");
        }

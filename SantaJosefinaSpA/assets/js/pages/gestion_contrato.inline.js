// ===== Extracted from gestion_contrato.html =====

let DB = { Copropiedades: [], Agentes: [] };

    document.addEventListener("DOMContentLoaded", async () => {
        try { 
    document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); 
    // AGREGAR ESTA LÍNEA CLAVE:
    if (typeof initHeader === "function") initHeader(); 
} catch(e){}

        try { document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); } catch(e){}
        await cargarDatos();
    });

    async function cargarDatos() {
        document.getElementById("spinner").style.display = "flex";
        try {
            const [copro, agentes] = await Promise.all([
                fetchData("Copropiedades").catch(()=>[]),
                fetchData("Agentes").catch(()=>[])
            ]);
            DB.Copropiedades = copro || [];
            DB.Agentes = agentes || [];
            
            procesarDatos();
        } catch(e) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            document.getElementById("spinner").style.display = "none";
        }
    }

    function procesarDatos() {
        const hoy = new Date();
        const tbody = document.getElementById("tablaContratos");
        const alertsList = document.getElementById("alertsList");
        const alertsContainer = document.getElementById("alertsContainer");
        
        // Limpiar
        tbody.innerHTML = "";
        alertsList.innerHTML = "";
        let alertasCount = 0;

        // KPIs
        let totalActivas = 0;
        let totalMRR = 0;
        let enRiesgo = 0;
        let porRenovar = 0;

        DB.Copropiedades.forEach(c => {
            if(c.EstadoContrato === 'Cancelado') return; // Solo activas para KPIs

            totalActivas++;
            totalMRR += parseInt(c.ValorHonorario || 0);

            // Calcular Antigüedad
            let meses = 0;
            if(c.FechaInicioContrato) {
                const inicio = new Date(c.FechaInicioContrato); // Ojo: Asegurar formato YYYY-MM-DD
                const diffTime = Math.abs(hoy - inicio);
                meses = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Aprox meses
            }

            // Determinar EstadoContrato del Cliente
            let badgeClass = "ms-risk";
            let badgeText = "Onboarding";
            let progress = (meses / 12) * 100;
            if(progress > 100) progress = 100;

            if(meses >= 0 && meses <= 3) {
                badgeClass = "ms-risk"; badgeText = "Riesgo (Inicio)"; enRiesgo++;
            } else if (meses >= 4 && meses <= 10) {
                badgeClass = "ms-stable"; badgeText = "Estable";
            } else if (meses >= 11 && meses <= 12) {
                badgeClass = "ms-renew"; badgeText = "Renovación"; porRenovar++;
                // ALERTA DE RENOVACIÓN
                agregarAlerta(`🚨 <strong>${c.Nombre}</strong> cumple un año pronto. ¡Llama al comité para renovar!`, alertsList);
                alertasCount++;
            } else {
                badgeClass = "ms-loyal"; badgeText = "Fidelizado";
            }

            // ALERTA DE BONOS PARA AGENTES
            // Si estamos en el mes exacto del hito (usamos un margen de error)
            const nombreAgente = resolveAgente(c.AgenteCaptador || c.AgenteCaptador);
            
            // Hito 4 Meses (Estabilización)
            if(meses === 4) {
                agregarAlerta(`💰 <strong>Bono Estabilización</strong>: Pagar a ${nombreAgente} por comunidad ${c.Nombre} (Mes 4).`, alertsList);
                alertasCount++;
            }
            // Hito 12 Meses (Fidelización)
            if(meses === 12) {
                agregarAlerta(`🏆 <strong>Bono Anual</strong>: Pagar a ${nombreAgente} por comunidad ${c.Nombre} (Año cumplido).`, alertsList);
                alertasCount++;
            }

            // Render Fila
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight:600;">${c.Nombre}</td>
                <td>${nombreAgente}</td>
                <td>${formatearFecha(c.FechaInicioContrato)}</td>
                <td>
                    <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
                    <div class="progress-text">${meses} Meses</div>
                </td>
                <td style="font-family:monospace;">${clp(c.ValorHonorario)}</td>
                <td><span class="milestone-badge ${badgeClass}">${badgeText}</span></td>
                <td><button class="btn-sec" style="padding:5px 10px; font-size:12px;" onclick='abrirModal("${c.ID}")'><i class="fa-solid fa-pen"></i></button></td>
            `;
            tbody.appendChild(tr);
        });

        // Actualizar KPIs visuales
        document.getElementById("kpiTotal").innerText = totalActivas;
        document.getElementById("kpiMRR").innerText = clp(totalMRR);
        document.getElementById("kpiRiesgo").innerText = enRiesgo;
        document.getElementById("kpiRenovar").innerText = porRenovar;

        // Mostrar sección de alertas si hay algo
        if(alertasCount > 0) alertsContainer.style.display = "block";
        else alertsContainer.style.display = "none";
    }

    function agregarAlerta(html, contenedor) {
        const div = document.createElement("div");
        div.className = "alert-item";
        div.innerHTML = html + ` <i class="fa-solid fa-check" style="color:#d1d5db; cursor:pointer;" onclick="this.parentElement.remove()"></i>`;
        contenedor.appendChild(div);
    }

    /* --- EDICIÓN --- */
    function abrirModal(id) {
        const c = DB.Copropiedades.find(x => x.ID === id);
        if(!c) return;

        document.getElementById("cID").value = c.ID;
        document.getElementById("cNombre").value = c.Nombre;
        document.getElementById("cFecha").value = c.FechaInicioContrato || "";
        document.getElementById("cValorHonorario").value = c.ValorHonorario || "";
        document.getElementById("cEstadoContrato").value = c.EstadoContrato || "Activo";

        // Llenar select agentes
        const sel = document.getElementById("cAgente");
        sel.innerHTML = '<option value="">(Ninguno)</option>';
        DB.Agentes.forEach(a => {
            const selected = (a.ID === c.AgenteCaptador || a.ID === c.AgenteCaptador) ? "selected" : "";
            sel.innerHTML += `<option value="${a.ID}" ${selected}>${a.Nombre}</option>`;
        });

        document.getElementById("modalContrato").style.display = "flex";
    }

    function cerrarModal() { document.getElementById("modalContrato").style.display = "none"; }

    document.getElementById("formContrato").onsubmit = async (e) => {
        e.preventDefault();
        document.getElementById("spinner").style.display = "flex";

        const payload = {
            "ID": document.getElementById("cID").value,
            "FechaInicioContrato": document.getElementById("cFecha").value,
            "ValorHonorario": document.getElementById("cValorHonorario").value,
            "AgenteCaptador": document.getElementById("cAgente").value, // O AgenteCaptador según tu columna
            "EstadoContrato": document.getElementById("cEstadoContrato").value
        };

        try {
            if(typeof appSheetCRUD === 'function') {
                await appSheetCRUD("Copropiedades", "Edit", [payload]);
                cerrarModal();
                await cargarDatos();
            }
        } catch(err) {
            alert("Error: " + err.message);
        } finally {
            document.getElementById("spinner").style.display = "none";
        }
    };

    /* --- UTILIDADES --- */
    function resolveAgente(id) {
        if(!id) return "-";
        const a = DB.Agentes.find(x => x.ID === id);
        return a ? a.Nombre : "Ex-Agente";
    }
    /* --- FUNCIÓN DE FECHA CORREGIDA --- */
    function formatearFecha(iso) { 
      if(!iso) return "--"; 
      
      // 1. Si ya viene como texto "dd/mm/yyyy", la devolvemos tal cual
      if(iso.includes("/")) return iso;

      // 2. Limpiamos si viene con hora (Ej: 2026-01-01T14:00:00)
      const fechaLimpia = iso.split("T")[0];

      // 3. Intentamos dividir por guión (YYYY-MM-DD)
      const partes = fechaLimpia.split("-");
      
      // Si tenemos 3 partes (Año, Mes, Día), reformateamos
      if(partes.length === 3) {
          const [anio, mes, dia] = partes;
          return `${dia}/${mes}/${anio}`;
      }

      return iso; // Si no entendemos el formato, lo mostramos original
    }
    function clp(v) { return "$" + new Intl.NumberFormat("es-CL").format(v || 0); }

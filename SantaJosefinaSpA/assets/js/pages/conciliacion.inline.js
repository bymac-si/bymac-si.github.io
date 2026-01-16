// ===== Extracted from conciliacion.html =====

/* VARIABLES GLOBAL */
    let PAGOS = [], UNIDADES = [], COBROS = [], VIEW = [];
    let PAGO_ACTUAL = null;

    document.addEventListener("DOMContentLoaded", async () => {
      try { 
    document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); 
    // AGREGAR ESTA LÍNEA CLAVE:
    if (typeof initHeader === "function") initHeader(); 
} catch(e){}

      try { document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); } catch(e){}
      cargarDatos();
    });

    async function cargarDatos() {
      try {
        // Cargamos también COBROS para poder cruzarlos y cerrar deudas
        const [pagos, unidades, cobros] = await Promise.all([
            fetchData("Pagos").catch(()=>[]),
            fetchData("Unidades").catch(()=>[]),
            fetchData("Cobros").catch(()=>[]) 
        ]);
        PAGOS = pagos;
        UNIDADES = unidades;
        COBROS = cobros;
        
        // Ordenar por fecha descendente
        PAGOS.sort((a,b) => new Date(b.FechaPago) - new Date(a.FechaPago));

        aplicarFiltros();
      } catch(e) { console.error(e); }
    }

    function aplicarFiltros() {
      const q = (document.getElementById("inpBuscar").value || "").toLowerCase();
      const estado = document.getElementById("selEstado").value;

      VIEW = PAGOS.filter(p => {
        if(estado && !p.Estado.includes(estado)) return false;
        
        const unidadNum = resolverUnidad(p.UnidadID);
        const searchStr = [unidadNum, p.Monto, p.ID, p.Metodo].join(" ").toLowerCase();
        if(q && !searchStr.includes(q)) return false;
        
        return true;
      });

      renderTabla();
    }

    function resolverUnidad(id) {
        const u = UNIDADES.find(x => String(getKeyVal(x)) === String(id));
        return u ? (u.Numero || u.Nombre) : id;
    }

    function renderTabla() {
      const tb = document.getElementById("tablaPagos");
      if(VIEW.length === 0) { tb.innerHTML = '<tr><td colspan="7" class="muted">No hay pagos con estos filtros.</td></tr>'; return; }

      tb.innerHTML = VIEW.map(p => {
        let badgeClass = "st-pendiente";
        if(p.Estado === 'Aprobado') badgeClass = "st-aprobado";
        if(p.Estado === 'Rechazado') badgeClass = "st-rechazado";

        const tieneImg = p.ComprobanteURL ? '<i class="fa-solid fa-image" style="color:#3b82f6;"></i>' : '<span class="muted">-</span>';

        return `
          <tr>
            <td class="mono">${formatearFecha(p.FechaPago)}</td>
            <td style="font-weight:700;">${resolverUnidad(p.UnidadID)}</td>
            <td class="mono">${clp(p.Monto)}</td>
            <td>${p.Metodo}</td>
            <td style="text-align:center;">${tieneImg}</td>
            <td><span class="badge ${badgeClass}">${p.Estado}</span></td>
            <td>
              <button class="btn-icon" onclick='abrirRevision("${getKeyVal(p)}")' title="Revisar">
                <i class="fa-solid fa-magnifying-glass"></i>
              </button>
            </td>
          </tr>
        `;
      }).join("");
    }

    function abrirRevision(id) {
      PAGO_ACTUAL = PAGOS.find(p => String(getKeyVal(p)) === String(id));
      if(!PAGO_ACTUAL) return;

      const numUnidad = resolverUnidad(PAGO_ACTUAL.UnidadID);
      document.getElementById("modalSubtitulo").textContent = `Unidad ${numUnidad} - ${clp(PAGO_ACTUAL.Monto)}`;
      document.getElementById("modalObs").textContent = PAGO_ACTUAL.Observaciones || "Sin nota";
      
      // Mostrar etiqueta amigable en vez de ID técnico si es un tag
      let etiquetaDeuda = PAGO_ACTUAL.CobroID;
      if(etiquetaDeuda === "TOTAL_DEUDA") etiquetaDeuda = "Pago Total Deuda";
      if(etiquetaDeuda === "GC_MES_ACTUAL") etiquetaDeuda = "Gasto Común Mes Actual";
      
      document.getElementById("modalCobroID").textContent = etiquetaDeuda || "Pago Genérico";

      const img = document.getElementById("modalImg");
      const noImg = document.getElementById("modalNoImg");
      
      if(PAGO_ACTUAL.ComprobanteURL) {
        img.src = PAGO_ACTUAL.ComprobanteURL;
        img.style.display = "block"; noImg.style.display = "none";
      } else {
        img.style.display = "none"; noImg.style.display = "block";
      }

      document.getElementById("modalRevision").classList.add("active");
    }

    function cerrarModal() {
      document.getElementById("modalRevision").classList.remove("active");
      PAGO_ACTUAL = null;
    }

    // --- LÓGICA INTELIGENTE DE APROBACIÓN ---
    async function procesarPago(nuevoEstado) {
      if(!PAGO_ACTUAL) return;
      if(!confirm(`¿Confirmas marcar este pago como ${nuevoEstado}?`)) return;

      document.getElementById("pageSpinner").style.display = "grid";
      
      try {
        // 1. Actualizar el estado en la tabla PAGOS (Siempre se hace)
        const payloadPago = {
            ID: getKeyVal(PAGO_ACTUAL),
            Estado: nuevoEstado
        };

        if(typeof appSheetCRUD === 'function') {
            
            // Paso A: Actualizar Pago
            await appSheetCRUD("Pagos", "Edit", [payloadPago]);
            
            // Paso B: Actualizar Deuda en COBROS (Solo si se aprueba)
            if(nuevoEstado === 'Aprobado' && PAGO_ACTUAL.CobroID) {
                
                const cobroRef = PAGO_ACTUAL.CobroID;
                const unidadID = PAGO_ACTUAL.UnidadID;
                let filasAEditar = [];

                // CASO 1: Es un ID Específico (ej: COB_ENE_2026)
                // Verificamos si existe en la lista de cobros cargada
                const cobroEspecifico = COBROS.find(c => String(getKeyVal(c)) === String(cobroRef));
                
                if (cobroEspecifico) {
                    filasAEditar.push({ ID: cobroRef, Estado: "Pagado" });
                
                } else if (["TOTAL_DEUDA", "GC_MES_ACTUAL", "MORA_HISTORICA"].includes(cobroRef)) {
                    // CASO 2: Es una etiqueta genérica ("TOTAL_DEUDA")
                    // Buscamos TODOS los cobros pendientes de esa unidad
                    const pendientes = COBROS.filter(c => 
                        String(c.UnidadID) === String(unidadID) && 
                        c.Estado === 'Pendiente'
                    );
                    
                    // Los marcamos todos como pagados
                    pendientes.forEach(p => {
                        filasAEditar.push({ ID: getKeyVal(p), Estado: "Pagado" });
                    });
                }

                // Ejecutar actualización masiva o individual en Cobros
                if (filasAEditar.length > 0) {
                    console.log("Actualizando Cobros:", filasAEditar);
                    await appSheetCRUD("Cobros", "Edit", filasAEditar);
                } else {
                    console.warn("No se encontraron cobros vinculados para actualizar.");
                }
            }

        } else {
            // Mock local
            await new Promise(r => setTimeout(r, 1000));
        }

        cerrarModal();
        await cargarDatos(); 
        alert(`Pago ${nuevoEstado} exitosamente.`);

      } catch(e) {
        console.error(e);
        alert("Error al procesar: " + (e.message || e));
      } finally {
        document.getElementById("pageSpinner").style.display = "none";
      }
    }

    /* Helpers */
    function clp(v) { return "$" + new Intl.NumberFormat("es-CL").format(v); }
    function formatearFecha(iso) { if(!iso) return ""; return iso.split("T")[0]; }
    function getKeyVal(o) { return o.ID || o.id || ""; }

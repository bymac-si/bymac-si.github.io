// ===== Extracted from unidades.html =====

let UNIDADES = [], COPROPIEDADES = [], VIEW = [];
    let DATA_TO_IMPORT = []; // Buffer para la carga masiva

    document.addEventListener("DOMContentLoaded", async () => {
        try { 
    document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); 
    // AGREGAR ESTA LÍNEA CLAVE:
    if (typeof initHeader === "function") initHeader(); 
} catch(e){}

        try { document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); } catch(e){}
        
        await cargarDatos();
        
        // Auto-seleccionar si viene por URL (ej: unidades.html?id=COPRO_123)
        const params = new URLSearchParams(window.location.search);
        const coproID = params.get('id');
        if(coproID) {
            document.getElementById("filtroCopropiedad").value = coproID;
            aplicarFiltros();
        }
    });

    async function cargarDatos() {
        showSpinner("Cargando base de datos...");
        try {
            const [u, c] = await Promise.all([
                fetchData("Unidades").catch(()=>[]),
                fetchData("Copropiedades").catch(()=>[])
            ]);
            
            UNIDADES = u || [];
            COPROPIEDADES = c || [];

            // Llenar Select Condominios
            const sel = document.getElementById("filtroCopropiedad");
            sel.innerHTML = '<option value="">-- Selecciona Comunidad --</option>' + 
                COPROPIEDADES.map(c => `<option value="${c.ID}">${c.Nombre}</option>`).join("");

        } catch(e) {
            console.error(e);
            alert("Error cargando datos: " + e.message);
        } finally {
            hideSpinner();
        }
    }

    function aplicarFiltros() {
        const idCopro = document.getElementById("filtroCopropiedad").value;
        const q = document.getElementById("filtroBuscar").value.toLowerCase();
        const torre = document.getElementById("filtroTorre").value;

        if(!idCopro) {
            document.getElementById("tablaUnidades").innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px; color:#64748b;"><i class="fa-solid fa-arrow-up"></i><br>Por favor selecciona una Comunidad arriba.</td></tr>';
            return;
        }

        VIEW = UNIDADES.filter(u => String(u.CopropiedadID) === String(idCopro));
        
        // Llenar filtro de torres dinámicamente según la comunidad seleccionada
        const torresUnicas = [...new Set(VIEW.map(u => u.Torre).filter(Boolean))].sort();
        const selTorre = document.getElementById("filtroTorre");
        // Preservar selección si existe
        const prevTorre = selTorre.value;
        selTorre.innerHTML = '<option value="">(Todas)</option>' + torresUnicas.map(t => `<option value="${t}">${t}</option>`).join("");
        if(torresUnicas.includes(prevTorre)) selTorre.value = prevTorre;

        // Filtrar
        if(torre) VIEW = VIEW.filter(u => u.Torre === torre);
        if(q) VIEW = VIEW.filter(u => 
            (u.Numero||"").toLowerCase().includes(q) || 
            (u.Torre||"").toLowerCase().includes(q)
        );

        renderTabla();
    }

    function renderTabla() {
        const tb = document.getElementById("tablaUnidades");
        if(VIEW.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay unidades registradas en esta comunidad.</td></tr>';
            return;
        }

        tb.innerHTML = VIEW.map(u => `
            <tr>
                <td style="font-weight:700;">${u.Numero}</td>
                <td>${u.Torre || '-'}</td>
                <td>${u.Piso || '-'}</td>
                <td>${u.Alicuota ? u.Alicuota + '%' : '-'}</td>
                <td><span style="font-size:11px; padding:3px 8px; border-radius:10px; background:${getColorEstado(u.Estado)}; color:#fff;">${u.Estado}</span></td>
                <td style="text-align:right;">
                    <button class="btn-icon" onclick="editar('${u.ID}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon" onclick="eliminar('${u.ID}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join("");
    }

    function getColorEstado(e) {
        if(e === 'Ocupada') return '#ef4444';
        if(e === 'Arrendada') return '#f59e0b';
        return '#10b981'; // Disponible
    }

    /* --- CRUD INDIVIDUAL --- */
    function abrirModal() {
        const idCopro = document.getElementById("filtroCopropiedad").value;
        if(!idCopro) return alert("Primero selecciona una comunidad en el filtro.");

        const copro = COPROPIEDADES.find(c => String(c.ID) === String(idCopro));

        document.getElementById("formUnidad").reset();
        document.getElementById("uID").value = "";
        document.getElementById("modalTitle").innerText = "Nueva Unidad";
        
        // Pre-llenar comunidad
        document.getElementById("uCopropiedadID").value = idCopro;
        document.getElementById("uCopropiedadNombre").value = copro ? copro.Nombre : "Error";
        
        document.getElementById("modalUnidad").style.display = "flex";
    }

    function editar(id) {
        const u = UNIDADES.find(x => x.ID === id);
        if(!u) return;
        
        const copro = COPROPIEDADES.find(c => String(c.ID) === String(u.CopropiedadID));

        document.getElementById("uID").value = u.ID;
        document.getElementById("uCopropiedadID").value = u.CopropiedadID;
        document.getElementById("uCopropiedadNombre").value = copro ? copro.Nombre : "";
        document.getElementById("uNumero").value = u.Numero;
        document.getElementById("uTorre").value = u.Torre || "";
        document.getElementById("uPiso").value = u.Piso || "";
        document.getElementById("uAlicuota").value = u.Alicuota || "";
        document.getElementById("uEstado").value = u.Estado || "Disponible";

        document.getElementById("modalTitle").innerText = "Editar Unidad";
        document.getElementById("modalUnidad").style.display = "flex";
    }

    function cerrarModal() { document.getElementById("modalUnidad").style.display = "none"; }

    document.getElementById("formUnidad").onsubmit = async (e) => {
        e.preventDefault();
        showSpinner("Guardando...");
        
        const id = document.getElementById("uID").value;
        const payload = {
            "ID": id || ("UNI_" + Date.now()),
            "CopropiedadID": document.getElementById("uCopropiedadID").value,
            "Numero": document.getElementById("uNumero").value,
            "Torre": document.getElementById("uTorre").value,
            "Piso": document.getElementById("uPiso").value,
            "Alicuota": document.getElementById("uAlicuota").value,
            "Estado": document.getElementById("uEstado").value
        };

        try {
            const action = id ? "Edit" : "Add";
            if(typeof appSheetCRUD === 'function') await appSheetCRUD("Unidades", action, [payload]);
            cerrarModal();
            await cargarDatos();
            aplicarFiltros();
        } catch(err) {
            alert("Error: " + err.message);
        } finally {
            hideSpinner();
        }
    };

    async function eliminar(id) {
        if(!confirm("¿Eliminar unidad?")) return;
        showSpinner("Eliminando...");
        try {
            if(typeof appSheetCRUD === 'function') await appSheetCRUD("Unidades", "Delete", [{"ID": id}]);
            await cargarDatos();
            aplicarFiltros();
        } catch(e) { alert(e.message); } finally { hideSpinner(); }
    }

    /* --- LÓGICA IMPORTACIÓN MASIVA --- */
    function abrirImportar() {
        const idCopro = document.getElementById("filtroCopropiedad").value;
        if(!idCopro) return alert("Selecciona la Comunidad destino en el filtro antes de importar.");
        
        document.getElementById("txtPaste").value = "";
        document.getElementById("tblPreview").innerHTML = '<tr><td colspan="5" style="text-align:center;">Pega tus datos arriba y pulsa Previsualizar.</td></tr>';
        document.getElementById("btnConfirmarCarga").disabled = true;
        document.getElementById("importStats").innerText = "";
        document.getElementById("modalImportar").style.display = "flex";
    }

    function procesarPegado() {
        const texto = document.getElementById("txtPaste").value.trim();
        if(!texto) return;

        const lineas = texto.split("\n");
        const idCopro = document.getElementById("filtroCopropiedad").value;
        
        DATA_TO_IMPORT = [];

        let html = "";
        lineas.forEach((linea, index) => {
            // Separar por Tabulación (Excel default)
            let cols = linea.split("\t");
            // Si solo hay 1 columna, quizás el usuario copió solo números, asumimos orden
            
            // Mapeo: 0:Numero, 1:Torre, 2:Piso, 3:Alicuota
            const obj = {
                "ID": "UNI_" + Date.now() + "_" + index, // ID temporal único
                "CopropiedadID": idCopro,
                "Numero": (cols[0] || "").trim(),
                "Torre": (cols[1] || "").trim(),
                "Piso": (cols[2] || "").trim(),
                "Alicuota": (cols[3] || "0").replace(",", ".").trim(),
                "Estado": "Disponible"
            };

            if(obj.Numero) { // Solo si hay número
                DATA_TO_IMPORT.push(obj);
                html += `<tr>
                    <td>${index + 1}</td>
                    <td><b>${obj.Numero}</b></td>
                    <td>${obj.Torre}</td>
                    <td>${obj.Piso}</td>
                    <td>${obj.Alicuota}%</td>
                </tr>`;
            }
        });

        document.getElementById("tblPreview").innerHTML = html || '<tr><td colspan="5">No se detectaron datos válidos.</td></tr>';
        
        if(DATA_TO_IMPORT.length > 0) {
            document.getElementById("btnConfirmarCarga").disabled = false;
            document.getElementById("importStats").innerText = `${DATA_TO_IMPORT.length} registros detectados.`;
        }
    }

    async function enviarCargaMasiva() {
        if(DATA_TO_IMPORT.length === 0) return;
        
        if(!confirm(`Estás a punto de crear ${DATA_TO_IMPORT.length} unidades. ¿Confirmar?`)) return;

        showSpinner(`Creando ${DATA_TO_IMPORT.length} unidades...`);
        try {
            // AppSheet soporta Batch Add (enviar array)
            if(typeof appSheetCRUD === 'function') {
                await appSheetCRUD("Unidades", "Add", DATA_TO_IMPORT);
            }
            
            document.getElementById("modalImportar").style.display = "none";
            alert("✅ Carga masiva exitosa.");
            await cargarDatos();
            aplicarFiltros(); // Refrescar vista
            
        } catch(e) {
            console.error(e);
            alert("Error en la carga: " + e.message);
        } finally {
            hideSpinner();
        }
    }

    /* Utilidades Visuales */
    function showSpinner(msg) { 
        document.getElementById("spinnerText").innerText = msg;
        document.getElementById("pageSpinner").style.display = "grid"; 
    }
    function hideSpinner() { document.getElementById("pageSpinner").style.display = "none"; }

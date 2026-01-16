// ===== Extracted from copropietarios.html =====

/* ===== ESTADO ===== */
        let USUARIOS = [], COPROPIEDADES = [], UNIDADES = [], VIEW = [];
        let DATA_TO_IMPORT = [];
        let CURRENT_USER_ID = null;

        /* ===== INICIO ===== */
        document.addEventListener("DOMContentLoaded", async () => {
            try { document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); } catch (e) {}
            try { document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); } catch (e) {}
            await cargarDatos();
            
            // Auto-filtro por URL
            const params = new URLSearchParams(window.location.search);
            if (params.get("id")) {
                document.getElementById("filtroCopropiedad").value = params.get("id");
                aplicarFiltros();
            }
        });

        /* ===== CARGA DE DATOS ===== */
        async function cargarDatos() {
            showSpinner("Sincronizando...");
            try {
                const [u, c, uni] = await Promise.all([
                    fetchData("Copropietarios").catch(() => []),
                    fetchData("Copropiedades").catch(() => []),
                    fetchData("Unidades").catch(() => []),
                ]);
                USUARIOS = u || [];
                COPROPIEDADES = c || [];
                UNIDADES = uni || [];

                const sel = document.getElementById("filtroCopropiedad");
                sel.innerHTML = '<option value="">-- Selecciona Comunidad --</option>' + 
                    COPROPIEDADES.map(c => `<option value="${c.ID}">${c.Nombre}</option>`).join("");
                
                // Si ya había filtro seleccionado, reaplicar
                aplicarFiltros(); 
            } catch (e) {
                console.error(e);
                alert("Error cargando datos.");
            } finally {
                hideSpinner();
            }
        }

        /* ===== FILTROS Y RENDER ===== */
        function aplicarFiltros() {
            const idCopro = document.getElementById("filtroCopropiedad").value;
            const q = document.getElementById("filtroBuscar").value.toLowerCase();
            const tipo = document.getElementById("filtroTipo").value;

            if (!idCopro) {
                document.getElementById("tablaUsuarios").innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#64748b;">Selecciona una Comunidad arriba para ver sus residentes.</td></tr>';
                return;
            }

            const unidadesLocal = UNIDADES.filter(uni => String(uni.CopropiedadID) === String(idCopro));

            VIEW = USUARIOS.filter(user => {
                // Filtro Comunidad (Directo o por Unidad)
                let esDeComunidad = false;
                if (user.CopropiedadID && String(user.CopropiedadID) === String(idCopro)) esDeComunidad = true;
                else if (user.UnidadID) {
                    const uni = unidadesLocal.find(u => String(u.ID) === String(user.UnidadID));
                    if(uni) esDeComunidad = true;
                }
                if(!esDeComunidad) return false;

                // Filtro Tipo
                if (tipo && user.Tipo !== tipo) return false;

                // Filtro Texto
                if (q && !((user.Nombre||"").toLowerCase().includes(q) || (user.Email||"").toLowerCase().includes(q))) return false;

                return true;
            });

            renderTabla(unidadesLocal);
        }

        function renderTabla(unidadesLocal) {
            const tb = document.getElementById("tablaUsuarios");
            if (VIEW.length === 0) {
                tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay personas registradas con estos filtros.</td></tr>';
                return;
            }

            tb.innerHTML = VIEW.map(user => {
                let labelUnidad = '<span style="color:#cbd5e1;">--</span>';
                if (user.UnidadID) {
                    const uni = unidadesLocal.find(u => String(u.ID) === String(user.UnidadID));
                    if (uni) labelUnidad = `<b>${uni.Numero}</b> ${uni.Torre ? '<small>('+uni.Torre+')</small>' : ''}`;
                }
                const badgeClass = user.Tipo === "Propietario" ? "bg-blue" : "bg-orange";

                return `
                <tr>
                    <td style="font-weight:600;">${user.Nombre}</td>
                    <td>${labelUnidad}</td>
                    <td style="font-size:13px;">
                        <div><i class="fa-regular fa-envelope" style="width:15px;"></i> ${user.Email || "-"}</div>
                        <div style="color:#64748b;"><i class="fa-solid fa-phone" style="width:15px;"></i> ${user.Telefono || "-"}</div>
                    </td>
                    <td><span class="badge ${badgeClass}">${user.Tipo || "Residente"}</span></td>
                    <td style="text-align:right;">
                        <button class="btn-icon" onclick="abrirGestion('${user.ID}')" title="Historial/Gestión" style="background:#e0f2fe; color:#0369a1;"><i class="fa-solid fa-comments"></i></button>
                        <button class="btn-icon" onclick="editar('${user.ID}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" onclick="eliminar('${user.ID}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            }).join("");
        }

        /* ===== CRUD USUARIO ===== */
        function abrirModalUsuario() {
            const idCopro = document.getElementById("filtroCopropiedad").value;
            if (!idCopro) return alert("Selecciona la Comunidad en el filtro primero.");
            
            const copro = COPROPIEDADES.find(c => String(c.ID) === String(idCopro));
            
            document.getElementById("formUsuario").reset();
            document.getElementById("uID").value = "";
            document.getElementById("modalTitle").innerText = "Nueva Persona";
            document.getElementById("uCopropiedadID").value = idCopro;
            document.getElementById("uCopropiedadNombre").value = copro ? copro.Nombre : "";
            
            llenarSelectUnidades(idCopro);
            document.getElementById("modalUsuario").style.display = "flex";
        }

        function llenarSelectUnidades(idCopro, selectedID = "") {
            const list = UNIDADES.filter(u => String(u.CopropiedadID) === String(idCopro));
            list.sort((a, b) => a.Numero.localeCompare(b.Numero, undefined, { numeric: true }));
            
            const sel = document.getElementById("uUnidadID");
            sel.innerHTML = '<option value="">(Sin asignar)</option>' + 
                list.map(u => `<option value="${u.ID}">${u.Numero} ${u.Torre ? "("+u.Torre+")" : ""}</option>`).join("");
            if (selectedID) sel.value = selectedID;
        }

        function editar(id) {
            const user = USUARIOS.find(x => x.ID === id);
            if (!user) return;

            let idCopro = user.CopropiedadID;
            if (!idCopro && user.UnidadID) {
                const uni = UNIDADES.find(u => u.ID === user.UnidadID);
                if (uni) idCopro = uni.CopropiedadID;
            }
            if(!idCopro) idCopro = document.getElementById("filtroCopropiedad").value; // Fallback

            const copro = COPROPIEDADES.find(c => String(c.ID) === String(idCopro));

            document.getElementById("uID").value = user.ID;
            document.getElementById("uCopropiedadID").value = idCopro || "";
            document.getElementById("uCopropiedadNombre").value = copro ? copro.Nombre : "";
            document.getElementById("uNombre").value = user.Nombre;
            document.getElementById("uEmail").value = user.Email || "";
            document.getElementById("uTelefono").value = user.Telefono || "";
            document.getElementById("uTipo").value = user.Tipo || "Propietario";

            llenarSelectUnidades(idCopro, user.UnidadID);
            document.getElementById("modalTitle").innerText = "Editar Persona";
            document.getElementById("modalUsuario").style.display = "flex";
        }

        document.getElementById("formUsuario").onsubmit = async (e) => {
            e.preventDefault();
            showSpinner("Guardando...");
            const id = document.getElementById("uID").value;
            const payload = {
                ID: id || "USR_" + Date.now(),
                CopropiedadID: document.getElementById("uCopropiedadID").value,
                UnidadID: document.getElementById("uUnidadID").value,
                Nombre: document.getElementById("uNombre").value,
                Email: document.getElementById("uEmail").value,
                Telefono: document.getElementById("uTelefono").value,
                Tipo: document.getElementById("uTipo").value
            };

            try {
                const action = id ? "Edit" : "Add";
                await appSheetCRUD("Copropietarios", action, [payload]);
                document.getElementById("modalUsuario").style.display = "none";
                await cargarDatos();
            } catch (err) { alert("Error: " + err.message); } finally { hideSpinner(); }
        };

        async function eliminar(id) {
            if (!confirm("¿Eliminar usuario?")) return;
            showSpinner("Eliminando...");
            try {
                await appSheetCRUD("Copropietarios", "Delete", [{ ID: id }]);
                await cargarDatos();
            } catch (e) { alert(e.message); } finally { hideSpinner(); }
        }

        /* ===== GESTIÓN / BITÁCORA ===== */
        async function abrirGestion(id) {
            CURRENT_USER_ID = id;
            const u = USUARIOS.find(x => String(x.ID) === String(id));
            if(!u) return;
            
            document.getElementById("lblGestionUser").innerText = `Usuario: ${u.Nombre} (${u.Tipo})`;
            document.getElementById("bitFecha").valueAsDate = new Date();
            document.getElementById("bitNota").value = "";
            document.getElementById("modalGestion").style.display = "flex";
            
            cargarBitacora();
        }

        async function cargarBitacora() {
            const container = document.getElementById("timelineContainer");
            container.innerHTML = '<div style="text-align:center; color:#94a3b8;">Cargando...</div>';
            
            try {
                // Reutilizamos tabla 'Bitacora'. El 'ProspectoID' será el ID del Residente.
                const logs = await fetchData("Bitacora").catch(()=>[]);
                const historial = logs.filter(l => String(l.ProspectoID) === String(CURRENT_USER_ID));
                
                historial.sort((a,b) => new Date(b.Fecha) - new Date(a.Fecha));

                if(historial.length === 0) {
                    container.innerHTML = '<div style="text-align:center; padding:20px; color:#cbd5e1;"><i class="fa-regular fa-comment-dots" style="font-size:30px;"></i><br>Sin registros.</div>';
                    return;
                }

                container.innerHTML = historial.map(h => `
                    <div class="chat-bubble ${h.Tipo}">
                        <div class="chat-meta">
                            <span><b>${h.Tipo}</b> • ${h.Fecha}</span>
                            <span>${h.Usuario || "Admin"}</span>
                        </div>
                        <div class="chat-text">${h.Nota}</div>
                    </div>`).join("");
            } catch(e) { container.innerHTML = "Error al cargar historial."; }
        }

        async function guardarInteraccion() {
            const nota = document.getElementById("bitNota").value;
            const tipo = document.getElementById("bitTipo").value;
            const fecha = document.getElementById("bitFecha").value;
            if(!nota) return alert("Escribe el detalle.");

            // Usuario actual (Admin)
            let autor = "Admin";
            if(typeof getAuthUser === 'function') { const a = getAuthUser(); if(a) autor = a.nombre; }

            const payload = {
                "ID": "BIT_" + Date.now(),
                "ProspectoID": CURRENT_USER_ID,
                "Fecha": fecha,
                "Tipo": tipo,
                "Nota": nota,
                "Usuario": autor
            };

            showSpinner("Registrando...");
            try {
                await appSheetCRUD("Bitacora", "Add", [payload]);
                document.getElementById("bitNota").value = "";
                await cargarBitacora();
            } catch(e) { alert(e.message); } finally { hideSpinner(); }
        }

        /* ===== IMPORTACIÓN ===== */
        function abrirImportar() {
            const idCopro = document.getElementById("filtroCopropiedad").value;
            if (!idCopro) return alert("Selecciona la Comunidad destino antes de importar.");
            
            document.getElementById("txtPaste").value = "";
            document.getElementById("tblPreview").innerHTML = '<tr><td colspan="4" style="text-align:center;">Pega datos arriba.</td></tr>';
            document.getElementById("btnConfirmarCarga").disabled = true;
            document.getElementById("importStats").innerText = "";
            document.getElementById("modalImportar").style.display = "flex";
        }

        function procesarPegado() {
            const texto = document.getElementById("txtPaste").value.trim();
            if (!texto) return;
            const lineas = texto.split("\n");
            const idCopro = document.getElementById("filtroCopropiedad").value;
            const unidadesLocal = UNIDADES.filter(u => String(u.CopropiedadID) === String(idCopro));

            DATA_TO_IMPORT = [];
            let html = "";

            lineas.forEach((linea, index) => {
                let cols = linea.split(/\t|,/); // Soporta tab o coma
                const nombre = (cols[0] || "").trim();
                const email = (cols[1] || "").trim();
                const numUnidad = (cols[2] || "").trim();

                if (nombre) {
                    let idUnidadMatch = "";
                    let labelUnidad = '<span style="color:red;">No encontrada</span>';
                    if (numUnidad) {
                        const match = unidadesLocal.find(u => u.Numero === numUnidad);
                        if (match) {
                            idUnidadMatch = match.ID;
                            labelUnidad = `<span style="color:green;">${match.Numero}</span>`;
                        }
                    }
                    DATA_TO_IMPORT.push({
                        ID: "USR_" + Date.now() + "_" + index,
                        CopropiedadID: idCopro,
                        UnidadID: idUnidadMatch,
                        Nombre: nombre,
                        Email: email,
                        Tipo: "Propietario"
                    });
                    html += `<tr><td>${index + 1}</td><td><b>${nombre}</b></td><td>${email}</td><td>${labelUnidad} (${numUnidad})</td></tr>`;
                }
            });
            document.getElementById("tblPreview").innerHTML = html || '<tr><td colspan="4">Datos no válidos.</td></tr>';
            if (DATA_TO_IMPORT.length > 0) {
                document.getElementById("btnConfirmarCarga").disabled = false;
                document.getElementById("importStats").innerText = `${DATA_TO_IMPORT.length} detectados.`;
            }
        }

        async function enviarCargaMasiva() {
            if (DATA_TO_IMPORT.length === 0) return;
            showSpinner(`Creando ${DATA_TO_IMPORT.length} personas...`);
            try {
                await appSheetCRUD("Copropietarios", "Add", DATA_TO_IMPORT);
                document.getElementById("modalImportar").style.display = "none";
                alert("Carga masiva exitosa.");
                await cargarDatos();
            } catch (e) { alert("Error: " + e.message); } finally { hideSpinner(); }
        }

        /* UTILS */
        function showSpinner(msg) { document.getElementById("spinnerText").innerText = msg || "Cargando..."; document.getElementById("pageSpinner").style.display = "grid"; }
        function hideSpinner() { document.getElementById("pageSpinner").style.display = "none"; }

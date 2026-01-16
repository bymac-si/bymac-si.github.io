// ===== Extracted from mobile_tareas.html =====

let TAREAS = [];
        let AGENTES = []; 
        let FILTRO_ACTUAL = 'Pendiente'; 
        let USUARIO_ACTUAL_ID = ""; 

        document.addEventListener("DOMContentLoaded", async () => {
            try {
                const u = getAuthUser(); 
                USUARIO_ACTUAL_ID = u.Nombre || "";
                await cargarDatos();
            } catch(e) { console.error(e); }
        });

        async function cargarDatos() {
            try {
                const [tareasData, agentesData] = await Promise.all([
                    fetchData("Tareas").catch(()=>[]),
                    fetchData("Agentes").catch(()=>[])
                ]);
                
                TAREAS = tareasData || [];
                AGENTES = agentesData || [];

                llenarSelectAgentes();
                aplicarFiltro(FILTRO_ACTUAL);
            } catch(e) {
                console.error(e);
                document.getElementById("listaTareas").innerHTML = "<div style='text-align:center; padding:30px;'>Error de conexión</div>";
            }
        }

        function llenarSelectAgentes() {
            const sel = document.getElementById("tAgente");
            const activos = AGENTES.filter(a => String(a.Activo).toLowerCase() === "true" || a.Activo === true);
            const listaAMostrar = activos.length > 0 ? activos : AGENTES;

            sel.innerHTML = '<option value="">-- Sin Asignar --</option>' + 
                listaAMostrar.map(a => `<option value="${a.ID}">${a.Nombre}</option>`).join("");
        }

        function filtrar(tipo, btn) {
            FILTRO_ACTUAL = tipo;
            document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            aplicarFiltro(tipo);
        }

        function aplicarFiltro(tipo) {
            let lista = [];
            if(tipo === 'Pendiente') {
                lista = TAREAS.filter(t => t.Estado !== 'Completada');
                lista.sort((a,b) => new Date(a.FechaLimite) - new Date(b.FechaLimite));
            } else if (tipo === 'Completada') {
                lista = TAREAS.filter(t => t.Estado === 'Completada');
                lista.sort((a,b) => new Date(b.FechaLimite) - new Date(a.FechaLimite));
            } else {
                lista = TAREAS.filter(t => t.Prioridad === tipo && t.Estado !== 'Completada');
            }
            renderLista(lista);
        }

        function renderLista(lista) {
            const container = document.getElementById("listaTareas");
            
            if(lista.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:50px 20px; color:#94a3b8;">
                        <i class="fa-solid fa-clipboard-check" style="font-size:40px; margin-bottom:10px; opacity:0.3;"></i>
                        <p>No hay tareas aquí.</p>
                    </div>`;
                return;
            }

            container.innerHTML = lista.map(t => {
                const isDone = t.Estado === 'Completada';
                const fechaFmt = formatearFecha(t.FechaLimite);
                
                const agente = AGENTES.find(a => String(a.ID) === String(t.AgenteID));
                let avatarHTML = '';
                
                if(agente) {
                    if(agente.Avatar && agente.Avatar.startsWith("http")) {
                        avatarHTML = `<div class="mini-avatar"><img src="${agente.Avatar}"></div>`;
                    } else {
                        avatarHTML = `<div class="mini-avatar" style="background:#e2e8f0; color:#64748b;">${agente.Nombre.charAt(0)}</div>`;
                    }
                } else {
                    avatarHTML = `<div class="mini-avatar" title="Sin asignar"><i class="fa-solid fa-user-plus" style="font-size:10px;"></i></div>`;
                }

                return `
                <div class="task-card" onclick="editar('${t.ID}')">
                    <div class="prio-line p-${t.Prioridad}"></div>
                    
                    <div class="btn-check ${isDone ? 'checked' : ''}" onclick="toggleCheck('${t.ID}', event)">
                        <i class="fa-solid fa-check"></i>
                    </div>

                    <div class="task-info">
                        <div class="task-title" style="${isDone ? 'text-decoration:line-through; opacity:0.6;' : ''}">
                            ${t["Título"] || "Sin título"}
                        </div>
                        <div class="task-desc">${t["Descripción"] || ""}</div>
                        <div class="task-meta">
                            <i class="fa-regular fa-calendar"></i> ${fechaFmt} 
                            <span style="border-left:1px solid #e2e8f0; padding-left:10px; display:flex; align-items:center; gap:5px;">
                                ${avatarHTML} <span style="font-size:10px;">${agente ? agente.Nombre.split(" ")[0] : "Asignar"}</span>
                            </span>
                        </div>
                    </div>
                </div>`;
            }).join("");
        }

        async function toggleCheck(id, event) {
            event.stopPropagation();
            const task = TAREAS.find(t => t.ID === id);
            if(!task) return;

            const nuevoEstado = task.Estado === 'Completada' ? 'Pendiente' : 'Completada';
            task.Estado = nuevoEstado;
            aplicarFiltro(FILTRO_ACTUAL);
            mostrarToast(nuevoEstado === 'Completada' ? "Tarea completada ✅" : "Tarea reactivada 🔄");

            try {
                await appSheetCRUD("Tareas", "Edit", [{ "ID": id, "Estado": nuevoEstado }]);
            } catch(e) {
                alert("Error al guardar en la nube");
            }
        }

        function abrirModal() {
            document.getElementById("formTarea").reset();
            document.getElementById("tID").value = "";
            document.getElementById("modalTitle").innerText = "Nueva Tarea";
            
            const hoy = new Date().toISOString().split("T")[0];
            document.getElementById("tFecha").value = hoy;
            document.getElementById("tCreacion").value = hoy;
            // Resetear prioridad a Media por defecto
            document.getElementById("tPrioridad").value = "Media";

            document.getElementById("btnEliminar").style.display = "none";
            
            const miAgente = AGENTES.find(a => a.Nombre === USUARIO_ACTUAL_ID);
            if(miAgente) document.getElementById("tAgente").value = miAgente.ID;

            document.getElementById("modalTarea").classList.add("open");
        }

        function editar(id) {
            const t = TAREAS.find(x => x.ID === id);
            if(!t) return;

            document.getElementById("tID").value = t.ID;
            document.getElementById("tTitulo").value = t["Título"] || "";
            document.getElementById("tFecha").value = toInputDate(t.FechaLimite);
            document.getElementById("tCreacion").value = toInputDate(t["FechaCreación"]); 
            document.getElementById("tDesc").value = t["Descripción"] || "";
            
            // CORRECCIÓN CRÍTICA: Cargar la prioridad existente
            // Si no tiene, por defecto "Media"
            document.getElementById("tPrioridad").value = t.Prioridad || "Media";
            
            document.getElementById("tAgente").value = t.AgenteID || ""; 
            
            document.getElementById("modalTitle").innerText = "Editar Tarea";
            document.getElementById("btnEliminar").style.display = "block";
            
            document.getElementById("modalTarea").classList.add("open");
        }

        function cerrarModal() {
            document.getElementById("modalTarea").classList.remove("open");
        }

        document.getElementById("formTarea").onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById("tID").value;
            const isNew = !id;
            const finalID = id || "TSK_" + Date.now();
            
            // CORRECCIÓN CRÍTICA: Asegurar que capturamos "Prioridad"
            const payload = {
                "ID": finalID,
                "Título": document.getElementById("tTitulo").value,
                "Descripción": document.getElementById("tDesc").value,
                "Prioridad": document.getElementById("tPrioridad").value, // <--- AQUÍ
                "FechaLimite": document.getElementById("tFecha").value,
                "FechaCreación": document.getElementById("tCreacion").value, 
                "AgenteID": document.getElementById("tAgente").value, 
                "Estado": isNew ? "Pendiente" : (TAREAS.find(t=>t.ID===id)?.Estado || "Pendiente")
            };

            cerrarModal();
            mostrarToast("Guardando...");

            try {
                const action = isNew ? "Add" : "Edit";
                await appSheetCRUD("Tareas", action, [payload]);
                await cargarDatos();
                mostrarToast("Guardado exitoso");
            } catch(e) {
                alert("Error: " + e.message);
            }
        };

        async function eliminarTarea() {
            const id = document.getElementById("tID").value;
            if(!confirm("¿Eliminar esta tarea definitivamente?")) return;

            cerrarModal();
            mostrarToast("Eliminando...");

            try {
                await appSheetCRUD("Tareas", "Delete", [{ "ID": id }]);
                TAREAS = TAREAS.filter(t => t.ID !== id);
                aplicarFiltro(FILTRO_ACTUAL);
                mostrarToast("Tarea eliminada 🗑️");
            } catch(e) { alert("Error: " + e.message); }
        }

        function mostrarToast(msg) {
            const t = document.getElementById("toast");
            t.innerText = msg;
            t.style.opacity = 1;
            setTimeout(() => t.style.opacity = 0, 3000);
        }

        // 1. Mostrar en tarjetas (DD/MM/YYYY)
        function formatearFecha(iso) {
            if(!iso) return "S/F";
            if(iso.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [y, m, d] = iso.split('-');
                return `${d}/${m}/${y}`;
            }
            if(iso.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = iso.split('/');
                const m = parts[0].padStart(2, '0');
                const d = parts[1].padStart(2, '0');
                const y = parts[2];
                return `${d}/${m}/${y}`;
            }
            return iso;
        }

        // 2. Cargar en input date (YYYY-MM-DD)
        function toInputDate(iso) {
            if(!iso) return "";
            if(iso.match(/^\d{4}-\d{2}-\d{2}$/)) return iso;
            if(iso.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = iso.split('/');
                const m = parts[0].padStart(2, '0');
                const d = parts[1].padStart(2, '0');
                const y = parts[2];
                return `${y}-${m}-${d}`;
            }
            const d = new Date(iso);
            if(!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return "";
        }

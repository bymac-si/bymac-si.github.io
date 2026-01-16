// ===== Extracted from mobile_dashboard.html =====

// Cache para agentes
        let AGENTES_CACHE = [];

        document.addEventListener("DOMContentLoaded", async () => {
            // 1. Obtener usuario (Más robusto)
            try {
                const u = getAuthUser();
                // Verifica mayúsculas y minúsculas
                const nombre = u.Nombre || u.nombre || "Agente";
                document.getElementById("lblUsuario").innerText = nombre.split(" ")[0]; // Solo primer nombre
            } catch (e) {
                document.getElementById("lblUsuario").innerText = "Agente";
            }

            // 2. Cargar Datos (INCLUYENDO AGENTES)
            try {
                const [clientes, props, tareas, agentes] = await Promise.all([
                    fetchData("Clientes").catch(() => []),
                    fetchData("Propiedades").catch(() => []),
                    fetchData("Tareas").catch(() => []),
                    fetchData("Agentes").catch(() => []) // <--- ESTO FALTABA
                ]);

                AGENTES_CACHE = agentes || [];

                // KPIs
                document.getElementById("kpiClientes").innerText = clientes.length;
                document.getElementById("kpiProps").innerText = props.filter(
                    (p) => (p.Estado || "") === "Disponible"
                ).length;

                const pendientes = tareas.filter(
                    (t) => (t.Estado || "") !== "Completada"
                );
                document.getElementById("kpiTareas").innerText = pendientes.length;

                // Renderizar Tareas
                renderTareasResumen(pendientes);
            } catch (e) {
                console.error(e);
            }
        });

        function renderTareasResumen(lista) {
            const container = document.getElementById("listaTareasMobile");
            if (lista.length === 0) {
                container.innerHTML =
                    "<div style='padding:15px; text-align:center; font-size:12px; color:#cbd5e1;'>¡Todo al día! 🎉</div>";
                return;
            }

            // Ordenar por fecha límite
            lista.sort((a, b) => {
                if (!a.FechaLimite) return 1;
                if (!b.FechaLimite) return -1;
                return new Date(a.FechaLimite) - new Date(b.FechaLimite);
            });

            const top3 = lista.slice(0, 3);

            container.innerHTML = top3
                .map((t) => {
                    let colorPrio = "#94a3b8"; // Baja
                    if (t.Prioridad === "Media") colorPrio = "#f59e0b";
                    if (t.Prioridad === "Alta") colorPrio = "#ef4444";

                    // BUSCAR AGENTE
                    const agente = AGENTES_CACHE.find(a => String(a.ID) === String(t.AgenteID));
                    let avatarHtml = `<div class="agent-avatar-xs">?</div>`;
                    let nombreAgente = "Sin Asignar";

                    if(agente) {
                        nombreAgente = agente.Nombre.split(" ")[0];
                        if(agente.Avatar && agente.Avatar.startsWith("http")) {
                            avatarHtml = `<img src="${agente.Avatar}" class="agent-avatar-xs">`;
                        } else {
                            avatarHtml = `<div class="agent-avatar-xs">${agente.Nombre.charAt(0)}</div>`;
                        }
                    }

                    return `
                    <div class="m-list-item" onclick="window.location.href='mobile_tareas.html'">
                        <div style="width:10px; height:10px; border-radius:50%; background:${colorPrio}; margin-right:10px; flex-shrink:0;"></div>
                        <div class="m-info" style="width:100%;">
                            <div class="m-title" style="font-size:13px;">${t["Título"]}</div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                                <div class="m-sub" style="font-size:11px; display:flex; align-items:center;">
                                    <i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${formatearFechaCorrecta(t.FechaLimite)}
                                </div>
                                <div class="agent-pill">
                                    ${avatarHtml} ${nombreAgente}
                                </div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right" style="color:#e2e8f0; font-size:12px; margin-left:10px;"></i>
                    </div>
                    `;
                })
                .join("");
        }

        /* --- FUNCIÓN FECHA TODOTERRENO --- */
        function formatearFechaCorrecta(fecha) {
            if (!fecha) return "S/F";

            // Caso 1: Viene con barras (MM/DD/YYYY o DD/MM/YYYY)
            if (fecha.indexOf('/') > -1) {
                const parts = fecha.split('/');
                // Si el primer número es mayor a 12, asumimos DD/MM/YYYY, si no, asumimos formato US
                // Para simplificar y estandarizar a Chile:
                // Si la fecha ya viene correcta visualmente, no la tocamos, pero si es MM/DD, la invertimos.
                
                // Intento seguro con Date:
                const d = new Date(fecha);
                if (!isNaN(d.getTime())) {
                    const dia = String(d.getDate()).padStart(2, '0');
                    const mes = String(d.getMonth() + 1).padStart(2, '0');
                    const anio = d.getFullYear();
                    return `${dia}/${mes}/${anio}`;
                }
                return fecha; // Devolver original si falla
            }

            // Caso 2: Viene como ISO (YYYY-MM-DD)
            if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [y, m, d] = fecha.split('-');
                return `${d}/${m}/${y}`;
            }

            return fecha;
        }

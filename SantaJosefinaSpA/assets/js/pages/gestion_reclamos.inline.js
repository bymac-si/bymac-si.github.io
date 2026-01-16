// ===== Extracted from gestion_reclamos.html =====

(function(){
         emailjs.init("7Il4AhmGHchP7qfxu");
     })();

let DB = { Tickets:[], Unidades:[], Copropiedades:[], Usuarios:[] };
    let VIEW = [];

    document.addEventListener("DOMContentLoaded", async () => {
        try { 
    document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); 
    // AGREGAR ESTA LÍNEA CLAVE:
    if (typeof initHeader === "function") initHeader(); 
} catch(e){}

        try { document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); } catch(e){}
        await cargarFiltrosIniciales();
    });

    async function cargarFiltrosIniciales() {
        document.getElementById("spinner").style.display = "grid";
        try {
            DB.Copropiedades = await fetchData("Copropiedades").catch(()=>[]) || [];
            const sel = document.getElementById("filtroCopropiedad");
            sel.innerHTML = DB.Copropiedades.length ? "" : "<option>No hay comunidades</option>";
            
            DB.Copropiedades.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.ID;
                opt.textContent = c.Nombre;
                sel.appendChild(opt);
            });

            if(DB.Copropiedades.length > 0) {
                sel.value = DB.Copropiedades[0].ID; 
                await cargarDatos(); 
            }
        } catch(e) { console.error(e); } finally { document.getElementById("spinner").style.display = "none"; }
    }

    async function cargarDatos() {
        const idCopro = document.getElementById("filtroCopropiedad").value;
        if(!idCopro) return;

        document.getElementById("spinner").style.display = "grid";
        try {
            const [tickets, unidades, usuarios] = await Promise.all([
                fetchData("Reclamos").catch(()=>[]),
                fetchData("Unidades").catch(()=>[]),
                fetchData("Copropietarios").catch(()=>[])
            ]);

            // Filtrar por CopropiedadID
            DB.Tickets = (tickets || []).filter(t => String(t.CopropiedadID) === String(idCopro));
            DB.Unidades = (unidades || []).filter(u => String(u.CopropiedadID) === String(idCopro));
            DB.Usuarios = (usuarios || []).filter(u => String(u.CopropiedadID) === String(idCopro));

            aplicarFiltros();

        } catch(e) {
            console.error(e);
            alert("Error cargando datos: " + e.message);
        } finally { document.getElementById("spinner").style.display = "none"; }
    }

    function aplicarFiltros() {
        const estado = document.getElementById("filtroEstado").value;
        VIEW = DB.Tickets;

        if(estado) {
            // Manejo de "En Proceso" que a veces viene con espacio o sin él
            VIEW = VIEW.filter(t => t.Estado === estado || (estado === 'En Proceso' && t.Estado === 'EnProceso'));
        }

        // Ordenar: Pendientes primero, luego fecha
        VIEW.sort((a,b) => {
            if(a.Estado === 'Pendiente' && b.Estado !== 'Pendiente') return -1;
            if(a.Estado !== 'Pendiente' && b.Estado === 'Pendiente') return 1;
            return new Date(b.Fecha) - new Date(a.Fecha);
        });

        renderGrid();
    }

    function renderGrid() {
        const container = document.getElementById("gridTickets");
        if(VIEW.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">No hay tickets con este filtro.</div>';
            return;
        }

        container.innerHTML = VIEW.map(t => {
            const unidad = DB.Unidades.find(u => String(u.ID) === String(t.UnidadID));
            const nombreUnidad = unidad ? unidad.Numero : "U. Desconocida";
            const usuario = DB.Usuarios.find(u => String(u.ID) === String(t.UsuarioID));
            const nombreUsuario = usuario ? usuario.Nombre : "Residente";

            // Limpieza de estado para clases CSS
            let estadoClean = (t.Estado || "Pendiente").replace(" ", ""); 
            if(estadoClean === 'EnProceso') estadoClean = 'Proceso';

            return `
            <div class="ticket-card border-${estadoClean}">
                <div class="ticket-body">
                    <div class="t-meta">
                        <span class="t-cat">${t.Categoria}</span>
                        <span>${formatearFecha(t.Fecha)}</span>
                    </div>
                    <div class="t-title">${nombreUnidad} - ${nombreUsuario}</div>
                    <div class="t-desc">${t.Descripcion}</div>
                </div>
                <div class="t-footer">
                    <span class="badge bg-${estadoClean}">${t.Estado || 'Pendiente'}</span>
                    <button class="btn-sec" style="height:30px; font-size:12px; padding:0 10px;" onclick='abrirTicket("${t.ID}")'>Gestión</button>
                </div>
            </div>
            `;
        }).join("");
    }

    /* --- GESTIÓN MODAL --- */
    function abrirTicket(id) {
        const t = DB.Tickets.find(x => x.ID === id);
        if(!t) return;

        // Datos básicos
        document.getElementById("mID").innerText = id.replace("REQ_", "");
        document.getElementById("mCat").innerText = t.Categoria;
        document.getElementById("mDesc").innerText = t.Descripcion;
        
        // Resolver nombres
        const unidad = DB.Unidades.find(u => String(u.ID) === String(t.UnidadID));
        const usuario = DB.Usuarios.find(u => String(u.ID) === String(t.UsuarioID));
        document.getElementById("mUser").innerText = `${usuario ? usuario.Nombre : "Usuario"} (Unidad ${unidad ? unidad.Numero : "?"})`;

        // Foto
        const img = document.getElementById("mFoto");
        if(t.Foto && t.Foto.length > 10) {
            img.src = t.Foto;
            img.style.display = "block";
        } else {
            img.style.display = "none";
        }

        // Formulario
        document.getElementById("ticketID").value = t.ID;
        document.getElementById("ticketEmail").value = usuario ? usuario.Email : "";
        document.getElementById("ticketNombre").value = usuario ? usuario.Nombre : "Residente";
        document.getElementById("ticketUnidad").value = unidad ? unidad.Numero : "";
        
        document.getElementById("mRespuesta").value = ""; // Limpiar nueva respuesta
        document.getElementById("mNuevoEstado").value = t.Estado || "Pendiente";
        
        // Historial (Simulado con RespuestaAdmin actual)
        const historialDiv = document.getElementById("mHistorial");
        if(t.RespuestaAdmin) {
            historialDiv.innerHTML = `<strong>Admin:</strong> ${t.RespuestaAdmin}`;
        } else {
            historialDiv.innerHTML = "<em>Sin respuestas previas.</em>";
        }

        document.getElementById("modalTicket").style.display = "flex";
    }

    function cerrarModal() {
        document.getElementById("modalTicket").style.display = "none";
    }

    /* --- GUARDAR Y RESPONDER --- */
    document.getElementById("formRespuesta").onsubmit = async (e) => {
        e.preventDefault();
        
        if(!confirm("¿Enviar respuesta y actualizar estado?")) return;
        document.getElementById("spinner").style.display = "grid";

        const id = document.getElementById("ticketID").value;
        const nuevaRespuesta = document.getElementById("mRespuesta").value;
        const nuevoEstado = document.getElementById("mNuevoEstado").value;
        const emailUser = document.getElementById("ticketEmail").value;

        try {
            // 1. Guardar en AppSheet
            // Concatenamos respuesta si quieres historial o reemplazamos
            // Aquí reemplazaremos para simplificar, o podrías hacer: old + "\n" + new
            const ticketActual = DB.Tickets.find(t => t.ID === id);
            const respuestaFinal = nuevaRespuesta ? nuevaRespuesta : ticketActual.RespuestaAdmin;

            const payload = {
                "ID": id,
                "Estado": nuevoEstado,
                "RespuestaAdmin": respuestaFinal
            };

            if(typeof appSheetCRUD === 'function') {
                await appSheetCRUD("Reclamos", "Edit", [payload]);
            }

            // 2. Enviar Email al Usuario (Si hay respuesta nueva)
            if(nuevaRespuesta && emailUser) {
                await enviarEmailRespuesta(emailUser, {
                    nombre: document.getElementById("ticketNombre").value,
                    unidad: document.getElementById("ticketUnidad").value,
                    categoria: document.getElementById("mCat").innerText,
                    respuesta: nuevaRespuesta,
                    estado: nuevoEstado
                });
            }

            cerrarModal();
            await cargarDatos(); // Refrescar

        } catch(err) {
            alert("Error: " + err.message);
        } finally {
            document.getElementById("spinner").style.display = "none";
        }
    };

    async function enviarEmailRespuesta(email, datos) {
        if (typeof emailjs === 'undefined') return;

        const htmlBody = `
            <div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:8px;">
                <h2 style="color:#1A2B48;">Actualización de Ticket</h2>
                <p>Estimado(a) <strong>${datos.nombre}</strong>,</p>
                <p>Hemos actualizado el estado de tu solicitud de <strong>${datos.categoria}</strong>.</p>
                
                <div style="background:#f0fdf4; padding:15px; border-left:4px solid #10b981; margin:20px 0;">
                    <p><strong>Respuesta Administración:</strong></p>
                    <p><em>"${datos.respuesta}"</em></p>
                    <p style="margin-top:10px;"><strong>Nuevo Estado:</strong> ${datos.estado.toUpperCase()}</p>
                </div>
                
                <p style="font-size:12px; color:#666;">Santa Josefina SpA</p>
            </div>
        `;

        try {
            await emailjs.send("service_p9hqkqn", "template_80q9psi", {
                to_email: email,
                subject: `Respuesta a Solicitud ${datos.categoria}`,
                html_body: htmlBody
            });
        } catch(e) { console.error("Fallo email", e); }
    }

    function formatearFecha(iso) { 
      if(!iso) return ""; 
      const [y,m,d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }

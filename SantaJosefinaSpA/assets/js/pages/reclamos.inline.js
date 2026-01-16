// ===== Extracted from reclamos.html =====

(function(){
        // IMPORTANTE: Pon tu Public Key aquí si no está en app.js
       if(typeof emailjs !== 'undefined') emailjs.init("7Il4AhmGHchP7qfxu"); 
      })();

let USUARIO = null;
    let TICKETS = [];
    let FILE_BASE64 = "";
    let TICKET_ACTUAL = null;
    
    const ADMIN_EMAIL = "marcos.castro@santajosefinaspa.cl"; 

    // --- INICIALIZACIÓN CORREGIDA ---
    document.addEventListener("DOMContentLoaded", async () => {
        try {
            // CORRECCIÓN: Leer la sesión correcta "sesion_externa"
            const sesionStr = localStorage.getItem("sesion_externa");
            if(!sesionStr) throw new Error("No session");
            
            const sesionObj = JSON.parse(sesionStr);
            // CORRECCIÓN: Extraer los datos reales del usuario
            USUARIO = sesionObj.datos; 
            
            await cargarHistorial();
        } catch(e) {
            console.error("Error sesión:", e);
            window.location.href = "login_residente.html";
        }
    });

    // --- TABS ---
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
      
      if(tab === 'new') {
        document.querySelector('button[onclick="switchTab(\'new\')"]').classList.add('active');
        document.getElementById('viewNew').classList.add('active');
      } else {
        document.querySelector('button[onclick="switchTab(\'history\')"]').classList.add('active');
        document.getElementById('viewHistory').classList.add('active');
        cargarHistorial();
      }
    }

    function previewFile() {
        const file = document.getElementById("fileInput").files[0];
        const box = document.getElementById("uploadArea");
        
        if (file) {
            if(file.size > 2 * 1024 * 1024) {
                alert("La imagen es muy pesada. Máximo 2MB.");
                document.getElementById("fileInput").value = "";
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                FILE_BASE64 = e.target.result; 
                box.classList.add("has-file");
                box.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#10b981; font-size:24px; margin-bottom:5px;"></i><div style="font-size:12px; font-weight:600; color:#065f46;">Imagen lista</div>`;
            };
            reader.readAsDataURL(file);
        }
    }

    // --- 1. ENVIAR RECLAMO (CREAR) ---
    document.getElementById("formTicket").onsubmit = async (e) => {
        e.preventDefault();
        document.getElementById("spinner").style.display = "flex";

        const categoria = document.getElementById("catTicket").value;
        const descripcion = document.getElementById("descTicket").value;
        const idTicket = "REQ_" + Date.now().toString().slice(-6);
        const fechaHoy = new Date().toISOString().split('T')[0];

        const historialInicial = [
            { autor: "user", nombre: USUARIO.Nombre, texto: descripcion, fecha: fechaHoy }
        ];

        const payload = {
            "ID": idTicket,
            "CopropiedadID": String(USUARIO.CopropiedadID || ""),
            "UnidadID": String(USUARIO.UnidadID),
            "UsuarioID": String(USUARIO.ID), // Aseguramos ID correcto
            "Categoria": categoria,
            "Descripcion": descripcion,
            "Foto": FILE_BASE64 || "", 
            "Estado": "Pendiente",
            "Fecha": fechaHoy,
            "RespuestaAdmin": "", 
            "Historial": JSON.stringify(historialInicial)
        };

        try {
            if(typeof appSheetCRUD === 'function') {
                await appSheetCRUD("Reclamos", "Add", [payload]);
            }

            if (typeof notificarNuevoReclamo === 'function') {
                await notificarNuevoReclamo(payload);
            }

            alert("✅ Reclamo enviado correctamente.");
            document.getElementById("formTicket").reset();
            FILE_BASE64 = "";
            switchTab('history');

        } catch(err) {
            const msgError = err.message || JSON.stringify(err);
            alert("Error al enviar: " + msgError);
        } finally {
            document.getElementById("spinner").style.display = "none";
        }
    };

    // --- 2. CARGAR HISTORIAL ---
    async function cargarHistorial() {
        const container = document.getElementById("listaTickets");
        try {
            const data = await fetchData("Reclamos").catch(() => []);
            // Filtro robusto por ID de Unidad
            TICKETS = data.filter(t => String(t.UnidadID) === String(USUARIO.UnidadID));
            TICKETS.sort((a,b) => (a.ID < b.ID) ? 1 : -1);

            if(TICKETS.length === 0) {
                container.innerHTML = '<div style="text-align:center; margin-top:50px; color:#94a3b8;"><i class="fa-regular fa-folder-open" style="font-size:40px; margin-bottom:10px;"></i><br>No tienes tickets registrados.</div>';
                return;
            }

            container.innerHTML = TICKETS.map(t => {
                let statusClass = 'status-' + (t.Estado || 'Pendiente');
                const shortID = t.ID.replace("REQ_", "#");
                const hasReply = t.Historial && t.Historial.includes('"autor":"admin"');

                return `
                <div class="ticket-card ${statusClass}" onclick='abrirDetalle("${t.ID}")'>
                    <div class="t-header">
                        <span class="t-cat">${t.Categoria}</span>
                        <span class="t-date">${formatearFecha(t.Fecha)}</span>
                    </div>
                    <div class="t-desc">${t.Descripcion}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <span class="t-status">${t.Estado || 'Pendiente'}</span>
                        <span style="font-size:10px; color:#cbd5e1;">${shortID}</span>
                    </div>
                    ${hasReply ? '<div style="margin-top:8px; font-size:11px; color:#3b82f6; font-weight:700;"><i class="fa-solid fa-comment-dots"></i> Respuesta disponible</div>' : ''}
                </div>
                `;
            }).join("");

        } catch(e) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:red;">Error cargando historial.</div>';
        }
    }

    // --- 3. DETALLE Y CHAT ---
    function abrirDetalle(id) {
        const t = TICKETS.find(x => x.ID === id);
        if(!t) return;
        TICKET_ACTUAL = t;

        document.getElementById("mdlID").innerText = id.replace("REQ_", "");
        document.getElementById("mdlCat").innerText = t.Categoria;
        document.getElementById("mdlDesc").innerText = t.Descripcion;
        document.getElementById("mdlDate").innerText = formatearFecha(t.Fecha);
        
        const badge = document.getElementById("mdlStatus");
        badge.innerText = t.Estado || "Pendiente";
        badge.className = "t-status"; 
        
        const imgCont = document.getElementById("mdlFotoContainer");
        if(t.Foto && t.Foto.length > 10) {
            imgCont.style.display = "block";
            document.getElementById("mdlFoto").src = t.Foto;
        } else {
            imgCont.style.display = "none";
        }

        // --- RENDER CHAT ---
        const chat = document.getElementById("chatContainer");
        chat.innerHTML = "";
        
        let historial = [];
        try {
            if(t.Historial) {
                historial = typeof t.Historial === 'object' ? t.Historial : JSON.parse(t.Historial);
            }
            if(historial.length === 0 && t.RespuestaAdmin) {
                historial.push({ autor: "admin", nombre: "Administración", texto: t.RespuestaAdmin });
            }
        } catch(e) {
            if(t.RespuestaAdmin) historial.push({ autor: "admin", nombre: "Admin", texto: t.RespuestaAdmin });
        }

        if(historial.length > 0) {
            historial.forEach((msg, idx) => {
                if(idx === 0 && msg.texto === t.Descripcion) return;

                const isMe = msg.autor === 'user';
                chat.innerHTML += `
                    <div class="chat-bubble ${isMe ? 'user' : 'admin'}">
                        <div class="bubble-meta">${msg.nombre || (isMe ? 'Tú' : 'Admin')}</div>
                        ${msg.texto}
                    </div>
                `;
            });
        }

        if(chat.innerHTML === "") {
            chat.innerHTML = `<div style="text-align:center; color:#cbd5e1; font-size:12px; padding:20px;">Sin interacciones adicionales.</div>`;
        }

        const hasAdminReply = historial.some(h => h.autor === 'admin') || t.RespuestaAdmin;
        const footer = document.getElementById("replyFooter");
        
        if (hasAdminReply && t.Estado !== 'Resuelto') {
            footer.style.display = "flex";
        } else {
            footer.style.display = "none";
        }

        document.getElementById("modalTicket").classList.add("active");
        const body = document.getElementById("chatScroll");
        setTimeout(() => body.scrollTop = body.scrollHeight, 100);
    }

    function cerrarModal() {
        document.getElementById("modalTicket").classList.remove("active");
        TICKET_ACTUAL = null;
    }

    // --- 4. RESPONDER EN CHAT ---
    async function enviarRespuestaChat() {
        const input = document.getElementById("replyInput");
        const texto = input.value.trim();
        
        if(!texto) return alert("Escribe un mensaje.");
        if(!TICKET_ACTUAL || !TICKET_ACTUAL.ID) return alert("Error de ticket.");

        document.getElementById("spinner").style.display = "flex";

        try {
            let historial = [];
            if (TICKET_ACTUAL.Historial) {
                try {
                    historial = typeof TICKET_ACTUAL.Historial === 'string' 
                        ? JSON.parse(TICKET_ACTUAL.Historial) 
                        : TICKET_ACTUAL.Historial;
                } catch(e) {
                    if(TICKET_ACTUAL.RespuestaAdmin) {
                        historial.push({autor:"admin", nombre:"Admin", texto:TICKET_ACTUAL.RespuestaAdmin});
                    }
                }
            } else if (TICKET_ACTUAL.RespuestaAdmin) {
                historial.push({autor:"admin", nombre:"Admin", texto:TICKET_ACTUAL.RespuestaAdmin});
            }

            const nuevoMsg = {
                autor: "user",
                nombre: USUARIO.Nombre || "Residente",
                texto: texto,
                fecha: new Date().toISOString()
            };
            historial.push(nuevoMsg);

            const jsonHistorial = JSON.stringify(historial);
            const payload = {
                "ID": String(TICKET_ACTUAL.ID),
                "Historial": jsonHistorial,
                "Estado": "En Proceso"
            };

            if(typeof appSheetCRUD === 'function') {
                await appSheetCRUD("Reclamos", "Edit", [payload]);
            } else {
                throw new Error("No hay conexión con AppSheet.");
            }

            if (typeof emailjs !== 'undefined') {
                const htmlBody = `
                    <div style="font-family:sans-serif; padding:20px; border:1px solid #1A2B48;">
                        <h3>💬 Nueva respuesta de residente</h3>
                        <p><strong>${USUARIO.Nombre}</strong> ha respondido al ticket #${TICKET_ACTUAL.ID}:</p>
                        <p style="background:#f1f5f9; padding:10px;"><em>"${texto}"</em></p>
                        <a href="#">Ir al CRM</a>
                    </div>
                `;
                emailjs.send("service_p9hqkqn", "template_80q9psi", {
                    to_email: ADMIN_EMAIL,
                    subject: `[RESPUESTA] Ticket #${TICKET_ACTUAL.ID}`,
                    html_body: htmlBody
                }).catch(e => console.warn("Email error", e));
            }

            input.value = "";
            TICKET_ACTUAL.Historial = jsonHistorial;
            TICKET_ACTUAL.Estado = "En Proceso";
            abrirDetalle(TICKET_ACTUAL.ID);

        } catch(e) {
            const msg = e.message || JSON.stringify(e);
            alert("Error al enviar respuesta: " + msg);
        } finally {
            document.getElementById("spinner").style.display = "none";
        }
    }

    async function notificarNuevoReclamo(data) {
        if (typeof emailjs === 'undefined') return;
        const htmlBody = `
            <div style="font-family:sans-serif; padding:20px; border:2px solid #1A2B48;">
                <h2>⚠️ Nuevo Reclamo</h2>
                <ul>
                    <li><strong>Categoría:</strong> ${data.Categoria}</li>
                    <li><strong>Residente:</strong> ${USUARIO.Nombre}</li>
                    <li><strong>Unidad:</strong> ${USUARIO.UnidadID}</li>
                </ul>
                <p>${data.Descripcion}</p>
            </div>
        `;
        emailjs.send("service_p9hqkqn", "template_80q9psi", {
            to_email: ADMIN_EMAIL,
            subject: `[TICKET] ${data.Categoria}`,
            html_body: htmlBody
        }).catch(e => console.warn(e));
    }

    function formatearFecha(iso) { 
      if(!iso) return ""; 
      const [y,m,d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }

// ===== Extracted from gestion_reservas.html =====

(function(){
        // Inicializa EmailJS con tu Public Key si no se hace en app.js
         emailjs.init("7Il4AhmGHchP7qfxu");
     })();

// Variables Globales
    let DB = { Reservas:[], Espacios:[], Unidades:[], Bloques:[], Copropiedades:[], Usuarios:[] };
    let VIEW = [];

    document.addEventListener("DOMContentLoaded", async () => {
      try { 
    document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); 
    // AGREGAR ESTA LÍNEA CLAVE:
    if (typeof initHeader === "function") initHeader(); 
} catch(e){}

      try { document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); } catch(e){}
      document.getElementById("filtroFecha").value = new Date().toISOString().split('T')[0];
      await cargarFiltrosIniciales();
    });

    async function cargarFiltrosIniciales() {
        showSpinner(true);
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
        } catch(e) { console.error(e); } finally { showSpinner(false); }
    }

    async function cargarDatos() {
      const idCopro = document.getElementById("filtroCopropiedad").value;
      if(!idCopro) return;

      showSpinner(true);
      try {
        const [res, esp, uni, blo, usu] = await Promise.all([
          fetchData("Reservas").catch(()=>[]),
          fetchData("Espacios").catch(()=>[]), 
          fetchData("Unidades").catch(()=>[]),
          fetchData("Bloques").catch(()=>[]),
          fetchData("Copropietarios").catch(()=>[])
        ]);

        // FILTRADO DE DATOS (Solo de este condominio)
        DB.Reservas = (res || []).filter(r => String(r.CopropiedadID) === String(idCopro));
        DB.Espacios = (esp || []).filter(e => String(e.CopropiedadID) === String(idCopro));
        DB.Unidades = (uni || []).filter(u => String(u.CopropiedadID) === String(idCopro));
        DB.Usuarios = (usu || []).filter(u => String(u.CopropiedadID) === String(idCopro));
        
        // Bloques vinculados a espacios cargados
        const idsEsp = DB.Espacios.map(e => e.ID);
        DB.Bloques = (blo || []).filter(b => idsEsp.includes(b.EspacioID));

        // Llenar filtro espacios header
        const selEspacio = document.getElementById("filtroEspacio");
        selEspacio.innerHTML = '<option value="">(Todos)</option>' + 
          DB.Espacios.map(s => `<option value="${s.ID}">${s.Nombre}</option>`).join("");

        aplicarFiltros();

      } catch(e) {
        console.error(e);
        alert("Error cargando datos: " + e.message);
      } finally { showSpinner(false); }
    }

    function aplicarFiltros() {
      const fecha = document.getElementById("filtroFecha").value;
      const idEspacio = document.getElementById("filtroEspacio").value;
      const estado = document.getElementById("filtroEstado").value;
      const busqueda = document.getElementById("filtroBuscar").value.toLowerCase();

      VIEW = DB.Reservas.filter(r => {
        if(fecha && (!r.Fecha || !r.Fecha.includes(fecha))) return false;
        if(estado && r.Estado !== estado) return false;
        if(idEspacio && String(r.EspacioID) !== String(idEspacio)) return false;

        const uLabel = resolverUnidad(r.UnidadID).toLowerCase();
        const uNombre = resolverUsuario(r.UsuarioID).toLowerCase();
        if(busqueda && !uLabel.includes(busqueda) && !uNombre.includes(busqueda)) return false;

        return true;
      });

      // Ordenar por fecha y bloque
      VIEW.sort((a,b) => String(a.Bloque||"").localeCompare(String(b.Bloque||"")));

      renderTabla();
    }

    function renderTabla() {
      const tb = document.getElementById("tablaReservas");
      if(VIEW.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No hay reservas.</td></tr>';
        return;
      }

      // Detectar conflictos visuales (reservas confirmadas mismo bloque)
      const conflictMap = {};
      VIEW.forEach(r => {
        if(r.Estado === 'Rechazada' || r.Estado === 'Cancelada') return;
        const key = `${r.Fecha}_${r.EspacioID}_${r.Bloque}`;
        conflictMap[key] = (conflictMap[key] || 0) + 1;
      });

      tb.innerHTML = VIEW.map(r => {
        const uLabel = resolverUnidad(r.UnidadID);
        const uNombre = resolverUsuario(r.UsuarioID);
        const espacioObj = DB.Espacios.find(e => String(e.ID) === String(r.EspacioID));
        const nombreEspacio = espacioObj ? espacioObj.Nombre : "---";
        
        // Resolver Bloque
        const bloqueObj = DB.Bloques.find(b => b.ID === r.Bloque);
        const bloqueLabel = bloqueObj ? `${bloqueObj.Nombre} (${bloqueObj.HoraInicio}-${bloqueObj.HoraFin})` : r.Bloque;

        const stPago = r.EstadoPago || "Pendiente";
        const stPagoClass = stPago === 'Pagado' ? 'pay-Pagado' : 'pay-Pendiente';

        // Conflicto visual
        const key = `${r.Fecha}_${r.EspacioID}_${r.Bloque}`;
        const isConflict = (conflictMap[key] > 1 && r.Estado !== 'Rechazada');
        const rowClass = isConflict ? "conflict-row" : "";
        const conflictHtml = isConflict ? `<span class="conflict-msg"><i class="fa-solid fa-triangle-exclamation"></i> Tope</span>` : "";

        let acciones = "";
        if(r.Estado === 'Pendiente') {
          acciones = `
            <button class="btn-icon btn-approve" onclick="cambiarEstado('${r.ID}', 'Confirmada')" title="Aprobar"><i class="fa-solid fa-check"></i></button>
            <button class="btn-icon btn-reject" onclick="cambiarEstado('${r.ID}', 'Rechazada')" title="Rechazar"><i class="fa-solid fa-xmark"></i></button>
          `;
        } else if (r.Estado === 'Confirmada') {
           acciones = `<button class="btn-icon btn-reject" onclick="cambiarEstado('${r.ID}', 'Rechazada')" title="Cancelar/Rechazar"><i class="fa-solid fa-ban"></i></button>`;
        }
        acciones += `<button class="btn-icon btn-delete" onclick="eliminarReserva('${r.ID}')"><i class="fa-solid fa-trash"></i></button>`;

        return `
          <tr class="${rowClass}">
            <td>
                <div style="font-weight:700;">${formatearFecha(r.Fecha)}</div>
                <div style="color:#64748b; font-size:12px;">${bloqueLabel}</div>
                ${conflictHtml}
            </td>
            <td>${nombreEspacio}</td> 
            <td>
                <div style="font-weight:600; color:#1e293b;">${uNombre}</div>
                <div style="font-size:12px; color:#64748b;">${uLabel}</div>
            </td>
            <td>
                <div style="font-weight:600;">${clp(r.Costo)}</div>
                ${r.Garantia > 0 ? `<div style="font-size:11px; color:#64748b;">+${clp(r.Garantia)} Gar.</div>` : ''}
                <span class="${stPagoClass}">${stPago}</span>
            </td>
            <td><span class="badge st-${r.Estado}">${r.Estado}</span></td>
            <td style="text-align:right;">${acciones}</td>
          </tr>
        `;
      }).join("");
    }

    /* --- LÓGICA MODAL SEGURA (SafeSet) --- */
    function safeSet(id, valor) {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'date' && valor instanceof Date) {
                el.valueAsDate = valor;
            } else {
                el.value = valor;
            }
        }
    }

    function abrirModalReserva() {
        try {
            const idCopro = document.getElementById("filtroCopropiedad").value;
            if(!idCopro || !DB.Copropiedades.length) {
                return alert("Selecciona una comunidad válida primero.");
            }
            
            const copro = DB.Copropiedades.find(c => String(c.ID) === String(idCopro));
            
            // Reset Formulario
            document.getElementById("formReserva").reset();
            safeSet("rID", "");
            safeSet("rCopropiedadID", idCopro);
            safeSet("rCopropiedadNombre", copro ? copro.Nombre : "---");
            safeSet("rFecha", new Date());
            
            // Limpiar campos monetarios
            safeSet("rCosto", "");
            safeSet("rGarantia", "");

            // 1. Llenar Residentes
            const usuariosLocales = DB.Usuarios.filter(u => String(u.CopropiedadID) === String(idCopro));
            usuariosLocales.sort((a,b) => String(a.Nombre||"").localeCompare(String(b.Nombre||"")));
            
            const selUser = document.getElementById("rUsuarioID");
            if(selUser) {
                selUser.innerHTML = '<option value="">Seleccione Residente...</option>' + 
                    usuariosLocales.map(u => `<option value="${u.ID}" data-unidad="${u.UnidadID||''}">${u.Nombre}</option>`).join("");
            }

            // 2. Llenar Unidades
            const unidadesLocales = DB.Unidades.filter(u => String(u.CopropiedadID) === String(idCopro));
            unidadesLocales.sort((a,b) => String(a.Numero||"").localeCompare(String(b.Numero||""), undefined, {numeric: true}));
            
            const selUni = document.getElementById("rUnidadID");
            if(selUni) {
                selUni.innerHTML = '<option value="">Seleccione Unidad...</option>' + 
                    unidadesLocales.map(u => `<option value="${u.ID}">${u.Numero} ${u.Torre ? '('+u.Torre+')' : ''}</option>`).join("");
            }

            // 3. Llenar Espacios
            const espaciosDisp = DB.Espacios.filter(e => 
                String(e.CopropiedadID) === String(idCopro) && 
                e.Estado !== 'Inactivo'
            );
            
            const selEsp = document.getElementById("rEspacioID");
            if(selEsp) {
                if(espaciosDisp.length > 0) {
                    selEsp.innerHTML = '<option value="">Seleccione Espacio...</option>' + 
                        espaciosDisp.map(e => `<option value="${e.ID}" data-costo="${e.Costo||0}" data-garantia="${e.Garantia||0}">${e.Nombre}</option>`).join("");
                } else {
                    selEsp.innerHTML = '<option value="">(No hay espacios creados)</option>';
                }
            }
            
            // Reset UI Bloques
            const selBloque = document.getElementById("rBloque");
            if(selBloque) {
                selBloque.innerHTML = '<option value="">(Selecciona Espacio y Fecha)</option>';
                selBloque.disabled = true;
            }
            const msgBloque = document.getElementById("msgBloques");
            if(msgBloque) msgBloque.style.display = 'none';

            document.getElementById("modalReserva").style.display = "flex";

        } catch(err) {
            console.error("Error en abrirModalReserva:", err);
            alert("Ocurrió un error al abrir el formulario. Revisa la consola.");
        }
    }

    function autoSeleccionarUnidad() {
        const selUser = document.getElementById("rUsuarioID");
        const unidadID = selUser.options[selUser.selectedIndex].getAttribute("data-unidad");
        if(unidadID) safeSet("rUnidadID", unidadID);
    }

    function alCambiarEspacio() {
        const selEsp = document.getElementById("rEspacioID");
        if(selEsp.selectedIndex < 0) return;
        
        const opt = selEsp.options[selEsp.selectedIndex];
        const costo = opt.getAttribute("data-costo") || "0";
        const garantia = opt.getAttribute("data-garantia") || "0";
        
        safeSet("rCosto", costo);
        safeSet("rGarantia", garantia);

        cargarBloquesDisponibles();
    }

    function cargarBloquesDisponibles() {
        const idEspacio = document.getElementById("rEspacioID").value;
        const fecha = document.getElementById("rFecha").value;
        const selBloques = document.getElementById("rBloque");
        const msg = document.getElementById("msgBloques");

        if(!idEspacio || !fecha) return;

        const bloquesPosibles = DB.Bloques.filter(b => String(b.EspacioID) === String(idEspacio));
        
        const ocupados = DB.Reservas.filter(r => 
            String(r.EspacioID) === String(idEspacio) && 
            r.Fecha === fecha && 
            r.Estado !== 'Rechazada' && r.Estado !== 'Cancelada'
        ).map(r => String(r.Bloque));

        const disponibles = bloquesPosibles.filter(b => !ocupados.includes(String(b.ID)));

        if(disponibles.length > 0) {
            disponibles.sort((a,b) => String(a.HoraInicio||"").localeCompare(String(b.HoraInicio||"")));
            selBloques.innerHTML = disponibles.map(b => `<option value="${b.ID}">${b.Nombre} (${b.HoraInicio}-${b.HoraFin})</option>`).join("");
            selBloques.disabled = false;
            msg.style.display = 'none';
        } else {
            selBloques.innerHTML = '<option value="">-- Agotado --</option>';
            selBloques.disabled = true;
            msg.style.display = 'block';
        }
    }

    document.getElementById("formReserva").onsubmit = async (e) => {
        e.preventDefault();
        const bloqueVal = document.getElementById("rBloque").value;
        if(!bloqueVal) return alert("Selecciona un horario disponible.");

        showSpinner(true);
        
        const payload = {
            "ID": "RES_" + Date.now(),
            "CopropiedadID": document.getElementById("rCopropiedadID").value,
            "UnidadID": document.getElementById("rUnidadID").value,
            "UsuarioID": document.getElementById("rUsuarioID").value,
            "EspacioID": document.getElementById("rEspacioID").value,
            "Fecha": document.getElementById("rFecha").value,
            "Bloque": bloqueVal,
            "Estado": document.getElementById("rEstado").value,
            "Costo": document.getElementById("rCosto").value,
            "Garantia": document.getElementById("rGarantia").value,
            "EstadoPago": document.getElementById("rEstadoPago").value,
            "Notas": document.getElementById("rNotas").value,
            "FechaCreacion": new Date().toISOString()
        };

        try {
            if(typeof appSheetCRUD === 'function') await appSheetCRUD("Reservas", "Add", [payload]);
            document.getElementById("modalReserva").style.display = "none";
            await cargarDatos(); 
        } catch(err) { alert(err.message); } finally { showSpinner(false); }
    };

    /* --- EMAIL Y ESTADOS --- */
    async function cambiarEstado(id, nuevoEstado) {
      if(!confirm(`¿Marcar reserva como ${nuevoEstado} y notificar?`)) return;
      showSpinner(true);
      
      try {
        const reserva = DB.Reservas.find(r => r.ID === id);
        if (!reserva) throw new Error("Reserva no encontrada");

        // 1. Obtener Datos Relacionados
        const unidad = DB.Unidades.find(u => String(u.ID) === String(reserva.UnidadID));
        let emailDestino = null;
        let nombreResidente = "Residente";

        if (reserva.UsuarioID) {
            const usuario = DB.Usuarios.find(u => String(u.ID) === String(reserva.UsuarioID));
            if (usuario) {
                nombreResidente = usuario.Nombre;
                emailDestino = usuario.Email;
            }
        } else if (unidad) {
            // Fallback si no hay UsuarioID
            nombreResidente = unidad.Nombre || "Residente";
            emailDestino = unidad.Email;
        }

        const espacio = DB.Espacios.find(e => String(e.ID) === String(reserva.EspacioID));
        const nombreEspacio = espacio ? espacio.Nombre : "Espacio Común";
        
        let nombreComunidad = "Condominio";
        const copro = DB.Copropiedades.find(c => String(c.ID) === String(reserva.CopropiedadID));
        if (copro) nombreComunidad = copro.Nombre;

        const bloqueObj = DB.Bloques.find(b => b.ID === reserva.Bloque);
        const textoBloque = bloqueObj ? `${bloqueObj.Nombre} (${bloqueObj.HoraInicio} - ${bloqueObj.HoraFin})` : "Horario definido";

        // 2. Guardar en AppSheet
        if(typeof appSheetCRUD === 'function') {
          await appSheetCRUD("Reservas", "Edit", [{ "ID": id, "Estado": nuevoEstado }]);
        }

        // 3. Enviar Correo
        if(emailDestino && typeof enviarEmailAPI === 'function') {
            const asunto = `${nuevoEstado}: Reserva ${nombreEspacio}`;
            const cuerpoHTML = generarPlantillaEmail({
                estado: nuevoEstado,
                residente: nombreResidente,
                unidad: unidad ? unidad.Numero : "S/N",
                espacio: nombreEspacio,
                comunidad: nombreComunidad,
                fecha: reserva.Fecha,
                bloque: textoBloque
            });
            await enviarEmailAPI(emailDestino, asunto, cuerpoHTML);
        }

        await cargarDatos(); 

      } catch(e) {
        console.error(e);
        alert("Error: " + e.message);
      } finally {
        showSpinner(false);
      }
    }

    function generarPlantillaEmail(datos) {
      const esAprobado = datos.estado === 'Confirmada';
      const color = esAprobado ? '#10b981' : '#ef4444';
      const titulo = esAprobado ? '¡Solicitud Aprobada!' : 'Solicitud Rechazada';
      const textoIntro = esAprobado 
        ? 'Nos complace informarle que su solicitud de reserva ha sido aprobada.' 
        : 'Lamentamos informarle que su solicitud de reserva no ha podido ser cursada en esta ocasión.';

      // Formatear fecha
      const fechaParts = datos.fecha.split("-"); // YYYY-MM-DD
      const fechaTexto = `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;

      return `
        <div style="background-color: #f4f4f7; padding: 30px; font-family: sans-serif; color: #51545E;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="background-color: #1A2B48; padding: 25px; text-align: center;">
               <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Gestión de Reservas</h2>
               <div style="color: #aeb4c1; font-size: 13px; margin-top: 5px;">${datos.comunidad}</div>
            </div>
            <div style="padding: 40px 30px;">
               <h1 style="color: #333; font-size: 24px; margin-top: 0; text-align:center;">${titulo}</h1>
               <p style="font-size: 16px; line-height: 1.5;">
                 Estimado(a) <strong>${datos.residente}</strong>,<br>
                 Unidad <strong>${datos.unidad}</strong>.
               </p>
               <p style="font-size: 15px; line-height: 1.5; color: #555;">${textoIntro}</p>
               <div style="background-color: #f8fafc; border-left: 5px solid ${color}; padding: 20px; margin: 25px 0; border-radius: 4px;">
                  <table style="width: 100%;">
                    <tr><td style="padding: 5px 0; font-weight: bold; width: 100px;">Espacio:</td><td>${datos.espacio}</td></tr>
                    <tr><td style="padding: 5px 0; font-weight: bold;">Fecha:</td><td>${fechaTexto}</td></tr>
                    <tr><td style="padding: 5px 0; font-weight: bold;">Horario:</td><td>${datos.bloque}</td></tr>
                    <tr><td style="padding: 5px 0; font-weight: bold;">Estado:</td><td style="color: ${color}; font-weight: bold; text-transform: uppercase;">${datos.estado}</td></tr>
                  </table>
               </div>
               <p style="font-size: 13px; color: #888; text-align: center;">Para más detalles, ingrese al Portal de Residentes.</p>
            </div>
            <div style="background-color: #f4f4f7; padding: 20px; text-align: center; font-size: 12px; color: #999;">
               <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${datos.comunidad}.</p>
            </div>
          </div>
        </div>
      `;
    }

    async function enviarEmailAPI(to, subject, htmlBody) {
      if (typeof emailjs === 'undefined') return console.error("EmailJS no cargado");
      try {
          await emailjs.send('service_p9hqkqn', 'template_80q9psi', {
              to_email: to,
              subject: subject,
              html_body: htmlBody 
          });
          console.log(">>> Email enviado.");
      } catch (error) {
          console.error(">>> Error EmailJS:", error);
          alert("Reserva actualizada, pero falló el envío del correo.");
      }
    }

    async function eliminarReserva(id) {
      if(!confirm("¿Eliminar registro?")) return;
      showSpinner(true);
      try {
        if(typeof appSheetCRUD === 'function') await appSheetCRUD("Reservas", "Delete", [{ "ID": id }]);
        await cargarDatos();
      } catch(e) { alert("Error: " + e.message); } finally { showSpinner(false); }
    }

    /* HELPERS */
    function resolverUnidad(id) {
      const u = DB.Unidades.find(x => String(x.ID) === String(id));
      return u ? (u.Numero + (u.Torre ? ` (${u.Torre})` : '')) : (id || "---");
    }
    function resolverUsuario(id) {
      const u = DB.Usuarios.find(x => String(x.ID) === String(id));
      return u ? u.Nombre : "---";
    }
    function formatearFecha(iso) { 
      if(!iso) return ""; 
      const [y,m,d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }
    function clp(v) { return "$" + new Intl.NumberFormat("es-CL").format(Number(v) || 0); }
    function showSpinner(show) { document.getElementById("spinner").style.display = show ? "grid" : "none"; }

// ===== Extracted from prospectos.html =====

/* ===== Utilidades ===== */
      function showSpinner(msg) {
        const sp = document.getElementById("pageSpinner");
        if (msg) document.getElementById("spinnerText").textContent = msg;
        sp.style.display = "grid";
      }
      function hideSpinner() {
        document.getElementById("pageSpinner").style.display = "none";
      }
      function norm(s) {
        return (s || "")
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      }
      function getKeyVal(o) {
        return o.ID || o.id || "";
      }

      /* ===== Estado ===== */
      let PROS = [],
        VIEW = [],
        TARIFAS = [],
        AGENTES_LISTA = [],
        CURRENT_PROS_ID = null;

     /* ===== Boot ===== */
      document.addEventListener("DOMContentLoaded", async () => {
        // 1. Cargar Header y Footer
        try { 
            document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); 
            if (typeof initHeader === 'function') initHeader();
        } catch (e) {}
        
        try { 
            document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); 
        } catch (e) {}
        
        // 2. Iniciar Eventos y Datos
        bindUI();
        await cargarTodo();

        // 3. LÓGICA DE FOCO (NUEVO)
        // Verificar si venimos desde el Buzón Web con un ID específico
        const params = new URLSearchParams(window.location.search);
        const focusId = params.get('id');

        if (focusId) {
            // Buscar el prospecto en memoria
            const target = PROS.find(p => String(p.ID) === String(focusId));
            
            if (target) {
                // A. Forzar la vista solo a este registro
                VIEW = [target];
                renderTabla();
                
                // B. Limpiar filtros visuales para evitar confusión
                document.getElementById("inpBuscar").value = ""; 
                
                // C. Abrir automáticamente el Modal de Edición para asignar agente
                abrirFormProspecto(target.ID, target._tipo);
                
                // Opcional: Limpiar la URL para que al recargar no se abra de nuevo
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                console.warn("ID de URL no encontrado en la base de datos.");
            }
        }
      });

      function bindUI() {
        document
          .getElementById("btnNew")
          .addEventListener("click", () => abrirFormProspecto());
        document
          .getElementById("btnReload")
          .addEventListener("click", cargarTodo);
        document
          .getElementById("inpBuscar")
          .addEventListener("input", aplicarFiltros);
        document
          .getElementById("selTipo")
          .addEventListener("change", aplicarFiltros);
        document
          .getElementById("selComuna")
          .addEventListener("change", aplicarFiltros);
      }

      /* ===== Carga de Datos ===== */
      async function cargarTodo() {
        showSpinner("Cargando datos...");
        try {
          // 1. Cargar Tablas
          const [adminData, corretajeData, tarifas, agentes] =
            await Promise.all([
              fetchData("ProspectosCopro").catch(() => []),
              fetchData("ProspectosCorretaje").catch(() => []),
              fetchData("TablaTarifas").catch(() => []),
              fetchData("Agentes").catch(() => []),
            ]);

          TARIFAS = tarifas || [];
          AGENTES_LISTA = agentes || [];

          // 2. Llenar el Selector de Agentes
          const selAgente = document.getElementById("prosAgente");
          selAgente.innerHTML =
            '<option value="Sin Asignar">-- Sin Asignar --</option>';
          AGENTES_LISTA.forEach((ag) => {
            selAgente.innerHTML += `<option value="${ag.Nombre}">${ag.Nombre}</option>`;
          });

          // 3. Unificar Listas
          const listA = adminData.map((p) => ({
            ...p,
            _tipo: "Administracion",
            _tabla: "ProspectosCopro",
            Contacto: p.Contacto || p.Email || "",
          }));

          const listB = corretajeData.map((p) => ({
            ...p,
            _tipo: "Corretaje",
            _tabla: "ProspectosCorretaje",
            Contacto: p.Email || p.Telefono || "",
          }));

          PROS = [...listA, ...listB];

          // 4. Llenar Comunas
          const comunasReales = PROS.map((p) => p.Comuna).filter(Boolean);
          const comunasTarifas = TARIFAS.map((t) => t.Comuna).filter(Boolean);
          const todasComunas = [
            ...new Set([...comunasReales, ...comunasTarifas]),
          ].sort();

          document.getElementById("selComuna").innerHTML =
            '<option value="">(Todas)</option>' +
            todasComunas
              .map((c) => `<option value="${c}">${c}</option>`)
              .join("");
          document.getElementById("dlComunas").innerHTML = todasComunas
            .map((c) => `<option value="${c}">`)
            .join("");

          aplicarFiltros();
        } catch (e) {
          console.error(e);
          alert("Error cargando datos");
        } finally {
          hideSpinner();
        }
      }

      function aplicarFiltros() {
        const q = norm(document.getElementById("inpBuscar").value);
        const tipoFilter = document.getElementById("selTipo").value;
        const comunaFilter = document.getElementById("selComuna").value;

        VIEW = PROS.filter((p) => {
          if (tipoFilter && p._tipo !== tipoFilter) return false;
          if (comunaFilter && p.Comuna !== comunaFilter) return false;
          if (!q) return true;
          return [p.Nombre, p.Comuna, p.Estado, p.Direccion, p.Email].some(
            (v) => norm(v).includes(q)
          );
        });

        renderTabla();
      }

      /* ===== RENDER TABLA COMPLETO ===== */
      function renderTabla() {
        const tbody = document.getElementById("tablaProspectos");
        if (VIEW.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="6" class="muted">Sin resultados.</td></tr>';
          return;
        }

        tbody.innerHTML = VIEW.map((p) => {
          let badgeClass = "st-nuevo";
          const est = (p.Estado || "").toLowerCase();
          if (est.includes("ganado") || est.includes("firmado"))
            badgeClass = "st-ganado";
          else if (est.includes("negociación")) badgeClass = "st-negociacion";
          else if (est.includes("volante")) badgeClass = "st-volantes";
          else if (est.includes("propuesta")) badgeClass = "st-propuesta";
          else if (est.includes("perdido")) badgeClass = "st-perdido";
          else if (est.includes("contactado")) badgeClass = "st-contactado";

          const tipoBadge =
            p._tipo === "Administracion"
              ? '<span class="badge-type type-admin"><i class="fa-solid fa-building"></i> Admin</span>'
              : '<span class="badge-type type-corretaje"><i class="fa-solid fa-house-user"></i> Corretaje</span>';

          const origenBadge =
            p.Canal === "Web Landing"
              ? '<span style="font-size:9px; background:#dbeafe; color:#1e40af; padding:2px 5px; border-radius:4px; margin-left:5px; font-weight:700;">WEB</span>'
              : "";

          // Lógica Agente
          const agenteNombre =
            p.Agente && p.Agente !== "Asignar" && p.Agente !== "Sin Asignar"
              ? p.Agente
              : null;
          const displayAgente = agenteNombre
            ? `<div style="font-size:11px; color:#15803d; font-weight:600;"><i class="fa-solid fa-user-check"></i> ${agenteNombre}</div>`
            : `<button onclick="abrirFormProspecto('${p.ID}', '${p._tipo}')" style="font-size:10px; padding:2px 6px; background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-user-plus"></i> Asignar</button>`;

          const esAdmin = p._tipo === "Administracion";
          const esCorretaje = p._tipo === "Corretaje";

          // Botones Condicionales
          const btnMigrar = esCorretaje
            ? `<button class="btn-icon" onclick="migrarAAdmin('${p.ID}')" title="Mover a Admin" style="background:#fff7ed; color:#c2410c; border:1px solid #fed7aa;"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>`
            : "";
          const btnConvertir = esAdmin
            ? `<button class="btn-icon btn-cliente" onclick="agregarAClientes('${p.ID}')" title="Convertir a Cliente" style="background:#dcfce7; color:#166534; border:1px solid #86efac;"><i class="fa-solid fa-check-double"></i></button>`
            : "";
          const btnCotizar = esAdmin
            ? `<button class="btn-icon btn-cotizar" onclick="abrirCotizacion('${p.ID}')" title="Cotizar" style="background:#e0e7ff; color:#3730a3;"><i class="fa-solid fa-file-invoice-dollar"></i></button>`
            : "";

          return `
                <tr>
                    <td>
                        <div style="font-weight:600;">${
                          p.Nombre || "Sin Nombre"
                        } ${origenBadge}</div>
                        <span class="badge-status ${badgeClass}">${
            p.Estado || "Nuevo"
          }</span>
                        <div style="margin-top:4px;">${displayAgente}</div>
                    </td>
                    <td style="width:100px;">${tipoBadge}</td>
                    <td style="font-size:13px;">${p.Direccion || "—"}</td>
                    <td>${p.Comuna || "—"}</td>
                    <td style="font-size:13px;">
                        <div style="margin-bottom:2px;"><i class="fa-regular fa-envelope" style="color:#94a3b8; width:14px;"></i> ${
                          p.Email || "-"
                        }</div>
                        <div><i class="fa-solid fa-phone" style="color:#94a3b8; width:14px;"></i> ${
                          p.Telefono || "-"
                        }</div>
                    </td>
                    <td class="no-print">
                        <div style="display:flex; gap:5px; flex-wrap:wrap;">
                            <button class="btn-icon btn-ver" onclick="abrirDetalle('${
                              p.ID
                            }')" title="Ver"><i class="fa-solid fa-eye"></i></button>
                            <button class="btn-icon btn-editar" onclick="abrirFormProspecto('${
                              p.ID
                            }', '${
            p._tipo
          }')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon btn-mapa" onclick="abrirMapa('${
                              p.ID
                            }')" title="Mapa" style="background:#f1f5f9;"><i class="fa-solid fa-map-location-dot"></i></button>
                            <button class="btn-icon" onclick="abrirBitacora('${
                              p.ID
                            }')" title="Bitácora" style="background:#e0f2fe; color:#0369a1;"><i class="fa-solid fa-clock-rotate-left"></i></button>
                            ${btnCotizar}
                            ${btnMigrar}
                            ${btnConvertir}
                            <button class="btn-icon btn-eliminar" onclick="eliminarProspecto('${
                              p.ID
                            }')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
      }

      /* ===== Modal y Guardado ===== */
      function setTipo(tipo) {
        document.getElementById("prosTipoNegocio").value = tipo;
        document
          .getElementById("btnTipoAdmin")
          .classList.toggle("active", tipo === "Administracion");
        document
          .getElementById("btnTipoCorretaje")
          .classList.toggle("active", tipo === "Corretaje");

        if (tipo === "Administracion") {
          document.getElementById("camposAdmin").classList.remove("hidden");
          document.getElementById("camposCorretaje").classList.add("hidden");
        } else {
          document.getElementById("camposAdmin").classList.add("hidden");
          document.getElementById("camposCorretaje").classList.remove("hidden");
        }
      }

      function abrirFormProspecto(id, tipoExistente) {
        const form = document.getElementById("formProspecto");
        form.reset();
        document.getElementById("prospectoID").value = "";

        if (id) {
          const p = PROS.find((item) => String(item.ID) === String(id));
          if (!p) return;

          document.getElementById("prospectoID").value = p.ID;
          setTipo(tipoExistente || p._tipo || "Administracion");

          document.getElementById("prosNombre").value = p.Nombre || "";
          document.getElementById("prosEstado").value = p.Estado || "Nuevo";
          document.getElementById("prosTelefono").value = p.Telefono || "";
          document.getElementById("prosEmail").value = p.Email || "";
          document.getElementById("prosDireccion").value = p.Direccion || "";
          document.getElementById("prosComuna").value = p.Comuna || "";
          document.getElementById("prosNotas").value = p.Observaciones || "";

          // Asignar Agente
          document.getElementById("prosAgente").value =
            p.Agente || "Sin Asignar";

          if (p._tipo === "Administracion") {
            document.getElementById("prosUnidades").value = p.Unidades || "";
            document.getElementById("prosRUT").value = p.RUT || "";
          } else {
            document.getElementById("prosOperacion").value =
              p["Tipo Operacion"] || "Venta";
            document.getElementById("prosTipoProp").value =
              p["Tipo Propiedad"] || "";
            document.getElementById("prosPresupuesto").value =
              p["Presupuesto"] || "";
          }
        } else {
          setTipo("Administracion");
          document.getElementById("prosAgente").value = "Sin Asignar";
        }

        document.getElementById("modalProspecto").classList.add("active");
      }

      function cerrarModalProspecto() {
        document.getElementById("modalProspecto").classList.remove("active");
      }

      /* GEOCODIFICACIÓN */
      async function intentarGeocodificar() {
        const dir = document.getElementById("prosDireccion").value;
        const com = document.getElementById("prosComuna").value;
        const msg = document.getElementById("msgGeo");
        const latLongField = document.getElementById("prosLatLong");

        if (dir.length < 5) return;

        const query = `${dir}, ${com}, Chile`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}`
          );
          const data = await res.json();
          if (data && data.length > 0) {
            latLongField.value = `${data[0].lat}, ${data[0].lon}`;
            msg.style.display = "block";
            msg.innerHTML = `<i class="fa-solid fa-check"></i> Ubicación OK`;
          } else {
            msg.style.display = "none";
            latLongField.value = "";
          }
        } catch (e) {}
      }

      /* SUBMIT */
      document.getElementById("formProspecto").onsubmit = async (e) => {
        e.preventDefault();

        const id = document.getElementById("prospectoID").value;
        const tipo = document.getElementById("prosTipoNegocio").value;
        const agente = document.getElementById("prosAgente").value;

        let tablaDestino = "";
        let payload = {};

        if (tipo === "Administracion") {
          tablaDestino = "ProspectosCopro";
          const nuevoID = id || "PROS_" + Date.now();
          payload = {
            ID: nuevoID,
            Nombre: document.getElementById("prosNombre").value,
            Comuna: document.getElementById("prosComuna").value,
            Unidades: document.getElementById("prosUnidades").value,
            Direccion: document.getElementById("prosDireccion").value,
            RUT: document.getElementById("prosRUT").value,
            Contacto: document.getElementById("prosNombre").value,
            Estado: document.getElementById("prosEstado").value,
            Telefono: document.getElementById("prosTelefono").value,
            Tipo: "Administracion",
            Email: document.getElementById("prosEmail").value,
            Observaciones: document.getElementById("prosNotas").value,
            Agente: agente,
            "Fecha Registro": new Date().toISOString().split("T")[0],
          };
          const geo = document.getElementById("prosLatLong").value;
          if (geo) payload["LatLong"] = geo;
        } else {
          tablaDestino = "ProspectosCorretaje";
          const nuevoID = id || "PCOR_" + Date.now();
          payload = {
            ID: nuevoID,
            Estado: document.getElementById("prosEstado").value,
            Nombre: document.getElementById("prosNombre").value,
            Telefono: document.getElementById("prosTelefono").value,
            Email: document.getElementById("prosEmail").value,
            Direccion: document.getElementById("prosDireccion").value,
            Comuna: document.getElementById("prosComuna").value,
            "Tipo Operacion": document.getElementById("prosOperacion").value,
            "Tipo Propiedad": document.getElementById("prosTipoProp").value,
            Presupuesto: document.getElementById("prosPresupuesto").value,
            Observaciones: document.getElementById("prosNotas").value,
            Agente: agente,
            "Fecha Registro": new Date().toISOString().split("T")[0],
            Canal: "CRM Web",
          };
        }

        console.log("Guardando en:", tablaDestino, payload);

        try {
          showSpinner("Guardando...");
          if (typeof appSheetCRUD === "function") {
            const action = id ? "Edit" : "Add";
            await appSheetCRUD(tablaDestino, action, [payload]);
          }
          cerrarModalProspecto();
          await cargarTodo();
          alert("Guardado exitoso");
        } catch (err) {
          alert("Error al guardar: " + err.message);
        } finally {
          hideSpinner();
        }
      };

      /* ELIMINAR */
      async function eliminarProspecto(id) {
        if (!confirm("¿Eliminar este prospecto?")) return;
        const p = PROS.find((item) => String(item.ID) === String(id));
        if (!p) return;

        try {
          showSpinner("Eliminando...");
          await appSheetCRUD(p._tabla, "Delete", [{ ID: id }]);
          await cargarTodo();
        } catch (err) {
          alert("Error al eliminar: " + err.message);
        } finally {
          hideSpinner();
        }
      }

      /* MAPA */
      function abrirMapa(id) {
        const p = PROS.find((x) => String(x.ID) === String(id));
        if (!p) return;

        const lat = p.LatLong || p.Coordenadas || "";
        if (lat && lat.includes(",")) {
          window.open(
            `https://www.google.com/maps/search/?api=1&query=${lat.replace(
              /\s/g,
              ""
            )}`,
            "_blank"
          );
        } else if (p.Direccion) {
          window.open(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              p.Direccion + ", " + p.Comuna
            )}`,
            "_blank"
          );
        } else {
          alert("Sin dirección ni coordenadas.");
        }
      }

      /* DETALLE */
      function abrirDetalle(id) {
        const p = PROS.find((i) => String(i.ID) === String(id));
        if (!p) return;
        document.getElementById("detalleContenido").innerHTML = `
            <p><b>ID:</b> ${p.ID}</p>
            <p><b>Nombre:</b> ${p.Nombre}</p>
            <p><b>Tipo:</b> ${p._tipo}</p>
            <p><b>Agente:</b> ${p.Agente || "Sin Asignar"}</p>
            <p><b>Email:</b> ${p.Email || "-"}</p>
            <p><b>Tel:</b> ${p.Telefono || "-"}</p>
            <p><b>Dirección:</b> ${p.Direccion || "-"} (${p.Comuna})</p>
            <p><b>Observaciones:</b> ${p.Observaciones || "-"}</p>
            ${
              p._tipo === "Corretaje"
                ? `<p><b>Operación:</b> ${p["Tipo Operacion"] || "-"} (${
                    p.Presupuesto || "-"
                  })</p>`
                : ""
            }
          `;
        document.getElementById("modalDetalle").classList.add("active");
      }

      /* BITÁCORA */
      async function abrirBitacora(id) {
        CURRENT_PROS_ID = id;
        document.getElementById("modalBitacora").classList.add("active");
        document.getElementById("bitFecha").valueAsDate = new Date();

        const allBits = await fetchData("Bitacora").catch(() => []);
        const history = allBits.filter(
          (h) => String(h.ProspectoID) === String(id)
        );
        history.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

        const container = document.getElementById("timelineContainer");
        if (!history.length)
          container.innerHTML =
            '<p class="muted" style="text-align:center; padding:20px;">Sin registros</p>';
        else
          container.innerHTML =
            `<div class="timeline">` +
            history
              .map(
                (h) => `
            <div class="timeline-item">
                <div class="timeline-dot ${h.Tipo}"></div>
                <div class="timeline-date">${h.Fecha}</div>
                <div class="timeline-content"><span class="timeline-type">${h.Tipo}</span> ${h.Nota}</div>
            </div>`
              )
              .join("") +
            `</div>`;
      }

      async function guardarBitacora() {
        const nota = document.getElementById("bitNota").value;
        if (!nota) return alert("Escribe una nota");

        // Obtener nombre del usuario actual
        let usuarioActual = "Admin";
        try {
            const auth = getAuthUser(); // Función global de app.js
            if(auth && auth.nombre) usuarioActual = auth.nombre;
        } catch(e) {}

        const payload = {
          "ID": "BIT_" + Date.now(),
          "ProspectoID": CURRENT_PROS_ID,
          "Fecha": document.getElementById("bitFecha").value,
          "Tipo": document.getElementById("bitTipo").value,
          "Nota": nota,
          "Usuario": usuarioActual // <--- CAMBIO AQUÍ
        };

        try {
            await appSheetCRUD("Bitacora", "Add", [payload]);
            abrirBitacora(CURRENT_PROS_ID); // Recargar lista
            document.getElementById("bitNota").value = "";
        } catch (err) {
            alert("Error al guardar nota: " + err.message);
        }
      }

      /* MIGRAR CORRETAJE -> ADMIN */
      async function migrarAAdmin(id) {
        if (!confirm("¿Mover este prospecto a ADMINISTRACIÓN?")) return;
        const p = PROS.find((x) => String(x.ID) === String(id));
        if (!p) return;

        showSpinner("Migrando datos...");
        try {
          const nuevoID = "PROS_" + Date.now();
          const payloadAdmin = {
            ID: nuevoID,
            Nombre: p.Nombre,
            Comuna: p.Comuna || "",
            Direccion: p.Direccion || "",
            Telefono: p.Telefono || "",
            Email: p.Email || "",
            Contacto: p.Nombre,
            Estado: "Nuevo",
            Observaciones: (p.Observaciones || "") + " [Migrado]",
            "Fecha Registro": new Date().toISOString().split("T")[0],
            Tipo: "Administracion",
            Canal: p.Canal || "Web Landing",
            Agente: p.Agente || "Sin Asignar",
            Unidades: 0,
          };

          console.log("Migrando - Paso 1: Copiando a Admin...");
          await appSheetCRUD("ProspectosCopro", "Add", [payloadAdmin]);

          console.log("Migrando - Paso 2: Eliminando de Corretaje...");
          await appSheetCRUD("ProspectosCorretaje", "Delete", [{ ID: id }]);

          await cargarTodo();
          alert("Migración exitosa.");
        } catch (err) {
          alert("Error al migrar: " + err.message);
        } finally {
          hideSpinner();
        }
      }

      /* CONTRATO */
      function abrirModalContrato(id) {
        CURRENT_PROS_ID = id;
        document.getElementById("modalContrato").classList.add("active");
      }

      async function guardarContrato() {
        const url = document.getElementById("inpContratoURL").value;
        const p = PROS.find((i) => String(i.ID) === String(CURRENT_PROS_ID));

        await appSheetCRUD(p._tabla, "Edit", [
          { ID: CURRENT_PROS_ID, ContratoURL: url, Estado: "Contrato Firmado" },
        ]);
        document.getElementById("modalContrato").classList.remove("active");
        await cargarTodo();
      }

      /* COTIZAR (Admin) */
      function abrirCotizacion(id) {
        const p = PROS.find((i) => String(i.ID) === String(id));
        if (p)
          window.location.href = `cotizacion-admin-condominio.html?prospectoId=${p.ID}&unidades=${p.Unidades}&comuna=${p.Comuna}`;
      }

      /* CONVERTIR CLIENTE */
      async function agregarAClientes(id) {
        if (!confirm("¿Convertir a Cliente?")) return;
        alert("Función en desarrollo");
      }

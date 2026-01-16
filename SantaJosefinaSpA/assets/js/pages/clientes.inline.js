// ===== Extracted from clientes.html =====

/* ===== UTILS ===== */
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
      function escapeCSV(v) {
        if (v == null) return "";
        const s = String(v).replaceAll('"', '""');
        return /[",\n]/.test(s) ? '"' + s + '"' : s;
      }
      function formatearFecha(f) {
        if (!f) return "";
        const [y, m, d] = f.split("-");
        return `${d}/${m}`;
      }

      // Helpers ID
      function getKeyVal(o) {
        return o.ID || o.id || "";
      }
      function generateKey(prefix = "ID") {
        return `${prefix}_${Date.now().toString(36)}`;
      }

      /* ===== ESTADO ===== */
      let CLIENTES = [],
        VIEW_CLIENTES = [],
        CURRENT_CLIENT_ID = null;

      /* ===== BOOT ===== */
      document.addEventListener("DOMContentLoaded", async () => {
        try {
          document.getElementById("header").innerHTML = await (
            await fetch("header.html")
          ).text();
          if (typeof initHeader === "function") initHeader();
        } catch (e) {}
        try {
          document.getElementById("footer").innerHTML = await (
            await fetch("footer.html")
          ).text();
        } catch (e) {}

        bindUI();
        await cargarTodo();
      });

      function bindUI() {
        document
          .getElementById("btnNew")
          .addEventListener("click", () => abrirFormCliente());
        document
          .getElementById("btnReload")
          .addEventListener("click", cargarTodo);
        document
          .getElementById("btnExport")
          .addEventListener("click", exportCSV);
        document
          .getElementById("inpBuscar")
          .addEventListener("input", aplicarFiltros);
      }

      /* ===== CARGA ===== */
      async function cargarTodo() {
        try {
          showSpinner("Cargando clientes...");
          CLIENTES = (await fetchData("Clientes")) || [];
          aplicarFiltros();
        } catch (e) {
          console.error(e);
          alert("Error: " + e.message);
        } finally {
          hideSpinner();
        }
      }

      /* ===== FILTROS & RENDER ===== */
      function aplicarFiltros() {
        const q = norm(document.getElementById("inpBuscar").value);
        const seg = document.getElementById("filSegmento").value;
        const est = document.getElementById("filEstado").value;

        VIEW_CLIENTES = CLIENTES.filter((c) => {
          if (seg && c.Segmento !== seg) return false;
          if (est && c.Estado !== est) return false;
          if (!q) return true;

          const str = [
            c.Nombre,
            c.Email,
            c.Telefono,
            c["Teléfono"],
            c.rut,
            c.Segmento,
            c.Estado,
          ]
            .map((v) => norm(v))
            .join(" ");
          return str.includes(q);
        });

        renderTabla();
      }

      function renderTabla() {
        const tb = document.getElementById("tablaClientes");
        if (!VIEW_CLIENTES.length) {
          tb.innerHTML =
            '<tr><td colspan="7" class="muted" style="text-align:center; padding:20px;">No se encontraron clientes.</td></tr>';
          return;
        }

        tb.innerHTML = VIEW_CLIENTES.map((c) => {
          const key = getKeyVal(c);

          // Estilos dinámicos
          let claseSeg = "seg-habitacional";
          if (c.Segmento === "VIP") claseSeg = "seg-vip";
          if (c.Segmento === "Inversionista") claseSeg = "seg-inversionista";

          const estadoHtml =
            c.Estado === "Activo"
              ? '<span class="st-activo">Activo</span>'
              : '<span class="st-inactivo">Inactivo</span>';

          return `
            <tr>
              <td>
                  <div style="font-weight:700; color:#1e293b;">${
                    c.Nombre || "Sin Nombre"
                  }</div>
                  <div style="font-size:11px; color:#64748b;">${
                    c.rut || ""
                  }</div>
              </td>
              <td style="font-size:13px;">
                  <div><i class="fa-regular fa-envelope"></i> ${
                    c.Email || "-"
                  }</div>
                  <div><i class="fa-solid fa-phone"></i> ${
                    c.Telefono || c["Teléfono"] || "-"
                  }</div>
              </td>
              <td style="font-size:13px; max-width: 180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${c.Interes || "-"}
              </td>
              <td><span class="seg-badge ${claseSeg}">${
            c.Segmento || "General"
          }</span></td>
              <td>${estadoHtml}</td>
              <td style="font-size:12px;">${c.Agente || "-"}</td>
              <td class="no-print">
                 <div class="acciones-group">
                    <button class="btn-icon" onclick="abrirSeguimiento('${key}')" title="Historial / Bitácora" style="background:#e0f2fe; color:#0369a1;">
                       <i class="fa-solid fa-comments"></i>
                    </button>
                    <button class="btn-icon btn-editar" onclick="abrirFormCliente('${key}')" title="Editar">
                       <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-eliminar" onclick="eliminarCliente('${key}')" title="Eliminar">
                       <i class="fa-solid fa-trash"></i>
                    </button>
                 </div>
              </td>
            </tr>`;
        }).join("");
      }

      /* ===== CRUD CLIENTE ===== */
      function abrirFormCliente(id) {
        const title = document.getElementById("modalTitleCliente");
        document.getElementById("formCliente").reset();
        document.getElementById("clienteID").value = "";

        if (id) {
          title.textContent = "Editar Cliente";
          const c = CLIENTES.find((x) => String(getKeyVal(x)) === String(id));
          if (!c) return;

          document.getElementById("clienteID").value = id;
          document.getElementById("clienteNombre").value = c.Nombre || "";
          document.getElementById("clienteRUT").value = c.rut || "";
          document.getElementById("clienteEmail").value = c.Email || "";
          document.getElementById("clienteTelefono").value =
            c.Telefono || c["Teléfono"] || "";
          document.getElementById("clienteCanal").value =
            c.Canal || "Web Landing";
          document.getElementById("clienteSegmento").value =
            c.Segmento || "Habitacional";
          document.getElementById("clienteEstado").value = c.Estado || "Activo";
          document.getElementById("clienteInteres").value = c.Interes || "";
        } else {
          title.textContent = "Nuevo Cliente";
          document.getElementById("clienteEstado").value = "Activo";
          document.getElementById("clienteSegmento").value = "Habitacional";
        }
        document.getElementById("modalCliente").classList.add("active");
      }

      function cerrarModalCliente() {
        document.getElementById("modalCliente").classList.remove("active");
      }

      document.getElementById("formCliente").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("clienteID").value;
        const nuevoID = id || generateKey("CLI");

        // Mapeo EXACTO a tus columnas
        const payload = {
          ID: nuevoID,
          Nombre: document.getElementById("clienteNombre").value.trim(),
          rut: document.getElementById("clienteRUT").value.trim(),
          Email: document.getElementById("clienteEmail").value.trim(),
          Telefono: document.getElementById("clienteTelefono").value.trim(),
          Canal: document.getElementById("clienteCanal").value,
          Segmento: document.getElementById("clienteSegmento").value,
          Estado: document.getElementById("clienteEstado").value,
          Interes: document.getElementById("clienteInteres").value,
          // Agente solo si es nuevo (para no sobrescribir)
          ...(!id && {
            Agente:
              typeof getAuthUser === "function"
                ? getAuthUser().nombre
                : "Admin",
          }),
          ...(!id && {
            "Fecha Creación": new Date().toISOString().split("T")[0],
          }),
        };

        try {
          showSpinner("Guardando...");
          const action = id ? "Edit" : "Add";
          await appSheetCRUD("Clientes", action, [payload]);
          cerrarModalCliente();
          await cargarTodo();
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          hideSpinner();
        }
      };

      async function eliminarCliente(id) {
        if (!confirm("¿Eliminar este cliente?")) return;
        try {
          showSpinner("Eliminando...");
          await appSheetCRUD("Clientes", "Delete", [{ ID: id }]);
          await cargarTodo();
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          hideSpinner();
        }
      }

      /* ===== SEGUIMIENTO (BITÁCORA) ===== */
      async function abrirSeguimiento(id) {
        CURRENT_CLIENT_ID = id;
        const c = CLIENTES.find((x) => String(getKeyVal(x)) === String(id));
        document.getElementById("segSubtitulo").innerText = `Cliente: ${
          c ? c.Nombre : "..."
        }`;
        document.getElementById("segFecha").valueAsDate = new Date();

        document.getElementById("modalSeguimiento").classList.add("active");
        cargarHistorial(id);
      }

      async function cargarHistorial(clienteId) {
        const container = document.getElementById("timelineContainer");
        container.innerHTML =
          '<div style="text-align:center; color:#94a3b8;">Cargando...</div>';

        try {
          // Reutilizamos la tabla 'Bitacora'
          const logs = await fetchData("Bitacora");
          // Filtramos por el ID del cliente (Columna ProspectoID en Bitacora)
          const historial = logs.filter(
            (l) => String(l.ProspectoID) === String(clienteId)
          );

          historial.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

          if (historial.length === 0) {
            container.innerHTML =
              '<div style="text-align:center; padding:20px; color:#cbd5e1;"><i class="fa-regular fa-comment-dots" style="font-size:30px;"></i><br>Sin registros.</div>';
            return;
          }

          container.innerHTML = historial
            .map((h) => {
              let icon = "fa-comment";
              if (h.Tipo === "Llamada") icon = "fa-phone";
              if (h.Tipo === "Correo") icon = "fa-envelope";
              if (h.Tipo === "Compromiso") icon = "fa-thumbtack";
              if (h.Tipo === "Reunion") icon = "fa-handshake";
              if (h.Tipo === "Whatsapp") icon = "fa-brands fa-whatsapp";

              return `
                  <div class="chat-bubble ${h.Tipo}">
                      <div class="chat-meta">
                          <span><i class="fa-solid ${icon}"></i> <b>${
                h.Tipo
              }</b></span>
                          <span>${formatearFecha(h.Fecha)}</span>
                      </div>
                      <div class="chat-text">${h.Nota}</div>
                      <div style="font-size:10px; color:#cbd5e1; text-align:right; margin-top:4px;">Por: ${
                        h.Usuario || "Sistema"
                      }</div>
                  </div>`;
            })
            .join("");
        } catch (e) {
          container.innerHTML = "Error cargando bitácora.";
        }
      }

      async function guardarInteraccion() {
        const nota = document.getElementById("segNota").value;
        const tipo = document.getElementById("segTipo").value;
        const fecha = document.getElementById("segFecha").value;

        if (!nota) return alert("Escribe el detalle.");

        // Usuario actual
        let usuario = "Agente";
        if (typeof getAuthUser === "function") {
          const u = getAuthUser();
          if (u) usuario = u.nombre;
        }

        const payload = {
          ID: "BIT_" + Date.now(),
          ProspectoID: CURRENT_CLIENT_ID, // Vinculación
          Fecha: fecha,
          Tipo: tipo,
          Nota: nota,
          Usuario: usuario,
        };

        try {
          document.getElementById("segNota").disabled = true;
          await appSheetCRUD("Bitacora", "Add", [payload]);
          document.getElementById("segNota").value = "";
          document.getElementById("segNota").disabled = false;
          await cargarHistorial(CURRENT_CLIENT_ID);
        } catch (e) {
          alert("Error: " + e.message);
          document.getElementById("segNota").disabled = false;
        }
      }

      /* ===== Exportar ===== */
      function exportCSV() {
        const headers = [
          "ID",
          "Nombre",
          "Email",
          "Telefono",
          "RUT",
          "Canal",
          "Segmento",
          "Estado",
        ];
        const lines = [headers.join(",")];
        VIEW_CLIENTES.forEach((r) => {
          lines.push(
            [
              escapeCSV(getKeyVal(r)),
              escapeCSV(r.Nombre),
              escapeCSV(r.Email),
              escapeCSV(r.Telefono),
              escapeCSV(r.rut),
              escapeCSV(r.Canal),
              escapeCSV(r.Segmento),
              escapeCSV(r.Estado),
            ].join(",")
          );
        });
        const blob = new Blob([lines.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Clientes.csv";
        a.click();
        URL.revokeObjectURL(url);
      }

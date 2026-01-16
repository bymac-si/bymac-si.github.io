// ===== Extracted from visitas.html =====

/* ===== Utilidades Standard ===== */
      function showSpinner(msg) {
        const sp = document.getElementById("pageSpinner");
        const txt = document.getElementById("spinnerText");
        if (msg) txt.textContent = msg;
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
      function formatearFechaISO(d) {
        if (!d) return "";
        return new Date(d).toLocaleDateString("es-CL");
      }

      /* Helpers Claves */
      if (typeof window.getKeyVal !== "function") {
        window.getKeyVal = (o) =>
          o
            ? o._id ??
              o.id ??
              o.ID ??
              o.Key ??
              o.key ??
              o.Id ??
              o[Object.keys(o)[0]]
            : "";
      }
      if (typeof window.getKeyName !== "function") {
        window.getKeyName = (row) => {
          if (!row || typeof row !== "object") return "ID";
          const cands = ["ID", "_id", "Id", "id", "Key", "key"];
          for (const c of cands) {
            if (c in row) return c;
          }
          return Object.keys(row)[0] || "ID";
        };
      }
      function generateKey(prefix = "ID") {
        return `${prefix}_${Date.now().toString(36)}${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;
      }

      /* ===== Estado ===== */
      let VISITAS = [],
        VIEW_VISITAS = [],
        CLIENTES = [],
        PROPIEDADES = [];
      let KEY_VISITA = "ID";

      /* ===== Inicialización ===== */
      document.addEventListener("DOMContentLoaded", async () => {
        try {
          document.getElementById("header").innerHTML = await (
            await fetch("header.html")
          ).text();
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
          .addEventListener("click", () => abrirFormVisita());
        document
          .getElementById("btnReload")
          .addEventListener("click", cargarTodo);
        document
          .getElementById("btnExport")
          .addEventListener("click", exportCSV);
        document
          .getElementById("inpBuscar")
          .addEventListener("input", aplicarFiltros);

        modalVisita.addEventListener("click", (e) => {
          if (e.target === modalVisita) cerrarModalVisita();
        });
        modalDetalle.addEventListener("click", (e) => {
          if (e.target === modalDetalle) cerrarModalDetalle();
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            cerrarModalVisita();
            cerrarModalDetalle();
          }
        });
      }

      /* ===== Carga de Datos ===== */
      async function cargarTodo() {
        try {
          showSpinner("Cargando visitas...");
          [VISITAS, CLIENTES, PROPIEDADES] = await Promise.all([
            fetchData("Visitas"),
            fetchData("Clientes"),
            fetchData("Propiedades"),
          ]);

          VISITAS = VISITAS || [];
          if (VISITAS.length) KEY_VISITA = getKeyName(VISITAS[0]);

          // Llenar selects
          const cliHtml = CLIENTES.map(
            (c) => `<option value="${getKeyVal(c)}">${c.Nombre}</option>`
          ).join("");
          const propHtml = PROPIEDADES.map(
            (p) =>
              `<option value="${getKeyVal(p)}">${p.Direccion || ""}</option>`
          ).join("");

          document.getElementById("visitaCliente").innerHTML =
            `<option value="">Seleccione...</option>` + cliHtml;
          document.getElementById("visitaPropiedad").innerHTML =
            `<option value="">Seleccione...</option>` + propHtml;

          aplicarFiltros();
        } catch (e) {
          console.error(e);
          alert("Error cargando datos: " + e.message);
        } finally {
          hideSpinner();
        }
      }

      /* ===== Filtros y Render ===== */
      function aplicarFiltros() {
        const q = norm(document.getElementById("inpBuscar").value);

        // Mapas para búsqueda rápida
        const clientesMap = {};
        CLIENTES.forEach((c) => (clientesMap[getKeyVal(c)] = c.Nombre));
        const propMap = {};
        PROPIEDADES.forEach(
          (p) => (propMap[getKeyVal(p)] = p.Direccion || "")
        );

        VIEW_VISITAS = VISITAS.filter((v) => {
          if (!q) return true;
          const cliente = clientesMap[v.Cliente] || "";
          const prop = propMap[v.Propiedad] || "";
          const fecha = formatearFechaISO(v.Fecha || v["Fecha Visita"]);

          const str = [cliente, prop, fecha, v.Agente]
            .map((v) => norm(v))
            .join(" ");
          return str.includes(q);
        });

        renderTabla(clientesMap, propMap);
      }

      function renderTabla(cMap, pMap) {
        // Si no vienen mapas, generarlos (caso raro)
        if (!cMap || !pMap) {
          cMap = {};
          pMap = {};
          CLIENTES.forEach((c) => (cMap[getKeyVal(c)] = c.Nombre));
          PROPIEDADES.forEach(
            (p) => (pMap[getKeyVal(p)] = p.Direccion || "")
          );
        }

        const tb = document.getElementById("tablaVisitas");
        if (!VIEW_VISITAS.length) {
          tb.innerHTML =
            '<tr><td colspan="5" class="muted">No se encontraron visitas.</td></tr>';
          return;
        }

        tb.innerHTML = VIEW_VISITAS.map((v) => {
          const key = getKeyVal(v);
          const cliName = cMap[v.Cliente] || "—";
          const propName = pMap[v.Propiedad] || "—";
          const fechaFmt = formatearFechaISO(v.Fecha || v["Fecha Visita"]);

          return `<tr>
      <td>${cliName}</td>
      <td>${propName}</td>
      <td class="mono">${fechaFmt}</td>
      <td>${v.Agente || "—"}</td>
      <td class="no-print">
         <div class="acciones-group">
            <button class="btn-icon btn-ver" onclick="abrirDetalle('${key}')" title="Ver Detalle">
               <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-icon btn-editar" onclick="abrirFormVisita('${key}')" title="Editar">
               <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-eliminar" onclick="eliminarVisita('${key}')" title="Eliminar">
               <i class="fa-solid fa-trash"></i>
            </button>
         </div>
      </td>
    </tr>`;
        }).join("");
      }

      /* ---------------- CRUD Visitas ---------------- */
      function abrirFormVisita(id) {
        const title = document.getElementById("modalTitleVisita");
        document.getElementById("formVisita").reset();
        document.getElementById("visitaID").value = "";

        if (id) {
          title.textContent = "Editar Visita";
          const v = VISITAS.find((x) => String(getKeyVal(x)) === String(id));
          if (!v) {
            alert("No encontrada");
            return;
          }
          document.getElementById("visitaID").value = id;
          document.getElementById("visitaCliente").value = v.Cliente;
          document.getElementById("visitaPropiedad").value = v.Propiedad;
          document.getElementById("visitaFecha").value =
            v.Fecha || v["Fecha Visita"] || "";
          document.getElementById("visitaAgente").value = v.Agente || "";
        } else {
          title.textContent = "Nueva Visita";
        }
        document.getElementById("modalVisita").classList.add("active");
      }

      function cerrarModalVisita() {
        document.getElementById("modalVisita").classList.remove("active");
      }

      document.getElementById("formVisita").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("visitaID").value;
        const payload = {
          Cliente: document.getElementById("visitaCliente").value,
          Propiedad: document.getElementById("visitaPropiedad").value,
          Fecha: document.getElementById("visitaFecha").value, // ISO
          Agente: document.getElementById("visitaAgente").value.trim(),
        };

        const keyField = id ? KEY_VISITA : KEY_VISITA;
        if (id) payload[keyField] = id;
        else payload[keyField] = generateKey("VIS");

        try {
          showSpinner("Guardando...");
          if (typeof upsertData === "function")
            await upsertData("Visitas", payload);
          else if (id) await appSheetCRUD("Visitas", "Edit", [payload]);
          else await appSheetCRUD("Visitas", "Add", [payload]);

          cerrarModalVisita();
          await cargarTodo();
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          hideSpinner();
        }
      };

      async function eliminarVisita(id) {
        if (!confirm("¿Eliminar visita?")) return;
        try {
          showSpinner("Eliminando...");
          if (typeof deleteByKey === "function")
            await deleteByKey("Visitas", id);
          else await appSheetCRUD("Visitas", "Delete", [{ [KEY_VISITA]: id }]);
          await cargarTodo();
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          hideSpinner();
        }
      }

      function abrirDetalle(id) {
        const v = VISITAS.find((x) => String(getKeyVal(x)) === String(id));
        if (!v) return;

        const cName =
          CLIENTES.find((c) => getKeyVal(c) === v.Cliente)?.Nombre || "—";
        const pDesc =
          PROPIEDADES.find((p) => getKeyVal(p) === v.Propiedad)?.Direccion ||
          "—";

        document.getElementById("detalleContenido").innerHTML = `
    <p><b>Cliente:</b> ${cName}</p>
    <p><b>Propiedad:</b> ${pDesc}</p>
    <p><b>Fecha:</b> ${formatearFechaISO(v.Fecha || v["Fecha Visita"])}</p>
    <p><b>Agente:</b> ${v.Agente || "—"}</p>
  `;
        document.getElementById("modalDetalle").classList.add("active");
      }
      function cerrarModalDetalle() {
        document.getElementById("modalDetalle").classList.remove("active");
      }

      /* ===== Exportar ===== */
      function exportCSV() {
        const headers = ["ID", "Cliente", "Propiedad", "Fecha", "Agente"];
        const lines = [headers.join(",")];

        // Recalcular mapas para exportación
        const cMap = {};
        CLIENTES.forEach((c) => (cMap[getKeyVal(c)] = c.Nombre));
        const pMap = {};
        PROPIEDADES.forEach((p) => (pMap[getKeyVal(p)] = p.Direccion || ""));

        VIEW_VISITAS.forEach((r) => {
          lines.push(
            [
              escapeCSV(getKeyVal(r)),
              escapeCSV(cMap[r.Cliente] || r.Cliente),
              escapeCSV(pMap[r.Propiedad] || r.Propiedad),
              escapeCSV(r.Fecha || r["Fecha Visita"]),
              escapeCSV(r.Agente),
            ].join(",")
          );
        });

        const blob = new Blob([lines.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Visitas.csv";
        a.click();
        URL.revokeObjectURL(url);
      }

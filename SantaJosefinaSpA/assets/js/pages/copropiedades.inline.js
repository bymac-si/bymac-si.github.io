// ===== Extracted from copropiedades.html =====

/* ===== Utilidades ===== */
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
      let COPROS = [],
        VIEW = [];
      let KEY_NAME = "ID";

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
        // Botones
        document
          .getElementById("btnNew")
          .addEventListener("click", () => abrirFormCopro());
        document
          .getElementById("btnReload")
          .addEventListener("click", cargarTodo);
        document
          .getElementById("btnExport")
          .addEventListener("click", exportCSV);

        // Filtros
        document
          .getElementById("inpBuscar")
          .addEventListener("input", aplicarFiltros);

        // Modal
        modalCopro.addEventListener("click", (e) => {
          if (e.target === modalCopro) cerrarModalCopro();
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") cerrarModalCopro();
        });
      }

      /* ===== Carga de Datos ===== */
      async function cargarTodo() {
        try {
          showSpinner("Cargando condominios...");
          COPROS = await fetchData("Copropiedades");
          if (!COPROS) COPROS = [];

          if (COPROS.length) KEY_NAME = getKeyName(COPROS[0]);

          aplicarFiltros();
        } catch (err) {
          console.error(err);
          alert("Error cargando datos: " + err.message);
        } finally {
          hideSpinner();
        }
      }

      /* ===== Filtros y Render ===== */
      function aplicarFiltros() {
        const q = norm(document.getElementById("inpBuscar").value);

        VIEW = COPROS.filter((c) => {
          if (!q) return true;
          const searchStr = [c.Nombre, c.RUT, c.Direccion, c.Comuna]
            .map((v) => norm(v))
            .join(" ");
          return searchStr.includes(q);
        });

        renderTabla();
      }

      function renderTabla() {
        const tb = document.getElementById("tablaCopros");
        if (!VIEW.length) {
          tb.innerHTML =
            '<tr><td colspan="7" class="muted">No se encontraron copropiedades.</td></tr>';
          return;
        }

        tb.innerHTML = VIEW.map((c) => {
          const key = getKeyVal(c);

          return `<tr>
      <td><span style="font-weight:600; font-size:13px;">${
        c.Nombre || ""
      }</span></td>
      <td class="mono">${c.RUT || ""}</td>
      <td>${c.Direccion || ""}</td>
      <td>${c.Comuna || ""}</td>
      <td>${c.Ciudad || ""}</td>
      <td class="mono" style="text-align:center;">${c.Unidades || 0}</td>
      <td class="mono" style="text-align:center;">${c.FondoReserva || 0}%</td>
      <td class="no-print">
         <div class="acciones-group">
            <button class="btn-icon btn-admin" onclick="irAlPanel('${key}')" title="Ir al Panel de Administración">
               <i class="fa-solid fa-building-user"></i>
            </button>
            <button class="btn-icon btn-editar" onclick="abrirFormCopro('${key}')" title="Editar">
               <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-eliminar" onclick="eliminarCopro('${key}')" title="Eliminar">
               <i class="fa-solid fa-trash"></i>
            </button>
         </div>
      </td>
    </tr>`;
        }).join("");
      }

      /* ===== Acciones ===== */
      function irAlPanel(id) {
        // Redirige al panel de administración de ese edificio
        window.location.href = `admin-condominios.html?id=${id}`;
      }

      function abrirFormCopro(id) {
        const title = document.getElementById("modalTitleCopro");
        document.getElementById("formCopro").reset();
        document.getElementById("coproID").value = "";

        if (id) {
          title.textContent = "Editar Copropiedad";
          const c = COPROS.find((x) => String(getKeyVal(x)) === String(id));
          if (!c) {
            alert("No encontrada");
            return;
          }

          document.getElementById("coproID").value = id;
          document.getElementById("coproNombre").value = c.Nombre || "";
          document.getElementById("coproRUT").value = c.RUT || "";
          document.getElementById("coproDireccion").value = c.Direccion || "";
          document.getElementById("coproComuna").value = c.Comuna || "";
          document.getElementById("coproCiudad").value = c.Ciudad || "";
          document.getElementById("coproBanco").value = c.Banco || "";
          document.getElementById("coproCuenta").value = c.Cuenta || "";
          document.getElementById("coproEmailAdmin").value = c.EmailAdmin || "";
          document.getElementById("coproTelefono").value = c.Telefono || "";
          document.getElementById("coproUnidades").value = c.Unidades || "";
          document.getElementById("coproFondo").value = c.FondoReserva || "";
          document.getElementById("coproReglamento").value =
            c.ReglamentoURL || "";
          document.getElementById("coproLibro").value = c.LibroActasURL || "";
        } else {
          title.textContent = "Nueva Copropiedad";
        }
        document.getElementById("modalCopro").classList.add("active");
      }

      function cerrarModalCopro() {
        document.getElementById("modalCopro").classList.remove("active");
      }

      document.getElementById("formCopro").onsubmit = async (e) => {
        e.preventDefault();
        const idValue = document.getElementById("coproID").value;

        const payload = {
          Nombre: document.getElementById("coproNombre").value.trim(),
          RUT: document.getElementById("coproRUT").value.trim(),
          Direccion: document.getElementById("coproDireccion").value.trim(),
          Comuna: document.getElementById("coproComuna").value.trim(),
          Ciudad: document.getElementById("coproCiudad").value.trim(),
          Banco: document.getElementById("coproBanco").value.trim(),
          Cuenta: document.getElementById("coproCuenta").value.trim(),
          EmailAdmin: document.getElementById("coproEmailAdmin").value.trim(),
          Telefono: document.getElementById("coproTelefono").value.trim(),
          Unidades:
            parseInt(document.getElementById("coproUnidades").value) || 0,
          FondoReserva:
            parseFloat(document.getElementById("coproFondo").value) || 0,
          ReglamentoURL: document
            .getElementById("coproReglamento")
            .value.trim(),
          LibroActasURL: document.getElementById("coproLibro").value.trim(),
        };

        const keyField = idValue ? KEY_NAME : KEY_NAME;

        if (idValue) {
          payload[keyField] = idValue;
        } else {
          payload[keyField] = generateKey("COPRO");
        }

        try {
          showSpinner(idValue ? "Guardando..." : "Creando...");
          if (typeof upsertData === "function") {
            await upsertData("Copropiedades", payload);
          } else {
            if (idValue) await appSheetCRUD("Copropiedades", "Edit", [payload]);
            else await appSheetCRUD("Copropiedades", "Add", [payload]);
          }
          cerrarModalCopro();
          await cargarTodo();
        } catch (err) {
          console.error(err);
          alert("Error al guardar: " + err.message);
        } finally {
          hideSpinner();
        }
      };

      async function eliminarCopro(id) {
        if (
          !confirm(
            "¿Eliminar esta Copropiedad?\n\nCUIDADO: Esto podría dejar huérfanos a los residentes y gastos asociados."
          )
        )
          return;
        try {
          showSpinner("Eliminando...");
          if (typeof deleteByKey === "function") {
            await deleteByKey("Copropiedades", id);
          } else {
            await appSheetCRUD("Copropiedades", "Delete", [{ [KEY_NAME]: id }]);
          }
          await cargarTodo();
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          hideSpinner();
        }
      }

      /* ===== Exportar ===== */
      function exportCSV() {
        const headers = [
          "ID",
          "Nombre",
          "RUT",
          "Direccion",
          "Comuna",
          "Ciudad",
          "Unidades",
          "FondoReserva",
          "EmailAdmin",
        ];
        const lines = [headers.join(",")];

        VIEW.forEach((r) => {
          lines.push(
            [
              escapeCSV(getKeyVal(r)),
              escapeCSV(r.Nombre),
              escapeCSV(r.RUT),
              escapeCSV(r.Direccion),
              escapeCSV(r.Comuna),
              escapeCSV(r.Ciudad),
              escapeCSV(r.Unidades),
              escapeCSV(r.FondoReserva),
              escapeCSV(r.EmailAdmin),
            ].join(",")
          );
        });

        const blob = new Blob([lines.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Copropiedades.csv";
        a.click();
        URL.revokeObjectURL(url);
      }

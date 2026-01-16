// ===== Extracted from admin-bloques.html =====

let ESPACIOS = [];
      let BLOQUES = [];
      let espacioActualID = null;

      // Nombres de columnas fijos
      const COL_ID = "ID";
      const COL_ESPACIO = "EspacioID";

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

        const params = new URLSearchParams(window.location.search);
        espacioActualID = params.get("id");

        await cargarTodo();
      });

      async function cargarTodo() {
        showSpinner(true);
        try {
          const [espacios, bloques] = await Promise.all([
            fetchData("Espacios"),
            fetchData("Bloques").catch(() => []),
          ]);
          ESPACIOS = espacios || [];
          BLOQUES = bloques || [];

          // Llenar Select
          const sel = document.getElementById("selEspacio");
          // Asumiendo que Espacios también tiene columna ID
          sel.innerHTML = ESPACIOS.map(
            (e) => `<option value="${e.ID}">${e.Nombre}</option>`
          ).join("");

          if (
            espacioActualID &&
            ESPACIOS.some((e) => String(e.ID) === espacioActualID)
          ) {
            sel.value = espacioActualID;
          } else if (ESPACIOS.length > 0) {
            espacioActualID = ESPACIOS[0].ID;
            sel.value = espacioActualID;
          }

          filtrarBloques();
        } catch (e) {
          console.error(e);
          alert("Error cargando datos: " + e.message);
        } finally {
          showSpinner(false);
        }
      }

      function filtrarBloques() {
        espacioActualID = document.getElementById("selEspacio").value;
        const contenedor = document.getElementById("gridBloques");

        // Filtrar bloques usando los nombres de columna correctos
        const misBloques = BLOQUES.filter(
          (b) => String(b[COL_ESPACIO]) === String(espacioActualID)
        );

        // Ordenar por hora inicio
        misBloques.sort((a, b) =>
          (a.HoraInicio || "").localeCompare(b.HoraInicio || "")
        );

        let html = "";

        misBloques.forEach((b) => {
          html += `
          <div class="block-card">
            <div class="block-info">
              <h4>${b.Nombre}</h4>
              <span class="block-time">
                <i class="fa-regular fa-clock"></i> ${b.HoraInicio} - ${b.HoraFin}
              </span>
            </div>
            <button class="btn-delete" onclick="eliminarBloque('${b[COL_ID]}')" title="Eliminar Turno">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
        });

        html += `
        <div class="add-card" onclick="abrirModal()">
          <i class="fa-solid fa-plus-circle" style="font-size:24px;"></i>
          <span>Agregar Turno</span>
        </div>
      `;

        contenedor.innerHTML = html;
      }

      /* --- CRUD --- */
      function abrirModal() {
        if (!espacioActualID) return alert("Selecciona un espacio primero");
        document.getElementById("formBloque").reset();
        document.getElementById("modalBloque").classList.add("active");
      }
      function cerrarModal() {
        document.getElementById("modalBloque").classList.remove("active");
      }

      document.getElementById("formBloque").onsubmit = async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("blkNombre").value.trim();
        const inicio = document.getElementById("blkInicio").value;
        const fin = document.getElementById("blkFin").value;

        if (inicio >= fin)
          return alert("La hora de inicio debe ser anterior a la de fin.");

        // CONSTRUCCIÓN DEL PAYLOAD EXACTO
        const payload = {
          ID: "BLK_" + Date.now().toString(36).toUpperCase(),
          EspacioID: espacioActualID, // ID del espacio seleccionado
          Nombre: nombre,
          HoraInicio: inicio,
          HoraFin: fin,
          Activo: true, // AppSheet a veces prefiere "true" o "Y", prueba true primero
        };

        showSpinner(true);
        try {
          if (typeof appSheetCRUD === "function") {
            // Acción ADD
            await appSheetCRUD("Bloques", "Add", [payload]);
          }

          cerrarModal();
          await cargarTodo();
        } catch (err) {
          console.error(err);
          alert("Error al guardar: " + err.message);
        } finally {
          showSpinner(false);
        }
      };

      async function eliminarBloque(id) {
        if (!confirm("¿Eliminar este horario?")) return;
        showSpinner(true);
        try {
          if (typeof appSheetCRUD === "function") {
            // Acción DELETE con llave ID explicita
            await appSheetCRUD("Bloques", "Delete", [{ ID: id }]);
          }
          await cargarTodo();
        } catch (err) {
          alert("Error al eliminar: " + err.message);
        } finally {
          showSpinner(false);
        }
      }

      function showSpinner(show) {
        document.getElementById("pageSpinner").style.display = show
          ? "grid"
          : "none";
      }

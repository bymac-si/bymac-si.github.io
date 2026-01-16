// ===== Extracted from mobile_bitacora.html =====

let TODOS_PROSPECTOS = [];
      let BITACORA_CACHE = [];

      document.addEventListener("DOMContentLoaded", async () => {
        // Fecha hoy por defecto
        document.getElementById("bitFecha").valueAsDate = new Date();

        // Si viene ID en la URL (redirección desde otro lado)
        const params = new URLSearchParams(window.location.search);
        const preID = params.get("id");
        const preNombre = params.get("nombre");

        await cargarDatosIniciales();

        if (preID && preNombre) {
          document.getElementById("inpBuscar").value = preNombre;
          seleccionarProspectoPorID(preID);
        }
      });

      async function cargarDatosIniciales() {
        mostrarLoader(true);
        try {
          // Carga paralela de tablas necesarias
          const [admin, corretaje, bitacora] = await Promise.all([
            fetchData("ProspectosCopro").catch(() => []),
            fetchData("ProspectosCorretaje").catch(() => []),
            fetchData("Bitacora").catch(() => []),
          ]);

          BITACORA_CACHE = bitacora || [];

          // Unificar prospectos en una sola lista para el buscador
          const listaA = admin.map((p) => ({
            ID: p.ID,
            Nombre: p.Nombre,
            Tipo: "Admin",
          }));
          const listaB = corretaje.map((p) => ({
            ID: p.ID,
            Nombre: p.Nombre,
            Tipo: "Corretaje",
          }));

          TODOS_PROSPECTOS = [...listaA, ...listaB];

          // Llenar Datalist
          const dl = document.getElementById("dlProspectos");
          dl.innerHTML = TODOS_PROSPECTOS.map(
            (p) => `<option value="${p.Nombre}"></option>`
          ).join("");
        } catch (e) {
          console.error(e);
          alert("Error de conexión al cargar datos.");
        } finally {
          mostrarLoader(false);
        }
      }

      /* --- LÓGICA DE BÚSQUEDA --- */
      function verificarSeleccion() {
        const val = document.getElementById("inpBuscar").value;
        if (!val) {
          resetView();
          return;
        }

        // Buscar coincidencia exacta en el nombre
        const encontrado = TODOS_PROSPECTOS.find(
          (p) => p.Nombre.toLowerCase() === val.toLowerCase()
        );

        if (encontrado) {
          seleccionarProspectoPorID(encontrado.ID);
        }
      }

      function seleccionarProspectoPorID(id) {
        const p = TODOS_PROSPECTOS.find((x) => String(x.ID) === String(id));
        if (!p) return;

        // UI Feedback
        document.getElementById("prospectoID").value = p.ID;
        document.getElementById("infoSeleccion").style.display = "block";
        document.getElementById(
          "infoSeleccion"
        ).innerHTML = `<i class="fa-solid fa-user-check"></i> ${p.Nombre} <small style="color:#64748b">(${p.Tipo})</small>`;

        // Mostrar Formulario
        document.getElementById("formBitacora").style.display = "block";
        document.getElementById("msgInicial").style.display = "none";

        renderTimeline(p.ID);
      }

      function resetView() {
        document.getElementById("formBitacora").style.display = "none";
        document.getElementById("msgInicial").style.display = "block";
        document.getElementById("infoSeleccion").style.display = "none";
        document.getElementById("prospectoID").value = "";
      }

      /* --- HISTORIAL --- */
      function renderTimeline(id) {
        const container = document.getElementById("timelineContainer");

        // Filtrar bitácora por ID de prospecto
        const historia = BITACORA_CACHE.filter(
          (b) => String(b.ProspectoID) === String(id)
        );

        // Ordenar: Más reciente primero
        historia.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

        if (historia.length === 0) {
          container.innerHTML =
            '<div style="text-align:center; padding:20px; color:#cbd5e1; font-size:13px;">No hay registros previos.</div>';
          return;
        }

        container.innerHTML =
          `<div class="timeline">` +
          historia
            .map(
              (h) => `
                <div class="timeline-item">
                    <div class="timeline-dot ${h.Tipo}"></div>
                    <span class="timeline-date">${formatearFecha(
                      h.Fecha
                    )}</span>
                    <div class="timeline-content">
                        <strong style="display:block; margin-bottom:4px; font-size:12px;">${
                          h.Tipo
                        }</strong>
                        ${h.Nota}
                        <div style="text-align:right; font-size:10px; color:#94a3b8; margin-top:5px;">Por: ${
                          h.Usuario || "Agente"
                        }</div>
                    </div>
                </div>
            `
            )
            .join("") +
          `</div>`;
      }

      /* --- GUARDAR --- */
      async function guardarLog() {
        const id = document.getElementById("prospectoID").value;
        const nota = document.getElementById("bitNota").value;

        if (!id) return alert("Debes buscar y seleccionar un cliente primero.");
        if (!nota.trim()) return alert("La nota no puede estar vacía.");

        mostrarLoader(true);

        // Obtener usuario actual
        let usuario = "Móvil";
        try {
          const u = getAuthUser();
          if (u && u.Nombre) usuario = u.Nombre.split(" ")[0];
        } catch (e) {}

        const payload = {
          ID: "BIT_" + Date.now(),
          ProspectoID: id,
          Fecha: document.getElementById("bitFecha").value,
          Tipo: document.getElementById("bitTipo").value,
          Nota: nota,
          Usuario: usuario,
        };

        try {
          await appSheetCRUD("Bitacora", "Add", [payload]);

          // Actualizar Cache Local y UI
          BITACORA_CACHE.push(payload);
          renderTimeline(id);

          // Limpiar
          document.getElementById("bitNota").value = "";

          const t = document.getElementById("toastSuccess");
          t.style.display = "block";
          setTimeout(() => (t.style.display = "none"), 2500);
        } catch (e) {
          alert("Error al guardar: " + e.message);
        } finally {
          mostrarLoader(false);
        }
      }

      /* UTILS */
      function mostrarLoader(show) {
        document.getElementById("loader").style.display = show
          ? "flex"
          : "none";
      }

      function formatearFecha(iso) {
        if (!iso) return "";
        const partes = iso.split("-");
        if (partes.length === 3)
          return `${partes[2]}/${partes[1]}/${partes[0]}`;
        return iso;
      }

// ===== Extracted from admin-espacios.html =====

let ESPACIOS = [],
        COPROPIEDADES = [],
        BLOQUES = [];

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

        await cargarFiltros();
      });

      async function cargarFiltros() {
        showSpinner(true);
        try {
          const data = await fetchData("Copropiedades").catch(() => []);
          COPROPIEDADES = data || [];

          const sel = document.getElementById("filtroCopropiedad");
          sel.innerHTML = COPROPIEDADES.length
            ? ""
            : "<option>No hay comunidades</option>";

          COPROPIEDADES.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.ID;
            opt.textContent = c.Nombre;
            sel.appendChild(opt);
          });

          if (COPROPIEDADES.length > 0) {
            sel.value = COPROPIEDADES[0].ID;
            await cargarEspacios();
          } else {
            document.getElementById("gridEspacios").innerHTML =
              '<div style="grid-column:1/-1; text-align:center;">Crea una Comunidad primero.</div>';
          }
        } catch (e) {
          console.error(e);
        } finally {
          showSpinner(false);
        }
      }

      async function cargarEspacios() {
        const idCopro = document.getElementById("filtroCopropiedad").value;
        if (!idCopro) return;

        showSpinner(true);
        try {
          const [esp, blo] = await Promise.all([
            fetchData("Espacios").catch(() => []),
            fetchData("Bloques").catch(() => []),
          ]);

          // Filtrar espacios de esta comunidad
          ESPACIOS = esp.filter(
            (e) => String(e.CopropiedadID) === String(idCopro)
          );
          BLOQUES = blo || [];

          renderEspacios();
        } catch (e) {
          console.error(e);
          alert("Error cargando espacios.");
        } finally {
          showSpinner(false);
        }
      }

      function renderEspacios() {
        const container = document.getElementById("gridEspacios");
        if (ESPACIOS.length === 0) {
          container.innerHTML =
            '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b; background:white; border-radius:12px; border:1px dashed #cbd5e1;">No hay espacios creados en esta comunidad.</div>';
          return;
        }

        container.innerHTML = ESPACIOS.map((e) => {
          const numBloques = BLOQUES.filter(
            (b) => String(b.EspacioID) === String(e.ID)
          ).length;
          const icono = e.Icono || "fa-building";
          const estado = e.Estado || "Activo";
          const tieneFoto = e.Imagen && e.Imagen.length > 10;

          // Lógica visual: Si tiene foto usa foto, si no usa icono con gradiente
          let visualHTML = "";
          if (tieneFoto) {
            visualHTML = `<div class="card-visual" style="background-image: url('${e.Imagen}');">
                    <div class="card-badge st-${estado}">${estado}</div>
                </div>`;
          } else {
            visualHTML = `<div class="card-visual no-photo">
                    <i class="fa-solid ${icono}"></i>
                    <div class="card-badge st-${estado}">${estado}</div>
                </div>`;
          }

          return `
            <div class="card-espacio">
                ${visualHTML}
                
                <div class="card-body">
                    <div class="card-title">${e.Nombre}</div>
                    
                    <div class="card-meta">
                        <span><i class="fa-solid fa-users"></i> ${
                          e.Capacidad || 0
                        } Pers.</span>
                        <span><i class="fa-regular fa-clock"></i> ${numBloques} Bloques</span>
                    </div>

                    <div class="card-price">
                        ${
                          parseInt(e.Costo) > 0
                            ? "$" + parseInt(e.Costo).toLocaleString("es-CL")
                            : "Gratis"
                        }
                        ${
                          parseInt(e.Garantia) > 0
                            ? '<span class="card-garantia">(+ $' +
                              parseInt(e.Garantia).toLocaleString("es-CL") +
                              " Gar.)</span>"
                            : ""
                        }
                    </div>
                </div>
                
                <div class="card-footer">
                    <button class="btn-sm" onclick="abrirBloques('${e.ID}', '${
            e.Nombre
          }')"><i class="fa-solid fa-calendar-days"></i> Horarios</button>
                    <div>
                        <button class="btn-icon" onclick="editarEspacio('${
                          e.ID
                        }')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" onclick="eliminarEspacio('${
                          e.ID
                        }')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
            `;
        }).join("");
      }

      /* --- CRUD ESPACIOS --- */
      function abrirModalEspacio() {
        const idCopro = document.getElementById("filtroCopropiedad").value;
        if (!idCopro) return alert("Selecciona una comunidad.");

        document.getElementById("formEspacio").reset();
        document.getElementById("eID").value = "";
        document.getElementById("eCopropiedadID").value = idCopro;
        document.getElementById("modalTitleEspacio").innerText =
          "Nuevo Espacio";
        document.getElementById("modalEspacio").style.display = "flex";
      }

      function editarEspacio(id) {
        const e = ESPACIOS.find((x) => x.ID === id);
        if (!e) return;

        document.getElementById("eID").value = e.ID;
        document.getElementById("eCopropiedadID").value = e.CopropiedadID;
        document.getElementById("eNombre").value = e.Nombre;
        document.getElementById("eIcono").value = e.Icono || "fa-building";
        document.getElementById("eCapacidad").value = e.Capacidad || "";
        document.getElementById("eEstado").value = e.Estado || "Activo";
        document.getElementById("eCosto").value = e.Costo || 0;
        document.getElementById("eGarantia").value = e.Garantia || 0;
        document.getElementById("eImagen").value = e.Imagen || "";
        document.getElementById("eReglas").value = e.Reglas || "";

        document.getElementById("modalTitleEspacio").innerText =
          "Editar Espacio";
        document.getElementById("modalEspacio").style.display = "flex";
      }

      document.getElementById("formEspacio").onsubmit = async (e) => {
        e.preventDefault();
        showSpinner(true);

        const id = document.getElementById("eID").value;
        const payload = {
          ID: id || "ESP_" + Date.now(),
          CopropiedadID: document.getElementById("eCopropiedadID").value,
          Nombre: document.getElementById("eNombre").value,
          Costo: document.getElementById("eCosto").value,
          Reglas: document.getElementById("eReglas").value,
          Icono: document.getElementById("eIcono").value,
          Capacidad: document.getElementById("eCapacidad").value,
          Garantia: document.getElementById("eGarantia").value,
          Imagen: document.getElementById("eImagen").value,
          Estado: document.getElementById("eEstado").value,
        };

        try {
          const act = id ? "Edit" : "Add";
          if (typeof appSheetCRUD === "function")
            await appSheetCRUD("Espacios", act, [payload]);

          document.getElementById("modalEspacio").style.display = "none";
          await cargarEspacios();
        } catch (err) {
          alert(err.message);
        } finally {
          showSpinner(false);
        }
      };

      async function eliminarEspacio(id) {
        if (!confirm("¿Eliminar espacio y sus horarios?")) return;
        showSpinner(true);
        try {
          if (typeof appSheetCRUD === "function")
            await appSheetCRUD("Espacios", "Delete", [{ ID: id }]);
          await cargarEspacios();
        } catch (e) {
          alert(e.message);
        } finally {
          showSpinner(false);
        }
      }

      /* --- GESTIÓN BLOQUES (Horarios) --- */
      function abrirBloques(idEspacio, nombreEspacio) {
        document.getElementById("bEspacioID").value = idEspacio;
        document.getElementById("bloqueSubtitle").innerText =
          "Espacio: " + nombreEspacio;

        const bloquesLocales = BLOQUES.filter(
          (b) => String(b.EspacioID) === String(idEspacio)
        );
        renderBloques(bloquesLocales);

        document.getElementById("modalBloques").style.display = "flex";
      }

      function renderBloques(lista) {
        const tb = document.getElementById("listaBloques");
        if (lista.length === 0) {
          tb.innerHTML =
            '<tr><td colspan="3" style="text-align:center; padding:15px; color:#cbd5e1;">Sin horarios.</td></tr>';
          return;
        }
        lista.sort((a, b) =>
          (a.HoraInicio || "").localeCompare(b.HoraInicio || "")
        );
        tb.innerHTML = lista
          .map(
            (b) => `
            <tr>
                <td style="font-weight:600;">${b.Nombre}</td>
                <td>${b.HoraInicio} - ${b.HoraFin}</td>
                <td style="text-align:right;">
                    <button class="btn-icon" onclick="eliminarBloque('${b.ID}')" style="color:#ef4444;"><i class="fa-solid fa-xmark"></i></button>
                </td>
            </tr>
        `
          )
          .join("");
      }

      async function agregarBloque() {
        const idEspacio = document.getElementById("bEspacioID").value;
        const nombre = document.getElementById("bNombre").value.trim();
        const inicio = document.getElementById("bInicio").value;
        const fin = document.getElementById("bFin").value;

        if (!nombre || !inicio || !fin) return alert("Completa los campos.");

        showSpinner(true);
        const payload = {
          ID: "BLK_" + Date.now(),
          EspacioID: idEspacio,
          Nombre: nombre,
          HoraInicio: inicio,
          HoraFin: fin,
        };

        try {
          if (typeof appSheetCRUD === "function")
            await appSheetCRUD("Bloques", "Add", [payload]);
          const dataBloques = await fetchData("Bloques");
          BLOQUES = dataBloques || [];

          const bloquesLocales = BLOQUES.filter(
            (b) => String(b.EspacioID) === String(idEspacio)
          );
          renderBloques(bloquesLocales);

          document.getElementById("bNombre").value = "";
          renderEspacios();
        } catch (e) {
          alert(e.message);
        } finally {
          showSpinner(false);
        }
      }

      async function eliminarBloque(id) {
        if (!confirm("¿Borrar horario?")) return;
        const idEspacio = document.getElementById("bEspacioID").value;
        showSpinner(true);
        try {
          if (typeof appSheetCRUD === "function")
            await appSheetCRUD("Bloques", "Delete", [{ ID: id }]);
          const dataBloques = await fetchData("Bloques");
          BLOQUES = dataBloques || [];

          const bloquesLocales = BLOQUES.filter(
            (b) => String(b.EspacioID) === String(idEspacio)
          );
          renderBloques(bloquesLocales);
          renderEspacios();
        } catch (e) {
          alert(e.message);
        } finally {
          showSpinner(false);
        }
      }

      function showSpinner(show) {
        document.getElementById("pageSpinner").style.display = show
          ? "grid"
          : "none";
      }
      function clp(v) {
        return "$" + new Intl.NumberFormat("es-CL").format(v);
      }

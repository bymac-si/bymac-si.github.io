// ===== Extracted from propiedades.html =====

/* ===== UTILS ===== */
      function showSpinner(msg) {
        document.getElementById("pageSpinner").style.display = "grid";
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
      const formatoCLP = (v) =>
        "$" + new Intl.NumberFormat("es-CL").format(Number(v || 0));
      const hoyISO = () => new Date().toISOString().split("T")[0];
      function getKeyVal(o) {
        return o ? o.ID || o.id || o.Id || "" : "";
      }
      function generateKey(prefix) {
        return `${prefix}_${Date.now().toString(36)}`;
      }

      /* ===== ESTADO ===== */
      let PROPIEDADES = [],
        CLIENTES = [],
        AGENTES = [],
        VIEW_PROPIEDADES = [];

      /* ===== INICIO ===== */
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
        document.getElementById("btnNew").onclick = () => abrirFormPropiedad();
        document.getElementById("btnReload").onclick = cargarTodo;
        document.getElementById("btnExport").onclick = exportCSV;
        document.getElementById("inpBuscar").oninput = aplicarFiltros;
      }

      /* ===== DATOS ===== */
      async function cargarTodo() {
        try {
          showSpinner();
          // Carga paralela para selectores
          const [props, clis, ages] = await Promise.all([
            fetchData("Propiedades").catch(() => []),
            fetchData("Clientes").catch(() => []),
            fetchData("Agentes").catch(() => []),
          ]);

          PROPIEDADES = props || [];
          CLIENTES = clis || [];
          AGENTES = ages || [];

          // Fallback Agentes si no hay tabla
          if (AGENTES.length === 0) {
            const unicos = [
              ...new Set(PROPIEDADES.map((p) => p.Agente).filter(Boolean)),
            ];
            AGENTES = unicos.map((a) => ({ Nombre: a }));
          }

          poblarSelects();
          aplicarFiltros();
        } catch (e) {
          console.error(e);
          alert("Error de conexión: " + e.message);
        } finally {
          hideSpinner();
        }
      }

      function poblarSelects() {
        // Select Propietarios
        const selProp = document.getElementById("propiedadPropietario");
        selProp.innerHTML =
          '<option value="">Seleccione Propietario...</option>';
        const ordenados = [...CLIENTES].sort((a, b) =>
          (a.Nombre || "").localeCompare(b.Nombre || "")
        );
        ordenados.forEach((c) => {
          selProp.innerHTML += `<option value="${c.Nombre}">${c.Nombre}</option>`;
        });

        // Select Agentes
        const selAgent = document.getElementById("propiedadAgente");
        selAgent.innerHTML = '<option value="">Seleccione Agente...</option>';
        AGENTES.forEach((a) => {
          const nom = a.Nombre || a.Agente;
          if (nom)
            selAgent.innerHTML += `<option value="${nom}">${nom}</option>`;
        });
      }

      /* ===== RENDER ===== */
      function aplicarFiltros() {
        const q = norm(document.getElementById("inpBuscar").value);
        VIEW_PROPIEDADES = PROPIEDADES.filter((p) => {
          if (!q) return true;
          const str = [
            p.Titulo,
            p.Direccion,
            p.Tipo,
            p.Propietario,
            p.Agente,
            p.Estado,
          ]
            .map((v) => norm(v))
            .join(" ");
          return str.includes(q);
        });
        renderTabla();
      }

      function renderTabla() {
        const tb = document.getElementById("tablaPropiedades");
        if (!VIEW_PROPIEDADES.length) {
          tb.innerHTML =
            '<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">Sin resultados.</td></tr>';
          return;
        }

        tb.innerHTML = VIEW_PROPIEDADES.map((p) => {
          const key = getKeyVal(p);
          const img = p.ImagenURL
            ? `<img src="${p.ImagenURL}" class="thumb-img">`
            : '<div style="width:50px;height:35px;background:#f1f5f9;border-radius:4px;"></div>';

          let stColor = "#e0f2fe";
          let stText = "#0284c7";
          const st = (p.Estado || "").toLowerCase();
          if (st === "vendido" || st === "arrendado") {
            stColor = "#dcfce7";
            stText = "#166534";
          }
          if (st === "reservado") {
            stColor = "#fef9c3";
            stText = "#854d0e";
          }

          return `<tr>
              <td>${img}</td>
              <td><div style="font-weight:600;">${
                p.Titulo || "—"
              }</div><div style="font-size:12px; color:#64748b;">${
            p.Direccion || ""
          }</div></td>
              <td>${p.Tipo || ""}</td>
              <td style="font-family:monospace;">${formatoCLP(p.Precio)}</td>
              <td><span style="background:${stColor};color:${stText};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;">${
            p.Estado || "Disponible"
          }</span></td>
              <td style="font-size:12px;">
                 <div><i class="fa-solid fa-user" style="color:#cbd5e1; width:15px;"></i>${
                   p.Propietario || "—"
                 }</div>
                 <div><i class="fa-solid fa-user-tie" style="color:#cbd5e1; width:15px;"></i>${
                   p.Agente || "—"
                 }</div>
              </td>
              <td class="no-print" style="text-align:right;">
                 <button class="btn-icon" onclick="abrirDetallePropiedad('${key}')"><i class="fa-solid fa-eye"></i></button>
                 <button class="btn-icon" onclick="abrirFormPropiedad('${key}')"><i class="fa-solid fa-pen"></i></button>
                 <button class="btn-icon" onclick="eliminarPropiedad('${key}')" style="color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`;
        }).join("");
      }

      /* ===== CRUD PROPIEDAD ===== */
      function abrirFormPropiedad(id) {
        document.getElementById("formPropiedad").reset();
        document.getElementById("propiedadID").value = "";
        document.getElementById("modalTitlePropiedad").textContent =
          "Nueva Propiedad";

        if (id) {
          const p = PROPIEDADES.find(
            (x) => String(getKeyVal(x)) === String(id)
          );
          if (p) {
            document.getElementById("modalTitlePropiedad").textContent =
              "Editar Propiedad";
            document.getElementById("propiedadID").value = id;
            document.getElementById("propiedadTitulo").value = p.Titulo || "";
            document.getElementById("propiedadDireccion").value =
              p.Direccion || "";
            document.getElementById("propiedadTipo").value = p.Tipo || "";
            document.getElementById("propiedadPrecio").value = p.Precio || 0;
            document.getElementById("propiedadEstado").value =
              p.Estado || "Disponible";
            document.getElementById("propiedadPropietario").value =
              p.Propietario || "";
            document.getElementById("propiedadAgente").value = p.Agente || "";
            document.getElementById("propiedadImagen").value =
              p.ImagenURL || "";
            document.getElementById("propiedadDorms").value =
              p.Dormitorios || "";
            document.getElementById("propiedadBanos").value = p.Banos || "";
            document.getElementById("propiedadM2C").value =
              p.MetrosConstruidos || "";
          }
        }
        document.getElementById("modalPropiedad").style.display = "flex";
      }

      function cerrarModalPropiedad() {
        document.getElementById("modalPropiedad").style.display = "none";
      }

      document.getElementById("formPropiedad").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("propiedadID").value;
        const payload = {
          Titulo: document.getElementById("propiedadTitulo").value,
          Direccion: document.getElementById("propiedadDireccion").value,
          Tipo: document.getElementById("propiedadTipo").value,
          Precio:
            parseFloat(document.getElementById("propiedadPrecio").value) || 0,
          Estado: document.getElementById("propiedadEstado").value,
          Propietario: document.getElementById("propiedadPropietario").value,
          Agente: document.getElementById("propiedadAgente").value,
          ImagenURL: document.getElementById("propiedadImagen").value,
          Dormitorios: document.getElementById("propiedadDorms").value,
          Banos: document.getElementById("propiedadBanos").value,
          MetrosConstruidos: document.getElementById("propiedadM2C").value,
          "Fecha Captacion": id
            ? PROPIEDADES.find((x) => getKeyVal(x) == id)?.[
                "Fecha Captacion"
              ] || hoyISO()
            : hoyISO(),
        };

        if (id) payload["ID"] = id;
        else payload["ID"] = generateKey("PROP");

        try {
          showSpinner();
          const action = id ? "Edit" : "Add";
          await appSheetCRUD("Propiedades", action, [payload]);
          cerrarModalPropiedad();
          await cargarTodo();
        } catch (err) {
          alert(err.message);
        } finally {
          hideSpinner();
        }
      };

      async function eliminarPropiedad(id) {
        if (!confirm("¿Eliminar?")) return;
        try {
          showSpinner();
          await appSheetCRUD("Propiedades", "Delete", [{ ID: id }]);
          await cargarTodo();
        } catch (err) {
          alert(err.message);
        } finally {
          hideSpinner();
        }
      }

      /* ===== CRUD CLIENTE (MODAL) ===== */
      function abrirModalCliente() {
        document.getElementById("formCliente").reset();
        document.getElementById("modalCliente").style.display = "flex";
      }
      function cerrarModalCliente() {
        document.getElementById("modalCliente").style.display = "none";
      }

      document.getElementById("formCliente").onsubmit = async (e) => {
        e.preventDefault();
        const nom = document.getElementById("cliNombre").value.trim();
        const payload = {
          ID: generateKey("CLI"),
          Nombre: nom,
          Email: document.getElementById("cliEmail").value,
          Telefono: document.getElementById("cliTelefono").value,
          Interes: document.getElementById("cliInteres").value,
          Estado: document.getElementById("cliEstado").value, // Corrección "Estado"
          "Fecha Creación": hoyISO(),
          Canal: "CRM Web",
        };

        try {
          showSpinner();
          await appSheetCRUD("Clientes", "Add", [payload]);
          await cargarTodo();

          // Autoseleccionar nuevo cliente
          document.getElementById("propiedadPropietario").value = nom;
          cerrarModalCliente();
        } catch (err) {
          alert(err.message);
        } finally {
          hideSpinner();
        }
      };

      /* ===== DETALLES ===== */
      function abrirDetallePropiedad(id) {
        const p = PROPIEDADES.find((x) => String(getKeyVal(x)) === String(id));
        if (!p) return;
        const imgHtml = p.ImagenURL
          ? `<img src="${p.ImagenURL}" style="width:100%;max-width:400px;border-radius:8px;margin-top:10px;">`
          : "";

        document.getElementById("detalleContenido").innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
               <div>
                  <h3 style="margin:0;">${p.Titulo}</h3>
                  <p style="color:#666;">${p.Direccion}</p>
                  <div style="display:flex; gap:10px; margin-top:10px;">
                      <div class="badge">${p.Tipo}</div>
                      <div class="badge" style="background:#f0fdf4; color:#166534;">${
                        p.Estado
                      }</div>
                  </div>
                  <h2 style="color:#0f172a; margin:15px 0;">${formatoCLP(
                    p.Precio
                  )}</h2>
                  <p><b>${p.Dormitorios || 0}</b> Dorm. | <b>${
          p.Banos || 0
        }</b> Baños | <b>${p.MetrosConstruidos || 0}</b> m²</p>
               </div>
               <div style="background:#f8fafc; padding:15px; border-radius:8px;">
                  <h4 style="margin:0 0 10px 0; color:#475569;">Ficha Interna</h4>
                  <p style="font-size:13px;"><b>Propietario:</b> ${
                    p.Propietario
                  }</p>
                  <p style="font-size:13px;"><b>Agente:</b> ${p.Agente}</p>
                  <p style="font-size:13px;"><b>Captación:</b> ${
                    p["Fecha Captacion"]
                  }</p>
               </div>
            </div>
            <div style="text-align:center;">${imgHtml}</div>
        `;
        document.getElementById("modalDetalle").style.display = "flex";
      }
      function cerrarModalDetalle() {
        document.getElementById("modalDetalle").style.display = "none";
      }

      function exportCSV() {
        const headers = [
          "ID",
          "Titulo",
          "Direccion",
          "Tipo",
          "Precio",
          "Estado",
          "Propietario",
          "Agente",
        ];
        const lines = [headers.join(",")];
        VIEW_PROPIEDADES.forEach((r) => {
          lines.push(
            [
              escapeCSV(getKeyVal(r)),
              escapeCSV(r.Titulo),
              escapeCSV(r.Direccion),
              escapeCSV(r.Tipo),
              escapeCSV(r.Precio),
              escapeCSV(r.Estado),
              escapeCSV(r.Propietario),
              escapeCSV(r.Agente),
            ].join(",")
          );
        });
        const blob = new Blob([lines.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Propiedades.csv";
        a.click();
      }

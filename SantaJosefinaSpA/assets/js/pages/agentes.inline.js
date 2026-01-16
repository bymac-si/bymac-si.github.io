// ===== Extracted from agentes.html =====

const IMGBB_API_KEY = "d096ade1d65ede2aa12f00d94094a854";
      let AGENTES = [],
        TRANSACCIONES = [],
        EDIFICIOS = [],
        TAREAS = [];
      let AGENTE_ACTUAL = null;
      let VALOR_UTM = 64000;
      let AVATAR_URL_NUEVO = "";

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
        await cargarUTM();
        await cargarTodo();
      });

      async function cargarUTM() {
        try {
          const res = await fetch("https://mindicador.cl/api/utm");
          const data = await res.json();
          if (data.serie && data.serie.length > 0) {
            VALOR_UTM = parseInt(data.serie[0].valor);
            const lbl = document.getElementById("lblUTM");
            if (lbl) lbl.textContent = clp(VALOR_UTM);
          }
        } catch (e) {
          console.warn("UTM Offline.");
        }
      }

      async function cargarTodo() {
        showSpinner();
        try {
          const [agentes, trans, copros, tareas] = await Promise.all([
            fetchData("Agentes").catch(() => []),
            fetchData("Transacciones").catch(() => []),
            fetchData("Copropiedades").catch(() => []),
            fetchData("Tareas").catch(() => []),
          ]);
          AGENTES = agentes || [];
          TRANSACCIONES = trans || [];
          EDIFICIOS = copros || [];
          TAREAS = tareas || [];
          poblarSelectEdificios();
          renderTabla();
          calcularTotalMes();
        } catch (e) {
          console.error(e);
        } finally {
          hideSpinner();
        }
      }

      function poblarSelectEdificios() {
        const sel = document.getElementById("selEdificio");
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Elige un edificio --</option>';
        EDIFICIOS.forEach((e) => {
          const u = e.Unidades || e.CantidadUnidades || 0;
          sel.innerHTML += `<option value="${e.ID}" data-unidades="${u}" data-nombre="${e.Nombre}">${e.Nombre}</option>`;
        });
      }

      /* RENDER TABLA */
      function renderTabla() {
        const tb = document.getElementById("tablaAgentes");
        tb.innerHTML = "";
        const tareasTotales = TAREAS.filter(
          (t) => t.Estado !== "Completada"
        ).length;
        document.getElementById("kpiTotalTareas").innerText = tareasTotales;

        AGENTES.forEach((a) => {
          const negocios = TRANSACCIONES.filter(
            (t) => String(t.AgenteID) === String(a.ID)
          );
          const total = negocios.reduce(
            (s, t) => s + (parseInt(t.PagoAgente) || 0),
            0
          );
          const misTareas = TAREAS.filter(
            (t) =>
              String(t.AgenteID) === String(a.ID) && t.Estado !== "Completada"
          );

          // Estrellas
          const r = parseInt(a.Calificacion) || 3;
          let stars = "";
          for (let i = 1; i <= 5; i++) {
            stars +=
              i <= r
                ? '<i class="fa-solid fa-star" style="color:#f59e0b"></i>'
                : '<i class="fa-regular fa-star" style="color:#cbd5e1"></i>';
          }

          let avatarHTML = `<div class="avatar">${a.Nombre.charAt(
            0
          ).toUpperCase()}</div>`;
          if (a.Avatar && a.Avatar.startsWith("http"))
            avatarHTML = `<div class="avatar"><img src="${a.Avatar}"></div>`;

          tb.innerHTML += `
            <tr>
                <td>${avatarHTML}</td>
                <td><div style="font-weight:600;">${a.Nombre}</div></td>
                <td><div style="font-size:12px; color:#64748b;">${
                  a.Rol || "Agente"
                }<br>${a.Email}</div></td>
                <td style="color:#f59e0b; letter-spacing:1px; font-size:12px;">${stars}</td> <td style="text-align:center; font-weight:700;">${
            negocios.length
          }</td>
                <td style="text-align:center;"><span class="badge-priority p-Media">${
                  misTareas.length
                } Pen.</span></td>
                <td style="text-align:right;"><span style="background:#ecfdf5; color:#065f46; padding:4px 10px; border-radius:20px; font-weight:700;">${clp(
                  total
                )}</span></td>
                <td style="text-align:right;">
                    <button class="btn-primary btn-sm" onclick='abrirModalAgente("${
                      a.ID
                    }")' title="Editar Datos"><i class="fa-solid fa-user-pen"></i></button>
                    <button class="btn-primary btn-sm" style="background:#0f766e;" onclick='abrirModalTareas("${
                      a.ID
                    }")' title="Tareas"><i class="fa-solid fa-list-check"></i></button>
                    <button class="btn-primary btn-sm" style="background:#3b82f6;" onclick='abrirModalGestion("${
                      a.ID
                    }")' title="Negocios"><i class="fa-solid fa-briefcase"></i></button>
                </td>
            </tr>`;
        });

        if (AGENTES.length === 0)
          tb.innerHTML = `<tr><td colspan="8" style="text-align:center;">Sin datos.</td></tr>`;
      }

      function calcularTotalMes() {
        const total = TRANSACCIONES.reduce(
          (s, t) => s + (parseInt(t.PagoAgente) || 0),
          0
        );
        document.getElementById("kpiTotalComision").innerText = clp(total);
      }

      function abrirModalAgente(id) {
        document.getElementById("formAgente").reset();
        document.getElementById("agenteID").value = "";
        AVATAR_URL_NUEVO = "";
        document.getElementById("previewAvatar").style.display = "none";
        document.getElementById("avatarInitials").style.display = "flex";
        document.getElementById("modalTitleAgente").textContent =
          "Nuevo Agente";

        if (id) {
          const a = AGENTES.find((x) => String(x.ID) === String(id));
          if (a) {
            document.getElementById("modalTitleAgente").textContent =
              "Editar Agente";
            document.getElementById("agenteID").value = a.ID;
            document.getElementById("agenteNombre").value = a.Nombre;
            document.getElementById("agenteEmail").value = a.Email;
            document.getElementById("agenteTelefono").value = a.Telefono;
            document.getElementById("agenteRol").value = a.Rol || "Agente";
            if (a.Avatar && a.Avatar.startsWith("http")) {
              document.getElementById("previewAvatar").src = a.Avatar;
              document.getElementById("previewAvatar").style.display = "block";
              document.getElementById("avatarInitials").style.display = "none";
            }
          }
        }
        document.getElementById("modalAgente").style.display = "flex";
      }

      document.getElementById("formAgente").onsubmit = async (e) => {
        e.preventDefault();
        showSpinner();
        const id = document.getElementById("agenteID").value;
        const payload = {
          Nombre: document.getElementById("agenteNombre").value,
          Email: document.getElementById("agenteEmail").value,
          Telefono: document.getElementById("agenteTelefono").value,
          Rol: document.getElementById("agenteRol").value,
          Activo: true,
        };
        if (AVATAR_URL_NUEVO) payload["Avatar"] = AVATAR_URL_NUEVO;
        if (id) payload["ID"] = id;
        else payload["ID"] = "AGE_" + Date.now();

        try {
          const action = id ? "Edit" : "Add";
          await appSheetCRUD("Agentes", action, [payload]);
          cerrarModal("modalAgente");
          await cargarTodo();
        } catch (err) {
          alert(err.message);
        } finally {
          hideSpinner();
        }
      };

      function abrirModalTareas(id) {
        const a = AGENTES.find((x) => String(x.ID) === String(id));
        if (!a) return;
        document.getElementById("tareaAgenteID").value = a.ID;
        document.getElementById("formTarea").reset();
        document.getElementById("tareaFecha").valueAsDate = new Date();
        renderTareasAgente(a.ID);
        document.getElementById("modalTareas").style.display = "flex";
      }

      function renderTareasAgente(id) {
        const lista = document.getElementById("listaTareasContainer");
        const misTareas = TAREAS.filter(
          (t) => String(t.AgenteID) === String(id)
        );
        misTareas.sort(
          (a, b) => (a.Estado === "Completada") - (b.Estado === "Completada")
        );

        if (misTareas.length === 0) {
          lista.innerHTML =
            '<div style="text-align:center; color:#94a3b8; padding:20px;">Sin tareas asignadas.</div>';
          return;
        }

        lista.innerHTML = misTareas
          .map((t) => {
            const done = t.Estado === "Completada";
            const style = done
              ? "opacity:0.6; text-decoration:line-through;"
              : "";
            const btnAction = done
              ? `<button class="btn-primary btn-sm btn-outline" onclick="cambiarEstadoTarea('${t.ID}', 'Pendiente')"><i class="fa-solid fa-rotate-left"></i></button>`
              : `<button class="btn-primary btn-sm" style="background:#166534;" onclick="cambiarEstadoTarea('${t.ID}', 'Completada')"><i class="fa-solid fa-check"></i></button>`;

            return `
            <div class="task-item">
                <div style="${style}">
                    <div style="font-weight:bold; color:#334155;">${
                      t["Título"]
                    }</div>
                    <div style="font-size:12px; color:#64748b;">${
                      t["Descripción"] || ""
                    }</div>
                    <div class="task-meta">
                        <span class="badge-priority p-${t.Prioridad}">${
              t.Prioridad
            }</span>
                        <span><i class="fa-regular fa-clock"></i> ${
                          t.FechaLimite || "-"
                        }</span>
                    </div>
                </div>
                <div>${btnAction}</div>
            </div>`;
          })
          .join("");
      }

      document.getElementById("formTarea").onsubmit = async (e) => {
        e.preventDefault();
        showSpinner();
        const agenteID = document.getElementById("tareaAgenteID").value;
        const payload = {
          ID: "TSK_" + Date.now(),
          AgenteID: agenteID,
          Título: document.getElementById("tareaTitulo").value,
          Descripción: document.getElementById("tareaDesc").value,
          Prioridad: document.getElementById("tareaPrioridad").value,
          FechaLimite: document.getElementById("tareaFecha").value,
          Estado: "Pendiente",
          FechaCreación: new Date().toISOString().split("T")[0],
        };
        try {
          await appSheetCRUD("Tareas", "Add", [payload]);
          document.getElementById("formTarea").reset();
          TAREAS.push(payload);
          renderTareasAgente(agenteID);
          renderTabla();
        } catch (e) {
          alert(e.message);
        } finally {
          hideSpinner();
        }
      };

      async function cambiarEstadoTarea(id, nuevoEstado) {
        showSpinner();
        try {
          await appSheetCRUD("Tareas", "Edit", [
            { ID: id, Estado: nuevoEstado },
          ]);
          const t = TAREAS.find((x) => x.ID === id);
          if (t) t.Estado = nuevoEstado;
          const agenteID = document.getElementById("tareaAgenteID").value;
          renderTareasAgente(agenteID);
          renderTabla();
        } catch (e) {
          alert(e.message);
        } finally {
          hideSpinner();
        }
      }

      function abrirModalGestion(id) {
        const a = AGENTES.find((x) => String(x.ID) === String(id));
        if (!a) return;
        AGENTE_ACTUAL = a;
        document.getElementById("mdlNombre").textContent = a.Nombre;
        document.getElementById("mdlEmail").textContent = a.Email;
        document.getElementById("gestionAgenteID").value = a.ID;
        document.getElementById("inpRating").value = a.Calificacion || 3;

        const avatarContainer = document.getElementById("mdlGestionAvatar");
        if (a.Avatar && a.Avatar.startsWith("http"))
          avatarContainer.innerHTML = `<img src="${a.Avatar}">`;
        else
          avatarContainer.innerHTML = `<div style="display:flex; width:100%; height:100%; align-items:center; justify-content:center; font-size:30px; color:#cbd5e1;"><i class="fa-solid fa-user"></i></div>`;

        document.getElementById("formTransaccion").reset();
        toggleCalculadora();
        renderHistorial();
        document.getElementById("modalGestion").style.display = "flex";
      }

      /* --- CORRECCIÓN: ACTUALIZAR CALIFICACIÓN --- */
      document.getElementById("formPerfil").onsubmit = async (e) => {
        e.preventDefault();
        showSpinner();

        const id = document.getElementById("gestionAgenteID").value;
        const cal = document.getElementById("inpRating").value;

        if (!id) {
          hideSpinner();
          return alert("Error: Agente no identificado.");
        }

        try {
          await appSheetCRUD("Agentes", "Edit", [
            { ID: id, Calificacion: cal },
          ]);

          const index = AGENTES.findIndex((a) => String(a.ID) === String(id));
          if (index !== -1) {
            AGENTES[index].Calificacion = cal;
            AGENTE_ACTUAL = AGENTES[index];
          }

          let stars = "";
          for (let i = 1; i <= 5; i++) {
            stars += i <= parseInt(cal) ? "★" : "☆";
          }
          document.getElementById("mdlStars").innerHTML = stars;
          renderTabla();
          alert("Calificación actualizada.");
        } catch (err) {
          console.error(err);
          alert("Error al actualizar: " + err.message);
        } finally {
          hideSpinner();
        }
      };

      /* UTILS & HELPERS */
      function toggleCalculadora() {
        const tipo = document.getElementById("tTipo").value;
        document.getElementById("calcAdmin").style.display =
          tipo === "Captacion" ? "block" : "none";
        document.getElementById("calcVenta").style.display =
          tipo !== "Captacion" ? "block" : "none";
        document.getElementById("divSelectEdificios").style.display =
          tipo === "Captacion" ? "block" : "none";
        document.getElementById("divInputManual").style.display =
          tipo !== "Captacion" ? "block" : "none";
      }

      function seleccionarEdificio() {
        const sel = document.getElementById("selEdificio");
        const opt = sel.options[sel.selectedIndex];
        if (opt.value) {
          document.getElementById("tPropiedad").value =
            opt.getAttribute("data-nombre");
          document.getElementById("cUnidades").value =
            opt.getAttribute("data-unidades") || 0;
          calcularAuto();
        }
      }

      function calcularAuto() {
        const unid = parseInt(document.getElementById("cUnidades").value) || 0;
        const fac = parseFloat(document.getElementById("cFactor").value) || 0;
        if (unid > 0 && fac > 0) {
          const base = VALOR_UTM * 2.15;
          let netoTeorico =
            unid < 20
              ? base * fac
              : (base + (unid - 20) * (base * 0.013)) * fac;
          const honorarioNeto = Math.round(netoTeorico / 1000) * 1000;
          document.getElementById("lblHonorarioTotal").innerText = clp(
            Math.round(honorarioNeto * 1.19)
          );
          const comision = Math.round(honorarioNeto * 0.5);
          document.getElementById("lblPagoAgente").innerText = clp(comision);
          document.getElementById("tPagoFinal").value = comision;
        }
      }

      function calcularVenta() {
        const monto = parseInt(document.getElementById("vMonto").value) || 0;
        const pctEmpresa =
          parseFloat(document.getElementById("vPctEmpresa").value) / 100;
        const pctAgente =
          parseFloat(document.getElementById("vPctAgente").value) / 100;
        if (monto > 0) {
          const ingresoNeto = Math.round((monto * pctEmpresa) / 1.19);
          const pago = Math.round(ingresoNeto * pctAgente);
          document.getElementById("lblPagoVenta").innerText = clp(pago);
          document.getElementById("tPagoFinal").value = pago;
        }
      }

      function renderHistorial() {
        const div = document.getElementById("listaTransacciones");
        const list = TRANSACCIONES.filter(
          (t) => String(t.AgenteID) === String(AGENTE_ACTUAL.ID)
        ).reverse();
        if (list.length === 0) {
          div.innerHTML =
            '<div style="color:#94a3b8; font-size:13px; text-align:center;">Sin negocios.</div>';
          return;
        }
        div.innerHTML = list
          .map(
            (t) => `
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding:10px 0; font-size:13px;">
                <div><span style="font-weight:700; color:#475569;">[${
                  t.Tipo
                }]</span> ${
              t.Propiedad
            } <div style="font-size:11px; color:#cbd5e1;">${t.Fecha}</div></div>
                <div style="font-weight:700; color:#166534;">${clp(
                  t.PagoAgente
                )}</div>
            </div>`
          )
          .join("");
      }

      async function previewFile() {
        const file = document.getElementById("inpAvatarFile").files[0];
        if (!file || !IMGBB_API_KEY) return;
        showSpinner();
        const formData = new FormData();
        formData.append("image", file);
        try {
          const res = await fetch(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            { method: "POST", body: formData }
          );
          const data = await res.json();
          if (data.success) {
            AVATAR_URL_NUEVO = data.data.url;
            document.getElementById("previewAvatar").src = AVATAR_URL_NUEVO;
            document.getElementById("previewAvatar").style.display = "block";
            document.getElementById("avatarInitials").style.display = "none";
          }
        } catch (e) {
          console.error(e);
        } finally {
          hideSpinner();
        }
      }

      function showSpinner() {
        document.getElementById("spinner").style.display = "flex";
      }
      function hideSpinner() {
        document.getElementById("spinner").style.display = "none";
      }
      function clp(n) {
        return "$" + new Intl.NumberFormat("es-CL").format(Math.round(n) || 0);
      }
      function cerrarModal(id) {
        document.getElementById(id).style.display = "none";
      }

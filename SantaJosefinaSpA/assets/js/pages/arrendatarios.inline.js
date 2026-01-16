// ===== Extracted from arrendatarios.html =====

(function () {
        // Asegúrate de que esta sea tu Public Key correcta
        emailjs.init("7Il4AhmGHchP7qfxu");
      })();
      requireAuth();

/* ===== ESTADO ===== */
      let CONTRATOS = [],
        PROPIEDADES = [],
        ACTUAL_ID = null;

      /* ===== INICIO ===== */
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

        await cargarTodo();
      });

      async function cargarTodo() {
        showSpinner();
        try {
          // CARGAMOS CONTRATOS Y PROPIEDADES PARA HACER EL CRUCE (JOIN)
          const [contratos, props] = await Promise.all([
            fetchData("ContratosArriendo").catch(() => []),
            fetchData("Propiedades").catch(() => []),
          ]);
          CONTRATOS = contratos || [];
          PROPIEDADES = props || [];

          renderTabla(CONTRATOS);
        } catch (e) {
          console.error(e);
        } finally {
          hideSpinner();
        }
      }

      /* ===== RENDER & FILTROS ===== */
      function filtrar() {
        const q = document.getElementById("inpBuscar").value.toLowerCase();
        const filtrados = CONTRATOS.filter((c) => {
          // Buscar nombre de propiedad
          const prop = PROPIEDADES.find(
            (p) => String(p.ID) === String(c.PropiedadID)
          );
          const nombreProp = prop ? prop.Titulo || prop.Direccion || "" : "";

          return (
            (c["Nombre Arrendatario"] || "").toLowerCase().includes(q) ||
            (c["RUT Arrendatario"] || "").toLowerCase().includes(q) ||
            nombreProp.toLowerCase().includes(q) ||
            (c.PropiedadID || "").toLowerCase().includes(q)
          );
        });
        renderTabla(filtrados);
      }

      function renderTabla(lista) {
        const tb = document.getElementById("tablaContratos");
        tb.innerHTML = "";

        if (lista.length === 0) {
          tb.innerHTML =
            '<tr><td colspan="7" style="text-align:center; padding:20px; color:#999;">No hay contratos encontrados.</td></tr>';
          return;
        }

        lista.forEach((c) => {
          // 1. Buscar Datos Propiedad
          const prop = PROPIEDADES.find(
            (p) => String(p.ID) === String(c.PropiedadID)
          );
          const nombrePropiedad = prop
            ? prop.Titulo || prop.Direccion
            : c.PropiedadID || "Sin Propiedad";
          const imagenPropiedad =
            prop && prop.ImagenURL
              ? `<img src="${prop.ImagenURL}" style="width:30px; height:30px; border-radius:4px; object-fit:cover; margin-right:5px; vertical-align:middle;">`
              : "";

          // 2. Lógica de Semáforo de Pago
          const hoy = new Date().getDate();
          const diaPago = parseInt(c["Dia Pago"]);
          let badge = '<span class="badge-pago bg-ok">Al día</span>';

          if (hoy > diaPago)
            badge = '<span class="badge-pago bg-warn">Por Vencer</span>';
          if (hoy > diaPago + 5)
            badge = '<span class="badge-pago bg-danger">Atrasado</span>';

          tb.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 15px;">
                        <div style="font-weight: bold; color: #1e293b;">${
                          c["Nombre Arrendatario"]
                        }</div>
                        <div style="font-size: 12px; color: #64748b;">${
                          c["RUT Arrendatario"]
                        }</div>
                    </td>
                    <td style="padding: 15px; font-size:13px;">
                        ${imagenPropiedad} 
                        <b>${nombrePropiedad}</b>
                    </td>
                    <td style="padding: 15px; font-weight:700;">$${parseInt(
                      c["Monto Arriendo"]
                    ).toLocaleString()}</td>
                    <td style="padding: 15px;">Día ${c["Dia Pago"]}</td>
                    <td style="padding: 15px; font-size: 12px;">${
                      c["Fecha Inicio"]
                    }<br>al ${c["Fecha Fin"]}</td>
                    <td style="padding: 15px;">${badge}</td>
                    <td style="padding: 15px; text-align: right;">
                        <button class="btn-icon" onclick="gestionar('${
                          c.ID
                        }')" title="Cobranza y Bitácora" style="background:#e0f2fe; color:#0369a1;"><i class="fa-solid fa-comments-dollar"></i></button>
                        <button class="btn-icon" onclick="editar('${
                          c.ID
                        }')" title="Editar Contrato"><i class="fa-solid fa-pen"></i></button>
                    </td>
                </tr>`;
        });
      }

      /* ===== EMAIL & GESTIÓN ===== */
      async function gestionar(id) {
        ACTUAL_ID = id;
        const c = CONTRATOS.find((x) => x.ID === id);

        // Buscar nombre propiedad para el título del modal
        let nombreProp = c.PropiedadID;
        const p = PROPIEDADES.find(
          (item) => String(item.ID) === String(c.PropiedadID)
        );
        if (p) nombreProp = p.Titulo || p.Direccion;

        if (c)
          document.getElementById(
            "lblClienteGestion"
          ).innerText = `${c["Nombre Arrendatario"]} - ${nombreProp}`;

        document.getElementById("modalGestion").style.display = "flex";
        cargarBitacora();
      }

      /* 1. ENVIAR RECORDATORIO DE PAGO */
      async function enviarRecordatorioPago() {
        const c = CONTRATOS.find((x) => x.ID === ACTUAL_ID);
        if (!c || !c.Email)
          return alert("Error: El cliente no tiene email registrado.");

        // Buscar datos propiedad para el email
        const p = PROPIEDADES.find(
          (item) => String(item.ID) === String(c.PropiedadID)
        );
        const nombreProp = p ? p.Titulo || p.Direccion : c.PropiedadID;

        if (
          !confirm(
            `¿Enviar recordatorio de pago a ${c["Nombre Arrendatario"]}?`
          )
        )
          return;

        showSpinner("Enviando correo...");

        const htmlBody = `
                <div style="font-family:sans-serif; color:#333; border:1px solid #eee; padding:20px; border-radius:8px;">
                    <h2 style="color:#f59e0b;">Recordatorio de Pago</h2>
                    <p>Estimado(a) <strong>${
                      c["Nombre Arrendatario"]
                    }</strong>,</p>
                    <p>Le recordamos amablemente que el pago de arriendo para la propiedad <strong>${nombreProp}</strong> vence el día <strong>${
          c["Dia Pago"]
        }</strong> del presente mes.</p>
                    <div style="background:#f9fafb; padding:15px; border-left:4px solid #f59e0b; margin:15px 0;">
                        <p><strong>Monto a pagar:</strong> $${parseInt(
                          c["Monto Arriendo"]
                        ).toLocaleString()}</p>
                    </div>
                    <p>Favor enviar comprobante a este correo.</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
                    <small style="color:#666;">Santa Josefina SpA - Gestión Inmobiliaria</small>
                </div>
            `;

        try {
          await emailjs.send("service_p9hqkqn", "template_80q9psi", {
            to_email: c.Email,
            subject: "Recordatorio de Pago Arriendo - " + nombreProp,
            html_body: htmlBody,
          });

          await appSheetCRUD("Bitacora", "Add", [
            {
              ID: "BIT_" + Date.now(),
              ProspectoID: ACTUAL_ID,
              Fecha: new Date().toISOString().split("T")[0],
              Tipo: "Cobranza",
              Nota: "Se envió recordatorio de pago automático.",
              Usuario: "Sistema",
            },
          ]);

          alert("Correo enviado exitosamente.");
          cargarBitacora();
        } catch (e) {
          console.error(e);
          alert("Error al enviar correo: " + JSON.stringify(e));
        } finally {
          hideSpinner();
        }
      }

      /* 2. ENVIAR ACUSE DE RECIBO (PAGO OK) */
      async function enviarAcuseRecibo() {
        const c = CONTRATOS.find((x) => x.ID === ACTUAL_ID);
        if (!c || !c.Email) return alert("El cliente no tiene email.");

        const p = PROPIEDADES.find(
          (item) => String(item.ID) === String(c.PropiedadID)
        );
        const nombreProp = p ? p.Titulo || p.Direccion : c.PropiedadID;

        if (
          !confirm(
            `¿Confirmar recepción del pago y enviar comprobante a ${c["Nombre Arrendatario"]}?`
          )
        )
          return;

        showSpinner("Procesando...");

        const htmlBody = `
                <div style="font-family:sans-serif; color:#333; border:1px solid #eee; padding:20px; border-radius:8px;">
                    <h2 style="color:#10b981;">Pago Recibido Exitosamente</h2>
                    <p>Estimado(a) <strong>${
                      c["Nombre Arrendatario"]
                    }</strong>,</p>
                    <p>Hemos recibido correctamente su pago de arriendo para la propiedad <strong>${nombreProp}</strong>.</p>
                    <div style="background:#f0fdf4; padding:15px; border-left:4px solid #10b981; margin:15px 0;">
                        <p><strong>Monto Recibido:</strong> $${parseInt(
                          c["Monto Arriendo"]
                        ).toLocaleString()}</p>
                        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Estado:</strong> PAGADO</p>
                    </div>
                    <p>Muchas gracias por su puntualidad.</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
                    <small style="color:#666;">Santa Josefina SpA</small>
                </div>
            `;

        try {
          await emailjs.send("service_p9hqkqn", "template_80q9psi", {
            to_email: c.Email,
            subject: "Comprobante de Pago Arriendo - " + nombreProp,
            html_body: htmlBody,
          });

          await appSheetCRUD("Bitacora", "Add", [
            {
              ID: "BIT_" + Date.now(),
              ProspectoID: ACTUAL_ID,
              Fecha: new Date().toISOString().split("T")[0],
              Tipo: "Pago",
              Nota: "Pago recibido y notificado al cliente.",
              Usuario: "Sistema",
            },
          ]);

          alert("Comprobante enviado.");
          cargarBitacora();
        } catch (e) {
          console.error(e);
          alert("Error al enviar: " + JSON.stringify(e));
        } finally {
          hideSpinner();
        }
      }

      /* 3. REGISTRO MANUAL */
      async function registrarPagoManual() {
        const nota = prompt(
          "Ingrese detalle del pago (Ej: Transferencia Banco Estado):"
        );
        if (!nota) return;

        showSpinner();
        try {
          await appSheetCRUD("Bitacora", "Add", [
            {
              ID: "BIT_" + Date.now(),
              ProspectoID: ACTUAL_ID,
              Fecha: new Date().toISOString().split("T")[0],
              Tipo: "Pago",
              Nota: "Registro Manual: " + nota,
              Usuario:
                typeof getAuthUser === "function"
                  ? getAuthUser().nombre
                  : "Admin",
            },
          ]);
          cargarBitacora();
        } catch (e) {
          alert(e.message);
        } finally {
          hideSpinner();
        }
      }

      /* 4. CARGAR BITÁCORA */
      async function cargarBitacora() {
        const div = document.getElementById("timelineContainer");
        div.innerHTML =
          '<div style="text-align:center; color:#999;">Cargando historial...</div>';

        try {
          const logs = await fetchData("Bitacora").catch(() => []);
          const misLogs = logs
            .filter((l) => l.ProspectoID === ACTUAL_ID)
            .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

          if (misLogs.length === 0) {
            div.innerHTML =
              '<div style="text-align:center; padding:20px; color:#cbd5e1;">Sin interacciones registradas.</div>';
            return;
          }

          div.innerHTML = misLogs
            .map(
              (l) => `
                    <div class="chat-bubble ${l.Tipo}">
                        <div style="display:flex; justify-content:space-between; color:#64748b; font-size:11px; margin-bottom:4px;">
                            <span>${l.Fecha} • <b>${l.Tipo}</b></span>
                            <span>${l.Usuario || "Sistema"}</span>
                        </div>
                        <div>${l.Nota}</div>
                    </div>
                `
            )
            .join("");
        } catch (e) {
          console.error(e);
        }
      }

      async function guardarNota() {
        const nota = document.getElementById("txtNota").value;
        if (!nota) return;
        showSpinner();
        try {
          await appSheetCRUD("Bitacora", "Add", [
            {
              ID: "BIT_" + Date.now(),
              ProspectoID: ACTUAL_ID,
              Fecha: new Date().toISOString().split("T")[0],
              Tipo: "Nota",
              Nota: nota,
              Usuario:
                typeof getAuthUser === "function"
                  ? getAuthUser().nombre
                  : "Agente",
            },
          ]);
          document.getElementById("txtNota").value = "";
          cargarBitacora();
        } catch (e) {
          alert(e.message);
        } finally {
          hideSpinner();
        }
      }

      /* ===== CRUD BÁSICO ===== */
      function abrirModalContrato() {
        document.getElementById("formContrato").reset();
        document.getElementById("contID").value = "";
        document.getElementById("modalContrato").style.display = "flex";
      }
      function cerrarModal(id) {
        document.getElementById(id).style.display = "none";
      }

      function editar(id) {
        const c = CONTRATOS.find((x) => x.ID === id);
        if (!c) return;
        document.getElementById("contID").value = c.ID;
        document.getElementById("cRut").value = c["RUT Arrendatario"];
        document.getElementById("cNombre").value = c["Nombre Arrendatario"];
        document.getElementById("cPropiedad").value = c.PropiedadID;
        document.getElementById("cMonto").value = c["Monto Arriendo"];
        document.getElementById("cDia").value = c["Dia Pago"];
        document.getElementById("cEmail").value = c.Email;
        document.getElementById("cTel").value = c.telefono;
        document.getElementById("cInicio").value = c["Fecha Inicio"];
        document.getElementById("cFin").value = c["Fecha Fin"];
        document.getElementById("modalContrato").style.display = "flex";
      }

      document.getElementById("formContrato").onsubmit = async (e) => {
        e.preventDefault();
        showSpinner("Guardando...");
        const id = document.getElementById("contID").value;
        const payload = {
          "RUT Arrendatario": document.getElementById("cRut").value,
          "Nombre Arrendatario": document.getElementById("cNombre").value,
          PropiedadID: document.getElementById("cPropiedad").value,
          "Monto Arriendo": document.getElementById("cMonto").value,
          "Dia Pago": document.getElementById("cDia").value,
          Email: document.getElementById("cEmail").value,
          telefono: document.getElementById("cTel").value,
          "Fecha Inicio": document.getElementById("cInicio").value,
          "Fecha Fin": document.getElementById("cFin").value,
          Estado: "Activo",
        };

        if (id) payload["ID"] = id;
        else payload["ID"] = "CTR_" + Date.now();

        try {
          const action = id ? "Edit" : "Add";
          await appSheetCRUD("ContratosArriendo", action, [payload]);
          cerrarModal("modalContrato");
          cargarTodo();
        } catch (e) {
          alert(e.message);
        } finally {
          hideSpinner();
        }
      };

      /* UTILS */
      function showSpinner(msg) {
        const sp = document.getElementById("spinner");
        sp.style.display = "grid";
      }
      function hideSpinner() {
        document.getElementById("spinner").style.display = "none";
      }

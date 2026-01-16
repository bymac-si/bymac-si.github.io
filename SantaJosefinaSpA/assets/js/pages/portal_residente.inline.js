// ===== Extracted from portal_residente.html =====

let USUARIO = null;
      let DATOS_COMUNIDAD = null;
      let DATOS_UNIDAD = null;

      // --- INICIO SEGURO ---
      document.addEventListener("DOMContentLoaded", async () => {
        try {
          // 1. Obtener Sesión
          const sesionStr = localStorage.getItem("sesion_externa");
          if (!sesionStr) throw new Error("No session");

          const sesionObj = JSON.parse(sesionStr);
          USUARIO = sesionObj.datos; // Datos crudos del login

          // Render Básico
          const nombre = (USUARIO.Nombre || "Usuario").split(" ")[0];
          safeUpdate("residenteNombre", nombre);
          safeUpdate("residenteUnidad", "...");

          // 2. Cargar Datos
          await cargarTodo();
        } catch (e) {
          console.error("Error crítico de sesión:", e);
          window.location.href = "login_residente.html";
        } finally {
          document.getElementById("loader").style.display = "none";
        }
      });

      async function cargarTodo() {
        try {
          const [
            copropiedades,
            unidades,
            gastosComunes,
            gastos,
            cobros,
            pagos,
            reservas,
          ] = await Promise.all([
            fetchData("Copropiedades"),
            fetchData("Unidades"),
            fetchData("GastosComunes").catch(() => []),
            fetchData("Gastos").catch(() => []),
            fetchData("Cobros").catch(() => []),
            fetchData("Pagos").catch(() => []),
            fetchData("Reservas").catch(() => []),
          ]);

          // 3. Vincular Unidad y Comunidad
          // Usamos comparaciones flexibles (String y trim)
          const myUnidadID = String(USUARIO.UnidadID).trim();

          DATOS_UNIDAD = unidades.find(
            (u) => String(getKeyVal(u)) === myUnidadID
          );

          // Si encontramos la unidad, obtenemos el ID de la comunidad desde ahí (más seguro)
          // Si no, tratamos de usar el que viene en el usuario
          let coproID = DATOS_UNIDAD
            ? String(DATOS_UNIDAD.CopropiedadID)
            : String(USUARIO.CopropiedadID);

          DATOS_COMUNIDAD = copropiedades.find(
            (c) => String(getKeyVal(c)) === coproID
          );

          // Render Header
          if (DATOS_COMUNIDAD)
            safeUpdate("nombreEdificio", DATOS_COMUNIDAD.Nombre);
          if (DATOS_UNIDAD) {
            const nombreReal =
              DATOS_UNIDAD.Unidad ||
              DATOS_UNIDAD.Numero ||
              DATOS_UNIDAD.Nombre ||
              myUnidadID;
            safeUpdate("residenteUnidad", nombreReal);
          } else {
            safeUpdate("residenteUnidad", "Unidad no encontrada");
          }

          // 4. Procesar Datos
          await procesarDeudaDelMes(gastosComunes, gastos, cobros);
          renderNotificaciones(pagos, reservas);
        } catch (err) {
          console.error("Error cargando datos:", err);
          // No redirigimos al login aquí para evitar loop, solo mostramos error visual
          safeUpdate("montoTotal", "--");
          safeUpdate("textoEstadoDeuda", "Error de conexión");
        }
      }

      async function procesarDeudaDelMes(
        gastosComunes,
        gastos,
        cobrosExistentes
      ) {
        try {
          if (!DATOS_UNIDAD) return; // No podemos calcular sin unidad

          const fechaHoy = new Date();
          // Formato MM-YYYY (Ej: 01-2026)
          const mesStr = `${String(fechaHoy.getMonth() + 1).padStart(
            2,
            "0"
          )}-${fechaHoy.getFullYear()}`;

          // Buscar cobro YA generado para este mes
          const cobroRegistrado = cobrosExistentes.find(
            (c) =>
              String(c.UnidadID) === String(USUARIO.UnidadID) &&
              c.Mes === mesStr
          );

          let totalVisual = 0;
          let estadoTexto = "Calculando...";
          let estadoClase = "";

          if (cobroRegistrado) {
            // Ya existe cobro oficial
            if (cobroRegistrado.Estado === "Pagado") {
              // Buscar deudas anteriores
              const deudasViejas = cobrosExistentes.filter(
                (c) =>
                  String(c.UnidadID) === String(USUARIO.UnidadID) &&
                  c.Estado === "Pendiente"
              );
              totalVisual = deudasViejas.reduce(
                (sum, c) => sum + parseMonto(c.TotalAPagar),
                0
              );

              if (totalVisual > 0) {
                estadoTexto = "Deuda Anterior";
                estadoClase = "pending";
              } else {
                estadoTexto = "¡Estás al día!";
                estadoClase = "clean";
              }
            } else {
              // Mes actual pendiente
              totalVisual = parseMonto(cobroRegistrado.TotalAPagar);
              estadoTexto = "Por Pagar";
              estadoClase = "pending";
            }
          } else {
            // No hay cobro oficial aun -> Mostrar proyección o $0
            // Para evitar confusiones, mostraremos deudas previas si hay
            const deudasViejas = cobrosExistentes.filter(
              (c) =>
                String(c.UnidadID) === String(USUARIO.UnidadID) &&
                c.Estado === "Pendiente"
            );
            totalVisual = deudasViejas.reduce(
              (sum, c) => sum + parseMonto(c.TotalAPagar),
              0
            );

            if (totalVisual > 0) {
              estadoTexto = "Deuda Acumulada";
              estadoClase = "pending";
            } else {
              estadoTexto = "Sin cobros pendientes";
              estadoClase = "clean";
            }
          }

          // Render UI
          safeUpdate("montoTotal", clp(totalVisual));
          safeUpdate("textoEstadoDeuda", estadoTexto);

          const card = document.getElementById("cardDeudaContainer");
          const btn = document.getElementById("btnPagarContainer");

          // Aplicar estilos
          card.className = "debt-card " + estadoClase; // clean o pending
          document.getElementById("textoEstadoDeuda").style.color =
            estadoClase === "pending" ? "#ef4444" : "#10b981";

          // Botón Pagar: Mostrar siempre que haya deuda, o permitir reportar aunque sea 0 (opcional)
          // Aquí lo mostramos siempre para facilitar el reporte
          btn.style.display = "block";
        } catch (e) {
          console.error("Error cálculo deuda:", e);
        }
      }

      function renderNotificaciones(pagos, reservas) {
        const board = document.getElementById("notifBoard");
        if (!board) return;

        const items = [];
        // Filtramos por UnidadID
        const myID = String(USUARIO.UnidadID);

        pagos.forEach((p) => {
          if (String(p.UnidadID) === myID) {
            if (p.Estado === "Aprobado")
              items.push({
                type: "success",
                title: "Pago Aprobado",
                desc: `Monto: ${clp(parseMonto(p.Monto))}`,
                date: p.FechaRegistro,
              });
            if (p.Estado === "Rechazado")
              items.push({
                type: "error",
                title: "Pago Rechazado",
                desc: p.Observaciones || "Revisa el comprobante",
                date: p.FechaRegistro,
              });
          }
        });

        reservas.forEach((r) => {
          if (String(r.UnidadID) === myID) {
            if (r.Estado === "Confirmada")
              items.push({
                type: "info",
                title: "Reserva Confirmada",
                desc: `${r.EspacioNombre || "Espacio"} - ${r.Fecha}`,
                date: r.FechaCreacion,
              });
          }
        });

        items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const ultimos = items.slice(0, 5);

        if (ultimos.length === 0) {
          board.innerHTML =
            '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:13px;">No hay notificaciones recientes.</div>';
          return;
        }

        board.innerHTML = ultimos
          .map((it) => {
            let icon = "fa-check",
              color = "icon-success";
            if (it.type === "error") {
              icon = "fa-xmark";
              color = "icon-warn";
            }
            if (it.type === "info") {
              icon = "fa-calendar-check";
              color = "icon-info";
            }

            const fechaObj = it.date ? new Date(it.date) : new Date();
            const fechaStr = fechaObj.toLocaleDateString("es-CL");

            return `<div class="notif-card"><div class="notif-icon ${color}"><i class="fa-solid ${icon}"></i></div><div class="notif-content"><h4>${it.title}</h4><p>${it.desc}</p><span class="notif-time">${fechaStr}</span></div></div>`;
          })
          .join("");
      }

      function logoutResidente() {
        localStorage.removeItem("sesion_externa");
        window.location.href = "login_residente.html";
      }

      /* UTILS */
      function safeUpdate(id, valor) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
      }
      function parseMonto(valor) {
        if (!valor) return 0;
        const limpio = String(valor)
          .replace(/[^0-9,-]/g, "")
          .replace(",", "."); // Limpieza robusta
        return parseFloat(limpio) || 0;
      }
      function parsePorcentaje(valor) {
        if (!valor) return 0;
        const limpio = String(valor).replace(",", ".");
        return parseFloat(limpio) || 0;
      }
      function clp(v) {
        return "$" + new Intl.NumberFormat("es-CL").format(v);
      }
      function getKeyVal(o) {
        return o.ID || o.id || "";
      }

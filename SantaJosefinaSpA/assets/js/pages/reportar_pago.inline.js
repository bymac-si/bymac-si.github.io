// ===== Extracted from reportar_pago.html =====

let USUARIO = null;
      let OPCIONES_PAGO = [];

      const IMGBB_API_KEY = "d096ade1d65ede2aa12f00d94094a854";

      document.addEventListener("DOMContentLoaded", async () => {
        try {
          const sesionStr = localStorage.getItem("sesion_externa");
          if (!sesionStr) throw new Error("No session");
          const sesionObj = JSON.parse(sesionStr);
          USUARIO = sesionObj.datos;
        } catch (e) {
          window.location.href = "login_residente.html";
          return;
        }

        document.getElementById("fechaPago").value = new Date()
          .toISOString()
          .split("T")[0];
        await cargarOpcionesDeuda();
      });

      async function cargarOpcionesDeuda() {
        const sel = document.getElementById("selCobro");
        try {
          const [copropiedades, unidades, gastosComunes, gastos, cobrosInd] =
            await Promise.all([
              fetchData("Copropiedades"),
              fetchData("Unidades"),
              fetchData("GastosComunes").catch(() => []),
              fetchData("Gastos"),
              fetchData("Cobros").catch(() => []),
            ]);

          const coproID = String(USUARIO.CopropiedadID).trim();
          const unidadID = String(USUARIO.UnidadID).trim();

          const comunidad = copropiedades.find(
            (c) => String(getKeyVal(c)) === coproID
          );
          const unidad = unidades.find(
            (u) => String(getKeyVal(u)) === unidadID
          );

          if (!comunidad || !unidad) throw new Error("Datos incompletos");

          // --- 1. Calcular Mes Actual ---
          const fechaHoy = new Date();
          const mesStr = `${String(fechaHoy.getMonth() + 1).padStart(
            2,
            "0"
          )}-${fechaHoy.getFullYear()}`;

          let totalGastoComunidad = 0;
          const resumenMes = gastosComunes.find(
            (g) => String(g.CopropiedadID) === coproID && g.Mes === mesStr
          );

          if (resumenMes && resumenMes.TotalGastos) {
            totalGastoComunidad = parseFloat(resumenMes.TotalGastos);
          } else {
            const gastosMes = gastos.filter(
              (g) => String(g.CopropiedadID) === coproID && g.Mes === mesStr
            );
            totalGastoComunidad = gastosMes.reduce(
              (sum, g) => sum + (parseFloat(g.Monto) || 0),
              0
            );
          }

          const alicuotaPct =
            parseFloat(unidad.Alicuota && unidad.Alicuota.replace(",", ".")) ||
            0;
          const fondoPct = parseFloat(comunidad.FondoReserva) || 0;
          const factorFondo = fondoPct > 1 ? fondoPct / 100 : fondoPct;

          const montoBase = Math.round(
            totalGastoComunidad * (alicuotaPct / 100)
          );
          const montoFondo = Math.round(montoBase * factorFondo);
          const totalMesActual = montoBase + montoFondo;

          // --- 2. Calcular Mora (EXCLUYENDO el mes actual) ---
          // CORRECCIÓN: Filtramos que c.Mes !== mesStr para no sumar doble si ya se generó el cobro del mes
          const moras = cobrosInd.filter(
            (c) =>
              String(c.UnidadID) === unidadID &&
              c.Estado === "Pendiente" &&
              c.Mes !== mesStr
          );
          const totalMora = moras.reduce(
            (sum, c) => sum + (parseFloat(c.TotalAPagar) || 0),
            0
          );

          // --- 3. Construir Opciones ---
          OPCIONES_PAGO = [];
          const granTotal = totalMesActual + totalMora;

          if (granTotal > 0)
            OPCIONES_PAGO.push({
              id: "TOTAL",
              label: `Pagar Todo (${clp(granTotal)})`,
              monto: granTotal,
            });
          if (totalMesActual > 0)
            OPCIONES_PAGO.push({
              id: "MES_ACTUAL",
              label: `Solo Mes Actual (${clp(totalMesActual)})`,
              monto: totalMesActual,
            });
          if (totalMora > 0)
            OPCIONES_PAGO.push({
              id: "MORA",
              label: `Solo Deuda Anterior (${clp(totalMora)})`,
              monto: totalMora,
            });

          OPCIONES_PAGO.push({
            id: "OTRO",
            label: "Otro Monto / Abono",
            monto: "",
          });

          // Renderizar
          sel.innerHTML =
            '<option value="" selected disabled>Selecciona...</option>';
          OPCIONES_PAGO.forEach((op) => {
            const el = document.createElement("option");
            el.value = op.id;
            el.textContent = op.label;
            sel.appendChild(el);
          });
        } catch (e) {
          console.error(e);
          sel.innerHTML = "<option>Error cargando datos</option>";
        }
      }

      function actualizarMonto() {
        const id = document.getElementById("selCobro").value;
        const op = OPCIONES_PAGO.find((o) => o.id === id);
        if (op) document.getElementById("montoPago").value = op.monto;
      }

      function previewFile() {
        const file = document.getElementById("fileInput").files[0];
        if (file) {
          document.getElementById("uploadArea").classList.add("has-file");
          document.getElementById("uploadText").textContent = file.name;
          document.getElementById("uploadIcon").className =
            "fa-solid fa-check-circle";
          document.getElementById("uploadIcon").style.color = "#10b981";
        }
      }

      async function subirImagenNube(file) {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();
        if (data.success) {
          return data.data.url;
        } else {
          throw new Error("Error subiendo imagen.");
        }
      }

      document.getElementById("formPago").onsubmit = async (e) => {
        e.preventDefault();

        const tipoPago = document.getElementById("selCobro").value;
        const monto =
          parseFloat(document.getElementById("montoPago").value) || 0;
        const fileInput = document.getElementById("fileInput");

        if (!tipoPago) return alert("Selecciona qué pagas.");
        if (fileInput.files.length === 0) return alert("Sube el comprobante.");
        if (monto <= 0) return alert("Monto inválido.");

        const spinner = document.getElementById("spinner");
        const spinnerText = spinner.querySelector("div:last-child");
        spinner.style.display = "flex";

        try {
          spinnerText.textContent = "Subiendo comprobante...";
          const urlComprobante = await subirImagenNube(fileInput.files[0]);

          spinnerText.textContent = "Registrando pago...";

          let cobroRef = "";
          if (tipoPago === "MES_ACTUAL") cobroRef = "GC_MES_ACTUAL";
          else if (tipoPago === "MORA") cobroRef = "MORA_HISTORICA";
          else if (tipoPago === "TOTAL") cobroRef = "TOTAL_DEUDA";
          else cobroRef = "ABONO";

          const payload = {
            ID: "PAY_" + Date.now(),
            CobroID: cobroRef,
            UnidadID: String(USUARIO.UnidadID),
            FechaPago: document.getElementById("fechaPago").value,
            Monto: monto,
            Metodo: "Transferencia",
            Estado: "Pendiente",
            ComprobanteURL: urlComprobante,
            Observaciones: document.getElementById("obsPago").value,
            RegistradoPor: USUARIO.Email,
            FechaRegistro: new Date().toISOString(),
          };

          if (typeof appSheetCRUD === "function") {
            await appSheetCRUD("Pagos", "Add", [payload]);
          }

          alert("✅ ¡Pago enviado con éxito!");
          window.location.href = "portal_residente.html";
        } catch (err) {
          console.error(err);
          alert("Error: " + err.message);
        } finally {
          spinner.style.display = "none";
        }
      };

      function clp(v) {
        return "$" + new Intl.NumberFormat("es-CL").format(v);
      }
      function getKeyVal(o) {
        return o.ID || o.id || "";
      }

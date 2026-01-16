// ===== Extracted from admin-condominios.html =====

/* ===== LÓGICA DEL SISTEMA (INTACTA) ===== */
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

        // Fecha Actual para el contrato
        const nodoFecha = document.getElementById("c_fecha_hoy");
        if (nodoFecha) nodoFecha.textContent = fechaHoyTexto();

        await cargarDatos();
      });

      function fechaHoyTexto() {
        const d = new Date();
        const meses = [
          "enero",
          "febrero",
          "marzo",
          "abril",
          "mayo",
          "junio",
          "julio",
          "agosto",
          "septiembre",
          "octubre",
          "noviembre",
          "diciembre",
        ];
        return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
      }

      function showSpinner(msg) {
        document.getElementById("pageSpinner").style.display = "grid";
        if (msg) document.getElementById("spinnerText").textContent = msg;
      }
      function hideSpinner() {
        document.getElementById("pageSpinner").style.display = "none";
      }
      function formatoCLP(v) {
        return (
          "$" +
          new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
            Number(v || 0)
          )
        );
      }
      function getKeyVal(o) {
        return o._id || o.ID || o.Id || o.id || "";
      }

      let COPROS = [],
        UNIDADES = [],
        TARIFAS = [];
      let coproSel = null,
        factor = 0,
        nUnidades = 0,
        utmCLP = 0;

      async function cargarDatos() {
        try {
          showSpinner("Cargando datos...");

          // Carga paralela de datos
          [COPROS, UNIDADES, TARIFAS] = await Promise.all([
            fetchData("Copropiedades"),
            fetchData("Unidades").catch(() => []),
            fetchData("TablaTarifas").catch(() => []),
          ]);

          const sel = document.getElementById("selCopro");
          sel.innerHTML = COPROS.map(
            (c) =>
              `<option value="${getKeyVal(c)}">${
                c.Nombre || c.RazonSocial || "(Sin Nombre)"
              }</option>`
          ).join("");
          sel.onchange = onSelectCopro;

          // Auto-selección por URL ?id=...
          const params = new URLSearchParams(window.location.search);
          const incomingId = params.get("id");

          if (
            incomingId &&
            COPROS.some((c) => String(getKeyVal(c)) === String(incomingId))
          ) {
            sel.value = incomingId;
          } else if (COPROS.length) {
            sel.value = getKeyVal(COPROS[0]);
          }

          await onSelectCopro();

          // Listener UTM manual
          document.getElementById("inpUTM").addEventListener("input", calcular);
        } catch (err) {
          alert("Error al cargar datos: " + (err.message || err));
          console.error(err);
        } finally {
          hideSpinner();
        }
      }

      async function onSelectCopro() {
        const id = document.getElementById("selCopro").value;
        coproSel = COPROS.find((c) => String(getKeyVal(c)) === String(id));
        if (!coproSel) return;

        // Mapeo de campos a IDs del HTML
        const fields = {
          cxCopro: coproSel.Nombre,
          c_razon: coproSel.Nombre,
          c_razon_2: coproSel.Nombre,
          c_razon_firma: coproSel.Nombre,
          cxDir: coproSel.Direccion,
          c_dir: coproSel.Direccion,
          c_dir_2: coproSel.Direccion,
          cxRUT: coproSel.RUT,
          c_rut: coproSel.RUT,
          cxComuna: coproSel.Comuna,
          c_comuna: coproSel.Comuna,
          c_comuna_2: coproSel.Comuna,
        };

        for (const [kid, val] of Object.entries(fields)) {
          const el = document.getElementById(kid);
          if (el) el.textContent = val || "—";
        }
        document.getElementById("inpComuna").value = coproSel.Comuna || "";

        // Buscar Factor
        const tarifa = TARIFAS.find(
          (t) =>
            (t.Comuna || "").toLowerCase().trim() ===
            (coproSel.Comuna || "").toLowerCase().trim()
        );
        factor = tarifa ? Number(tarifa.Factor || 0) : 0;

        document.getElementById("inpFactor").value = factor || "";
        document.getElementById("cxFactor").textContent = factor || "—";
        if (document.getElementById("c_factor"))
          document.getElementById("c_factor").textContent = factor || "—";

        // Contar Unidades
        const coproID = getKeyVal(coproSel);
        let countFromTable = UNIDADES.filter(
          (u) => String(u.CopropiedadID) === String(coproID)
        ).length;

        // Fallback a campo 'Unidades' en tabla Copropiedades
        if (countFromTable === 0) {
          countFromTable = Number(
            coproSel.Unidades ||
              coproSel.CantidadUnidades ||
              coproSel.NUnidades ||
              0
          );
        }
        nUnidades = countFromTable;

        document.getElementById("inpUnidades").value = nUnidades;
        document.getElementById("c_unidades").textContent = nUnidades || "—";

        // Intento de UTM automática global si existe (opcional)
        if (
          typeof window.UTM_VALOR !== "undefined" &&
          window.UTM_VALOR > 0 &&
          !document.getElementById("inpUTM").value
        ) {
          document.getElementById("inpUTM").value = new Intl.NumberFormat(
            "es-CL"
          ).format(window.UTM_VALOR);
        }

        calcular();
      }

      function calcular() {
        const inp = document.getElementById("inpUTM");
        if (!inp) return;

        const rawUTM = inp.value
          .toString()
          .replaceAll(".", "")
          .replace(",", ".");
        utmCLP = parseFloat(rawUTM) || 0;

        // Actualizar textos UTM
        const fmtUTM = utmCLP > 0 ? formatoCLP(utmCLP) : "—";
        if (document.getElementById("c_utm"))
          document.getElementById("c_utm").textContent = fmtUTM;

        let neto = 0,
          iva = 0,
          total = 0,
          desc = "—";

        if (factor > 0 && utmCLP > 0 && nUnidades >= 0) {
          const baseF1 = utmCLP * 2.15; // Variable Excel

          let netoTeorico = 0;
          if (nUnidades < 20) {
            netoTeorico = baseF1 * factor;
            desc = `(2.15 × UTM) × Factor`;
          } else {
            const extra = nUnidades - 20;
            const valorExtraUnitario = baseF1 * 0.013;
            const sumaBase = baseF1 + extra * valorExtraUnitario;
            netoTeorico = sumaBase * factor;
            desc = `[Base + (Extra × Base × 0,013)] × Factor`;
          }

          // Redondeo al 1000
          neto = Math.round(netoTeorico / 1000) * 1000;
          // Total IVA inc.
          total = Math.round(neto * 1.19);
          // IVA
          iva = total - neto;
        }

        // Renderizar
        if (document.getElementById("outFormula"))
          document.getElementById("outFormula").textContent = desc;

        const ids = [
          "outMontoNeto",
          "outIVA",
          "outTotal",
          "c_monto_neto",
          "c_monto_iva",
          "c_monto_tot",
        ];
        const vals = [neto, iva, total, neto, iva, total];

        ids.forEach((id, i) => {
          const el = document.getElementById(id);
          if (el) el.textContent = formatoCLP(vals[i]);
        });
      }

      function imprimir() {
        window.print();
      }

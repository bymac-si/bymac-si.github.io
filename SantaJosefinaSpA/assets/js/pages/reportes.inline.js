// ===== Extracted from reportes.html =====

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
      function formatoEntero(v) {
        return (
          "$" +
          new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
            v || 0
          )
        );
      }
      function getKeyVal(o) {
        return o._id || o.ID || o.Id || o.id || "";
      }

      function formatMesLargo(mes) {
        if (!mes) return "";
        const [mm, yyyy] = mes.split("-");
        const fecha = new Date(Number(yyyy), Number(mm) - 1, 1);
        return fecha.toLocaleDateString("es-CL", {
          month: "long",
          year: "numeric",
        });
      }
      function formatFechaDDMMYYYY(fechaISO) {
        if (!fechaISO) return "—";
        const d = new Date(fechaISO);
        // Ajuste UTC para evitar desfase de día
        return d.toLocaleDateString("es-CL", { timeZone: "UTC" });
      }

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

        await cargarReporte();
      });

      let copros = [],
        unidades = [],
        gastosComunes = [],
        copropietarios = [],
        gastos = [],
        provs = [];

      async function cargarReporte() {
        try {
          showSpinner("Cargando reporte...");

          [copros, unidades, gastosComunes, copropietarios, gastos, provs] =
            await Promise.all([
              fetchData("Copropiedades"),
              fetchData("Unidades"),
              fetchData("GastosComunes").catch(() => []), // Puede estar vacía
              fetchData("Copropietarios"),
              fetchData("Gastos"),
              fetchData("Proveedores"),
            ]);

          const selCopro = document.getElementById("reporteCopro");
          selCopro.innerHTML = copros
            .map(
              (c) =>
                `<option value="${getKeyVal(c)}">${
                  c.Nombre || c.RazonSocial
                }</option>`
            )
            .join("");
          selCopro.onchange = () => cargarMeses();

          // Auto-selección si hay datos
          if (copros.length > 0) cargarMeses();
          else hideSpinner();
        } catch (err) {
          console.error(err);
          alert("Error cargando datos: " + err.message);
          hideSpinner();
        }
      }

      function cargarMeses() {
        const coproID = document.getElementById("reporteCopro").value;

        // Buscar meses disponibles en la tabla de GastosComunes o Gastos individuales
        // (Aquí usaremos GastosComunes si existe, o inferiremos de Gastos)
        let meses = [];

        // 1. Intentar desde GastosComunes (Resúmenes guardados)
        if (gastosComunes.length > 0) {
          meses = gastosComunes
            .filter((gc) => String(gc.CopropiedadID) === String(coproID))
            .map((gc) => gc.Mes);
        }

        // 2. Si no hay resúmenes, buscar en Gastos individuales
        if (meses.length === 0 && gastos.length > 0) {
          const gastosCopro = gastos.filter(
            (g) => String(g.CopropiedadID) === String(coproID)
          );
          meses = gastosCopro
            .map((g) => {
              if (!g.Fecha) return null;
              const d = new Date(g.Fecha);
              return `${String(d.getMonth() + 1).padStart(
                2,
                "0"
              )}-${d.getFullYear()}`;
            })
            .filter(Boolean);
        }

        const mesesUnicos = [...new Set(meses)].sort((a, b) => {
          const [ma, ya] = (a || "").split("-").map(Number);
          const [mb, yb] = (b || "").split("-").map(Number);
          return yb - ya || mb - ma; // Orden descendente (más nuevo primero)
        });

        const selMes = document.getElementById("reporteMes");
        if (mesesUnicos.length === 0) {
          selMes.innerHTML = '<option value="">Sin datos</option>';
        } else {
          selMes.innerHTML = mesesUnicos
            .map((m) => `<option value="${m}">${formatMesLargo(m)}</option>`)
            .join("");
        }

        selMes.onchange = renderReporte;
        renderReporte();
      }

      function renderReporte() {
        const coproID = document.getElementById("reporteCopro").value;
        const mesSel = document.getElementById("reporteMes").value;

        if (!coproID || !mesSel) {
          hideSpinner();
          return;
        }

        const mesTexto = formatMesLargo(mesSel);
        const provMap = {};
        provs.forEach((p) => (provMap[getKeyVal(p)] = p.Nombre));

        // Datos Copropiedad
        const copro = copros.find(
          (c) => String(getKeyVal(c)) === String(coproID)
        );
        const fondoReservaPct = parseFloat(copro?.FondoReserva || 0) / 100;

        // Calcular Totales (Desde Gastos Reales)
        // Filtramos los gastos de ese mes para esa copropiedad
        // Nota: Asumimos que el mes "MM-YYYY" coincide con la fecha del gasto
        const gastosMes = gastos.filter((g) => {
          if (String(g.CopropiedadID) !== String(coproID)) return false;
          if (!g.Fecha) return false;
          const d = new Date(g.Fecha);
          // Ajuste UTC
          const m = String(d.getUTCMonth() + 1).padStart(2, "0");
          const y = d.getUTCFullYear();
          return `${m}-${y}` === mesSel;
        });

        // Sumar total gastos
        const totalG = gastosMes.reduce(
          (sum, g) => sum + (parseFloat(g.Monto) || 0),
          0
        );

        const aporteFR = Math.round(totalG * fondoReservaPct);
        const totalFinal = totalG + aporteFR;

        // Actualizar UI
        const setTxt = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val;
        };

        setTxt("webCopro", copro?.Nombre || "");
        setTxt("webDir", copro?.Direccion || "");
        setTxt("webRUT", copro?.RUT || "");
        setTxt("webMes", mesTexto);

        setTxt("printCopro", copro?.Nombre || "");
        setTxt("printDir", copro?.Direccion || "");
        setTxt("printRUT", copro?.RUT || "");
        setTxt("printMes", mesTexto);

        const fmtTotalG = formatoEntero(totalG);
        const fmtFR =
          formatoEntero(aporteFR) + ` (${copro?.FondoReserva || 0}%)`;
        const fmtFinal = formatoEntero(totalFinal);

        setTxt("totalGastos", fmtTotalG);
        setTxt("aporteFR", fmtFR);
        setTxt("totalFinal", fmtFinal);

        setTxt("totalGastosPrint", fmtTotalG);
        setTxt("aporteFRPrint", fmtFR);
        setTxt("totalFinalPrint", fmtFinal);

        // Generar Tabla Prorrateo
        const unidadesC = unidades.filter(
          (u) => String(u.CopropiedadID) === String(coproID)
        );
        const propietarioNombre = (id) =>
          copropietarios.find((p) => getKeyVal(p) === id)?.Nombre || "—";

        const rows = unidadesC
          .map((u) => {
            const alicuota = parseFloat(u.Alicuota) || 0;
            // Cálculo proporcional
            const cuotaGasto = Math.round((alicuota / 100) * totalG);
            const cuotaFR = Math.round((alicuota / 100) * aporteFR);
            const cuotaTotal = cuotaGasto + cuotaFR;

            return `<tr>
      <td style="font-weight:bold;">${u.Numero}</td>
      <td>${propietarioNombre(u.PropietarioID)}</td>
      <td style="text-align:center;">${alicuota.toFixed(3)}%</td>
      <td style="text-align:right;">${formatoEntero(cuotaGasto)}</td>
      <td style="text-align:right;">${formatoEntero(cuotaFR)}</td>
      <td style="text-align:right; font-weight:bold;">${formatoEntero(
        cuotaTotal
      )}</td>
    </tr>`;
          })
          .join("");

        document.getElementById("tablaReporte").innerHTML =
          rows ||
          '<tr><td colspan="6" class="muted">No hay unidades registradas.</td></tr>';
        document.getElementById("tablaReportePrint").innerHTML =
          rows || '<tr><td colspan="6">No hay unidades registradas.</td></tr>';

        // Generar Desglose por Categoría
        const desglose = {};
        gastosMes.forEach((g) => {
          const t = g.TipoGasto || "Otros";
          if (!desglose[t]) desglose[t] = { total: 0, items: [] };
          desglose[t].total += parseFloat(g.Monto) || 0;
          desglose[t].items.push(g);
        });

        const renderDesgloseHTML = (isPrint) => {
          if (Object.keys(desglose).length === 0)
            return '<p class="muted">No hay gastos registrados en este mes.</p>';

          return `
        <h3 class="no-print" style="margin-top:0;">Detalle de Gastos</h3>
        ${Object.entries(desglose)
          .map(
            ([tipo, data]) => `
            <div class="cat-title" style="width:94%; margin-top:30px; margin-bottom:15px;">
                <span>${tipo}</span>
                <span>${formatoEntero(data.total)}</span>
            </div>
            <table style="width:97%; margin-bottom:15px; border-collapse:collapse;">
                <thead>
                    <tr>
                        <th style="width:30%;">Proveedor</th>
                        <th style="width:15%;">Fecha</th>
                        <th style="width:15%;">Doc.</th>
                        <th>Detalle</th>
                        <th style="width:15%; text-align:right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items
                      .map(
                        (it) => `
                        <tr>
                            <td>${provMap[it.ProveedorID] || "—"}</td>
                            <td>${formatFechaDDMMYYYY(it.Fecha)}</td>
                            <td>${it.Documento || ""}</td>
                            <td style="font-size:0.9em;">${
                              it.Observaciones || ""
                            }</td>
                            <td style="text-align:right;">${formatoEntero(
                              it.Monto
                            )}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `
          )
          .join("")}
      `;
        };

        document.getElementById("desgloseWrapper").innerHTML =
          renderDesgloseHTML(false);
        document.getElementById("desgloseWrapperPrint").innerHTML =
          renderDesgloseHTML(true);

        hideSpinner();
      }

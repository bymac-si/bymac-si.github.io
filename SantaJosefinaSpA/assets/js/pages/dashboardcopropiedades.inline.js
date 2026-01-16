// ===== Extracted from dashboardcopropiedades.html =====

/* ================= VARIABLES ================= */
      let UTM_ACTUAL = 67000;
      let COPROS = [],
        PROS = [],
        GASTOS_OP = [],
        TARIFAS = [];
      let charts = {};

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
        cargarDashboard();
      });

      /* ================= CARGA DATOS ================= */
      async function cargarDashboard() {
        document.getElementById("pageSpinner").style.display = "flex";
        try {
          if (typeof obtenerUTM === "function") {
            UTM_ACTUAL = await obtenerUTM();
          }
          const lblUTM = document.getElementById("lblUTM");
          if (lblUTM) lblUTM.textContent = formatoPrecio(UTM_ACTUAL);

          const res = await Promise.allSettled([
            fetchData("Copropiedades"),
            fetchData("ProspectosCopro"),
            fetchData("GastosOperativos"),
            fetchData("TablaTarifas"),
          ]);

          COPROS = res[0].value || [];
          PROS = res[1].value || [];
          GASTOS_OP = res[2].value || [];
          TARIFAS = res[3].value || [];

          // Debug fecha para ver qué llega en consola
          if (GASTOS_OP.length > 0)
            console.warn("FECHA CRUDA:", GASTOS_OP[0].Fecha);

          calcularMetricas();
        } catch (err) {
          console.error("Error Dashboard:", err);
        } finally {
          document.getElementById("pageSpinner").style.display = "none";
        }
      }

      /* ================= PARSEADOR CORREGIDO (COMPATIBLE CON APPSHEET) ================= */
      function fechaSegura(fechaStr) {
        if (!fechaStr) return null;

        // Caso 1: Viene con barras (AppSheet API envía MM/DD/YYYY)
        // Ejemplo recibido: 01/08/2026 (Para 8 de Enero)
        if (fechaStr.includes("/")) {
          const partes = fechaStr.split("/");
          // Invertimos lógica: [0] es MES, [1] es DÍA
          const mes = parseInt(partes[0], 10) - 1; // JS 0-11
          const dia = parseInt(partes[1], 10);
          const anio = parseInt(partes[2], 10);

          // Validación de seguridad (por si acaso sí era DD/MM)
          // Si el "mes" es > 11 (ej: 13/01/2026), entonces estaba bien como DD/MM
          if (mes > 11) {
            const diaReal = parseInt(partes[0], 10);
            const mesReal = parseInt(partes[1], 10) - 1;
            return new Date(anio, mesReal, diaReal);
          }

          return new Date(anio, mes, dia);
        }

        // Caso 2: Viene con guiones (ISO Standard YYYY-MM-DD)
        if (fechaStr.includes("-")) {
          const partes = fechaStr.split("-");
          // [0]Año, [1]Mes, [2]Día
          return new Date(
            parseInt(partes[0], 10),
            parseInt(partes[1], 10) - 1,
            parseInt(partes[2], 10)
          );
        }

        return new Date(fechaStr);
      }

      /* ================= LÓGICA DE NEGOCIO ================= */
      function calcularHonorarioLocal(unidades, factor, utm) {
        if (!(factor > 0 && utm > 0)) return { neto: 0, iva: 0, total: 0 };
        const baseF1 = utm * 2.15;
        let netoTeorico = 0;
        if (unidades < 20) {
          netoTeorico = baseF1 * factor;
        } else {
          const extra = unidades - 20;
          const incremento = baseF1 * 0.013;
          const sumaBase = baseF1 + extra * incremento;
          netoTeorico = sumaBase * factor;
        }
        const neto = Math.round(netoTeorico / 1000) * 1000;
        const total = Math.round(neto * 1.19);
        const iva = total - neto;
        return { neto, iva, total };
      }

      function calcularMetricas() {
        // 1. INGRESOS
        let netosTotal = 0,
          ivaTotal = 0;
        let dataIngresosChart = [];

        COPROS.forEach((c) => {
          const u = parseInt(c.Unidades || c.CantidadUnidades || 0) || 0;
          const tarifa = TARIFAS.find((t) => norm(t.Comuna) === norm(c.Comuna));
          const factor = tarifa ? parseFloat(tarifa.Factor) : 0;

          if (factor > 0 && u > 0) {
            const desglose = calcularHonorarioLocal(u, factor, UTM_ACTUAL);
            netosTotal += desglose.neto;
            ivaTotal += desglose.iva;
            dataIngresosChart.push({ l: c.Nombre, v: desglose.neto });
          }
        });

        // 2. GASTOS
        let gastoNetoMes = 0,
          gastoIvaMes = 0;
        let gastoSueldosMes = 0; // NUEVO VARIABLE PARA KPI SUELDOS

        // Fecha Sistema
        const fechaHoy = new Date();
        const mesActual = fechaHoy.getMonth();
        const anoActual = fechaHoy.getFullYear();

        const historialGastos = {};
        const categoriasMes = {};

        GASTOS_OP.forEach((g) => {
          if (!g.Fecha) return;

          // USAMOS LA FUNCIÓN SEGURA
          const d = fechaSegura(g.Fecha);

          if (!d || isNaN(d.getTime())) return;

          const montoNeto = parseFloat(g.MontoNeto || 0);
          const montoIVA = parseFloat(g.MontoIVA || 0);
          const total = parseFloat(g.Total) || montoNeto + montoIVA;
          const cat = g.Categoria || "Otros";

          // A. KPI Mes Actual
          if (d.getMonth() === mesActual && d.getFullYear() === anoActual) {
            gastoNetoMes += montoNeto;
            gastoIvaMes += montoIVA;

            // Logica para KPI Sueldos
            if (cat.toLowerCase() === "sueldos") {
                gastoSueldosMes += montoNeto;
            }

            // Acumular Categoría
            categoriasMes[cat] = (categoriasMes[cat] || 0) + montoNeto;
          }

          // B. Historial (YYYY-MM)
          const mesStr = (d.getMonth() + 1).toString().padStart(2, "0");
          const keyMes = `${d.getFullYear()}-${mesStr}`;
          historialGastos[keyMes] = (historialGastos[keyMes] || 0) + total;
        });

        // 3. RESULTADOS
        const resultadoOp = netosTotal - gastoNetoMes;
        const f29Estimado = ivaTotal - gastoIvaMes;

        // Margen %
        let margenPct = 0;
        if (netosTotal > 0) {
          margenPct = Math.round((resultadoOp / netosTotal) * 100);
        }

        // 4. RENDERIZADO
        setText("kpiClientes", COPROS.length);
        setText(
          "kpiUnidades",
          COPROS.reduce((a, c) => a + (parseInt(c.Unidades || 0) || 0), 0)
        );
        const prosActivos = PROS.filter(
          (p) =>
            !norm(p.Estado || "").includes("ganado") &&
            !norm(p.Estado || "").includes("perdido")
        ).length;
        setText("kpiProspectos", prosActivos);

        setText("kpiIngresos", formatoPrecio(netosTotal));
        setText("kpiGastosOp", formatoPrecio(gastoNetoMes));
        setText("kpiIVA", formatoPrecio(ivaTotal));
        
        // Renderizar Nuevos KPIs
        setText("kpiIVACredito", formatoPrecio(gastoIvaMes));
        setText("kpiSueldos", formatoPrecio(gastoSueldosMes));
        setText("kpiMargenMonto", formatoPrecio(resultadoOp));

        const elMargen = document.getElementById("kpiMargenPct");
        elMargen.textContent = margenPct + "%";
        elMargen.style.color =
          margenPct >= 20 ? "#10B981" : margenPct >= 0 ? "#F59E0B" : "#EF4444";

        // Tablas
        setText("finIngresos", formatoPrecio(netosTotal));
        setText("finGastos", formatoPrecio(gastoNetoMes));
        setText("finMargen", formatoPrecio(resultadoOp));
        setText("taxDebito", formatoPrecio(ivaTotal));
        setText("taxCredito", formatoPrecio(gastoIvaMes));
        setText("taxPagar", formatoPrecio(f29Estimado));

        renderChartIngresos(dataIngresosChart);
        renderChartGastos(historialGastos);
        renderChartCategorias(categoriasMes);
      }

      /* ================= GRÁFICOS & HELPERS ================= */
      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
      };

      function newChart(id, config) {
        if (charts[id]) charts[id].destroy();
        const ctx = document.getElementById(id);
        if (ctx) charts[id] = new Chart(ctx, config);
      }

      function renderChartIngresos(dataArr) {
        dataArr.sort((a, b) => b.v - a.v);
        const top = dataArr.slice(0, 5);
        newChart("chartIngresosNetos", {
          type: "bar",
          indexAxis: "y",
          data: {
            labels: top.map((d) => d.l),
            datasets: [
              {
                label: "Ingreso Neto ($)",
                data: top.map((d) => d.v),
                backgroundColor: "#10B981",
                borderRadius: 4,
              },
            ],
          },
          options: commonOptions,
        });
      }

      function renderChartGastos(historialObj) {
        const labels = Object.keys(historialObj).sort();
        const data = labels.map((k) => historialObj[k]);
        newChart("chartEvolucionOp", {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Gastos Totales ($)",
                data: data,
                borderColor: "#EF4444",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                fill: true,
                tension: 0.3,
              },
            ],
          },
          options: commonOptions,
        });
      }

      function renderChartCategorias(catObj) {
        const labels = Object.keys(catObj);
        const data = Object.values(catObj);
        newChart("chartGastosCat", {
          type: "doughnut",
          data: {
            labels: labels,
            datasets: [
              {
                data: data,
                backgroundColor: [
                  "#3B82F6",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#8B5CF6",
                  "#64748B",
                ],
                borderWidth: 1,
              },
            ],
          },
          options: commonOptions,
        });
      }

      // FORMULARIO GASTOS
      function abrirModalGasto() {
        document.getElementById("modalGasto").classList.add("active");
      }
      function calcIVAGasto() {
        const m = parseFloat(document.getElementById("gastoMonto").value) || 0;
        const iva = document.getElementById("gastoCheckIVA").checked
          ? Math.round(m * 0.19)
          : 0;
        document.getElementById("gastoIVA").value = iva;
      }
      const formGasto = document.getElementById("formGastoOp");
      if (formGasto) {
        formGasto.onsubmit = async (e) => {
          e.preventDefault();
          if (!confirm("¿Confirmar Gasto?")) return;
          const neto =
            parseFloat(document.getElementById("gastoMonto").value) || 0;
          const iva =
            parseFloat(document.getElementById("gastoIVA").value) || 0;
          const newID = "GAS_" + Date.now();
          // Guardamos en formato ISO (YYYY-MM-DD) para evitar problemas futuros
          const hoy = new Date();
          const fechaStr =
            hoy.getFullYear() +
            "-" +
            String(hoy.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(hoy.getDate()).padStart(2, "0");
          const payload = {
            ID: newID,
            Fecha: fechaStr,
            Categoria: document.getElementById("gastoCat").value,
            Descripcion: document.getElementById("gastoDesc").value,
            MontoNeto: neto,
            TieneIVA: document.getElementById("gastoCheckIVA").checked
              ? "TRUE"
              : "FALSE",
            MontoIVA: iva,
            Total: neto + iva,
            Estado: "Pagado",
          };
          try {
            if (typeof upsertData === "function")
              await upsertData("GastosOperativos", payload);
            else await appSheetCRUD("GastosOperativos", "Add", [payload]);
            alert("Gasto Registrado");
            document.getElementById("modalGasto").classList.remove("active");
            formGasto.reset();
            cargarDashboard();
          } catch (err) {
            alert("Error: " + err.message);
          }
        };
      }

      function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      }
      function norm(s) {
        return (s || "")
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      }
      function clp(v) {
        return (
          "$" +
          new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(v)
        );
      }
      function formatoPrecio(v) {
        return clp(v);
      }

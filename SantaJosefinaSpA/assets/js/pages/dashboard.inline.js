// ===== Extracted from dashboard.html =====

document.addEventListener("DOMContentLoaded", async () => {
        try {
          document.getElementById("header").innerHTML = await (
            await fetch("header.html")
          ).text();
          if (typeof initHeader === "function") initHeader();
        } catch (e) {
          console.error("Error header:", e);
        }

        try {
          document.getElementById("footer").innerHTML = await (
            await fetch("footer.html")
          ).text();
        } catch (e) {
          console.error("Error footer:", e);
        }

        if (typeof bindUI === "function") bindUI();
        if (typeof cargarDashboard === "function") await cargarDashboard();
      });

      function bindUI() {
        document
          .getElementById("btnReload")
          .addEventListener("click", cargarDashboard);
      }

/* --- FUNCIONES AUXILIARES --- */
      function normalizarEstado(e) {
        if (!e) return "";
        return e
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      }
      function formatearFechaCL(fechaISO) {
        if (!fechaISO) return "";
        const d = new Date(fechaISO);
        return d.toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
      function getGaugeColor(pct) {
        if (pct >= 70) return "#66cc66";
        if (pct >= 40) return "#ffcc00";
        return "#ff6666";
      }
      function showSpinner(msg) {
        const sp = document.getElementById("pageSpinner");
        if (msg) document.getElementById("spinnerText").textContent = msg;
        sp.classList.remove("hidden");
      }
      function hideSpinner() {
        document.getElementById("pageSpinner").classList.add("hidden");
      }

      /* --- LÓGICA PRINCIPAL --- */
      async function cargarDashboard() {
        try {
          showSpinner("Procesando datos...");
          const [clientes, propiedades, visitas, tareas, marketing, agentes] =
            await Promise.all([
              fetchData("Clientes").catch(() => []),
              fetchData("Propiedades").catch(() => []),
              fetchData("Visitas").catch(() => []),
              fetchData("Tareas").catch(() => []),
              fetchData("Marketing").catch(() => []),
              fetchData("Agentes").catch(() => []),
            ]);

          const clienteMap = {};
          clientes.forEach((c) => (clienteMap[c.ID] = c.Nombre));
          const propMap = {};
          propiedades.forEach((p) => (propMap[p.ID] = p.Direccion));
          const agenteMap = {};
          agentes.forEach((a) => (agenteMap[a.ID] = a.Nombre));

          const baseColors = [
            "#ffcc00",
            "#ff9933",
            "#66cc66",
            "#66ccff",
            "#B46A55",
            "#9333ea",
          ];
          const colorAgente = {};
          agentes.forEach((a, i) => {
            colorAgente[a.ID] = baseColors[i % baseColors.length];
          });

          // === KPIs ===
          kpiClientes.textContent = clientes.length;
          kpiPropiedades.textContent = propiedades.filter(
            (p) => normalizarEstado(p.Estado) === "disponible"
          ).length;

          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const visitasFuturas = visitas
            .filter((v) => {
              const f = new Date(v.Fecha || v["Fecha Visita"]);
              return !isNaN(f) && f >= hoy;
            })
            .sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
          kpiVisitas.textContent = visitasFuturas.length;

          kpiTareasPendientes.textContent = tareas.filter(
            (t) => normalizarEstado(t["Estado"]) !== "completada"
          ).length;

          // === 1. GRÁFICO: ESTATUS CLIENTES ===
          const estadosClientes = {};
          clientes.forEach((c) => {
            const est = c.Estado || "Sin Estado";
            estadosClientes[est] = (estadosClientes[est] || 0) + 1;
          });
          new Chart(document.getElementById("graficoClientesEstado"), {
            type: "doughnut",
            data: {
              labels: Object.keys(estadosClientes),
              datasets: [
                {
                  data: Object.values(estadosClientes),
                  backgroundColor: [
                    "#166534",
                    "#dc2626",
                    "#eab308",
                    "#2563eb",
                    "#9333ea",
                  ],
                },
              ],
            },
            options: {
              responsive: true,
              plugins: { legend: { position: "right" } },
            },
          });

          // === 2. EMBUDO VENTAS ===
          const etapas = [
            "Prospecto",
            "En Negociación",
            "Reservado",
            "Cerrado",
          ];
          const conteoEmbudo = [
            clientes.filter((c) => normalizarEstado(c["Estado"]) === "activo")
              .length,
            clientes.filter(
              (c) => normalizarEstado(c["Estado"]) === "en negociacion"
            ).length,
            propiedades.filter(
              (p) => normalizarEstado(p["Estado"]) === "reservado"
            ).length,
            propiedades.filter((p) =>
              ["vendido", "arrendado"].includes(normalizarEstado(p["Estado"]))
            ).length,
          ];

          new Chart(document.getElementById("graficoEmbudo"), {
            type: "funnel",
            data: {
              labels: etapas,
              datasets: [
                { data: conteoEmbudo, backgroundColor: baseColors.slice(0, 4) },
              ],
            },
            options: { indexAxis: "y" },
          });

          // === 3. MARKETING (ACTUALIZADO: LEADS VS CLIENTES) ===
          const labelsMkt = marketing.map((m) => `${m["Campaña"]}`);

          // Datos Leads (Potenciales)
          const dataLeads = marketing.map(
            (m) => m["Leads"] || m["Clientes Captados"] || 0
          );

          // Datos Clientes (Cerrados/Reales) - Asegúrate de tener esta columna en tu tabla Marketing o usa lógica
          const dataClientes = marketing.map(
            (m) => m["Clientes"] || m["Cierres"] || 0
          );

          new Chart(document.getElementById("graficoMarketing"), {
            type: "bar",
            data: {
              labels: labelsMkt,
              datasets: [
                {
                  label: "Leads (Potenciales)",
                  data: dataLeads,
                  backgroundColor: "#3b82f6", // Azul
                },
                {
                  label: "Clientes Captados",
                  data: dataClientes,
                  backgroundColor: "#10b981", // Verde
                },
              ],
            },
            options: {
              responsive: true,
              interaction: {
                mode: "index",
                intersect: false,
              },
            },
          });

          // === 3.1 NUEVO GRÁFICO ALCANCE (CLICKS) ===
          // Asumimos columna "Clicks" o "Alcance" en tabla Marketing
          const dataClicks = marketing.map(
            (m) => m["Clics"] || m["Alcance"] || 0
          );

          new Chart(document.getElementById("graficoAlcance"), {
            type: "bar",
            data: {
              labels: labelsMkt,
              datasets: [
                {
                  label: "Clicks / Alcance",
                  data: dataClicks,
                  backgroundColor: "#8b5cf6", // Violeta
                  borderRadius: 4,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } }, // Ocultar leyenda si es solo 1 serie
              scales: {
                y: { beginAtZero: true },
              },
            },
          });

          // === 4. VISITAS TABLA ===
          const tbodyVis = document.getElementById("tablaVisitasFuturas");
          tbodyVis.innerHTML =
            visitasFuturas
              .slice(0, 5)
              .map(
                (v) => `
            <tr>
                <td style="padding:10px;">${
                  clienteMap[v.Cliente] || "Anon"
                }</td>
                <td style="padding:10px;">${propMap[v.Propiedad] || "-"}</td>
                <td style="padding:10px;">${formatearFechaCL(v.Fecha)}</td>
            </tr>
          `
              )
              .join("") ||
            "<tr><td colspan='3' style='text-align:center; color:#999;'>Sin visitas próximas</td></tr>";

          // === 5. TAREAS DONAS ===
          const estadosTar = ["pendiente", "en progreso", "completada"];
          const dataEstadosTar = estadosTar.map(
            (e) => tareas.filter((t) => normalizarEstado(t.Estado) === e).length
          );
          new Chart(document.getElementById("graficoTareasEstado"), {
            type: "doughnut",
            data: {
              labels: ["Pendiente", "En Progreso", "Listo"],
              datasets: [
                {
                  data: dataEstadosTar,
                  backgroundColor: ["#f59e0b", "#3b82f6", "#10b981"],
                },
              ],
            },
          });

          const agentesTar = [
            ...new Set(
              tareas
                .filter((t) => normalizarEstado(t.Estado) !== "completada")
                .map((t) => t.AgenteID)
            ),
          ];
          const dataAgentesTar = agentesTar.map(
            (id) =>
              tareas.filter(
                (t) =>
                  t.AgenteID === id &&
                  normalizarEstado(t.Estado) !== "completada"
              ).length
          );
          const labelsAgentesTar = agentesTar.map(
            (id) => agenteMap[id] || "Sin Asignar"
          );

          new Chart(document.getElementById("graficoTareasAgente"), {
            type: "doughnut",
            data: {
              labels: labelsAgentesTar,
              datasets: [{ data: dataAgentesTar, backgroundColor: baseColors }],
            },
          });

          // === 6. TABLA TAREAS ===
          const pendientes = tareas
            .filter((t) => normalizarEstado(t.Estado) !== "completada")
            .slice(0, 10);
          document.getElementById("tablaTareasPendientes").innerHTML =
            pendientes
              .map(
                (t) => `
            <tr>
                <td style="padding:10px;">${t.Título}</td>
                <td style="padding:10px;"><span class="badge-agent" style="background:${
                  colorAgente[t.AgenteID] || "#999"
                }">${agenteMap[t.AgenteID] || "-"}</span></td>
                <td style="padding:10px;">${formatearFechaCL(
                  t.FechaLimite
                )}</td>
            </tr>
          `
              )
              .join("");

          // === 7. GAUGES RENDIMIENTO ===
          const totalT = tareas.length;
          const doneT = tareas.filter(
            (t) => normalizarEstado(t.Estado) === "completada"
          ).length;
          const pctGlobal = totalT ? Math.round((doneT / totalT) * 100) : 0;

          new Chart(document.getElementById("gaugeGlobal"), {
            type: "doughnut",
            data: {
              datasets: [
                {
                  data: [pctGlobal, 100 - pctGlobal],
                  backgroundColor: [getGaugeColor(pctGlobal), "#eee"],
                  borderWidth: 0,
                },
              ],
            },
            options: {
              rotation: -90,
              circumference: 180,
              cutout: "70%",
              plugins: {
                legend: false,
                title: {
                  display: true,
                  text: pctGlobal + "%",
                  position: "bottom",
                },
              },
            },
          });
          document.getElementById(
            "detalleGlobal"
          ).innerText = `${doneT}/${totalT} tareas`;

          // Gauges individuales
          const divGauges = document.getElementById("gaugesUsuarios");
          divGauges.innerHTML = "";
          agentes.forEach((a) => {
            const misTareas = tareas.filter((t) => t.AgenteID === a.ID);
            if (misTareas.length === 0) return;

            const misDone = misTareas.filter(
              (t) => normalizarEstado(t.Estado) === "completada"
            ).length;
            const miPct = Math.round((misDone / misTareas.length) * 100);

            const div = document.createElement("div");
            div.className = "gauge-container";
            div.innerHTML = `<canvas id="g_${
              a.ID
            }"></canvas><p style="font-weight:bold; color:${
              colorAgente[a.ID]
            }">${a.Nombre}</p><p class="gauge-detail">${misDone}/${
              misTareas.length
            }</p>`;
            divGauges.appendChild(div);

            new Chart(document.getElementById(`g_${a.ID}`), {
              type: "doughnut",
              data: {
                datasets: [
                  {
                    data: [miPct, 100 - miPct],
                    backgroundColor: [getGaugeColor(miPct), "#eee"],
                    borderWidth: 0,
                  },
                ],
              },
              options: {
                rotation: -90,
                circumference: 180,
                cutout: "70%",
                plugins: {
                  legend: false,
                  title: {
                    display: true,
                    text: miPct + "%",
                    position: "bottom",
                  },
                },
              },
            });
          });
        } catch (err) {
          console.error(err);
          // alert("Error al cargar dashboard: " + err.message);
        } finally {
          hideSpinner();
        }
      }

// ===== Extracted from marketing.html =====

let MARKETING_DATA = [];
      // COLUMNA LLAVE FIJA
      const KEY_COL = "ID";

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
        await cargarDatos();
      });

      async function cargarDatos() {
        document.getElementById("spinner").style.display = "grid";
        try {
          const data = await fetchData("Marketing").catch(() => []);
          MARKETING_DATA = data || [];

          calcularKPIsGlobales();
          
          // --- NUEVO: Cargar opciones del select Canal ---
          renderOpcionesCanal(); 
          // -----------------------------------------------

          renderTabla();
        } catch (e) {
          console.error(e);
        } finally {
          document.getElementById("spinner").style.display = "none";
        }
      }

      // --- NUEVA FUNCIÓN: Extrae canales únicos y llena el Select ---
      function renderOpcionesCanal() {
        const select = document.getElementById("mCanal");
        
        // 1. Extraer todos los canales existentes (filtrando vacíos)
        let canales = MARKETING_DATA
            .map(m => m.Canal)
            .filter(c => c && c.trim() !== "");

        // 2. (Opcional) Agregar canales base por si la tabla está vacía
        const canalesBase = ["Google Ads", "Facebook Ads", "X.com", "LinkedIn", "Instagram", "Tik Tok","YouTube","Portales", "Email Marketing", "Offline / Volantes"];
        canales = [...canales, ...canalesBase];

        // 3. Eliminar duplicados y ordenar alfabéticamente
        const canalesUnicos = [...new Set(canales)].sort();

        // 4. Generar el HTML
        let html = '<option value="">-- Seleccione --</option>';
        canalesUnicos.forEach(c => {
            html += `<option value="${c}">${c}</option>`;
        });

        // 5. Asignar al select
        select.innerHTML = html;
      }
      // -------------------------------------------------------------

      function renderTabla() {
        const tb = document.getElementById("tablaMarketing");
        if (MARKETING_DATA.length === 0) {
          tb.innerHTML =
            '<tr><td colspan="11" style="text-align:center; padding:30px;">Sin datos.</td></tr>';
          return;
        }

        // Ordenar: Activas primero
        MARKETING_DATA.sort((a, b) => {
          if (a.Estado === "Activa" && b.Estado !== "Activa") return -1;
          if (a.Estado !== "Activa" && b.Estado === "Activa") return 1;
          return new Date(b["Fecha Inicio"]) - new Date(a["Fecha Inicio"]);
        });

        tb.innerHTML = MARKETING_DATA.map((m) => {
          const key = m[KEY_COL];

          // Parseo seguro de TODAS las columnas numéricas
          const inv = parseFloat(m.Inversion) || 0;
          const ing = parseFloat(m["Ingresos Generados"]) || 0;
          const clics = parseFloat(m.Clics) || 0;
          const leads = parseFloat(m.Leads) || 0;
          const clientes = parseFloat(m["Clientes Captados"]) || 0;

          // CÁLCULOS
          const profit = ing - inv;
          const roi = inv > 0 ? (profit / inv) * 100 : 0;
          const cpl = leads > 0 ? inv / leads : 0;
          const cpc = clics > 0 ? inv / clics : 0;

          // Colores ROI
          const colorROI =
            roi > 0 ? "bg-green" : roi < 0 ? "bg-red" : "bg-gray";

          // Estado Color
          let stColor = "#94a3b8";
          if (m.Estado === "Activa") stColor = "#10b981";
          if (m.Estado === "Pausada") stColor = "#f59e0b";
          if (m.Estado === "Planificada") stColor = "#cbd5e1";

          return `
      <tr>
        <td>
           <span class="status-dot" style="background:${stColor}" title="${
            m.Estado
          }"></span>
           <span style="font-weight:600; font-size:11px;">${
             m.Estado || "S/D"
           }</span>
        </td>
        <td>
          <div style="font-weight:700; color:#1e293b;">${
            m.Campaña || "Sin Nombre"
          }</div>
          <div style="font-size:11px; color:#64748b;">${m.Canal}</div>
        </td>
        <td style="font-size:11px;">
           ${fmtFecha(m["Fecha Inicio"])}<br>
           <span style="color:#94a3b8;">${
             m["Fecha Fin"] ? fmtFecha(m["Fecha Fin"]) : "..."
           }</span>
        </td>
        <td class="mono" style="text-align:right;">${clp(inv)}</td>
        
        <td style="text-align:center;">${clics}</td>
        <td style="text-align:center; font-size:11px; color:#64748b;">${clp(
          cpc
        )}</td>
        
        <td style="text-align:center; font-weight:600;">${leads}</td>
        <td style="text-align:center; font-size:11px;">${clp(cpl)}</td>
        
        <td style="text-align:center; font-weight:700;">${clientes}</td>
        
        <td style="text-align:center;">
            <span class="metric-badge ${colorROI}">${roi.toFixed(1)}%</span>
        </td>

        <td style="text-align:right;">
           <button class="btn-icon" onclick="editar('${key}')"><i class="fa-solid fa-pen"></i></button>
        </td>
      </tr>
    `;
        }).join("");
      }

      function calcularKPIsGlobales() {
        const sumInv = MARKETING_DATA.reduce(
          (s, m) => s + (parseFloat(m.Inversion) || 0),
          0
        );
        const sumIng = MARKETING_DATA.reduce(
          (s, m) => s + (parseFloat(m["Ingresos Generados"]) || 0),
          0
        );
        const sumClics = MARKETING_DATA.reduce(
          (s, m) => s + (parseFloat(m.Clics) || 0),
          0
        );
        const sumLeads = MARKETING_DATA.reduce(
          (s, m) => s + (parseFloat(m.Leads) || 0),
          0
        );
        const sumCli = MARKETING_DATA.reduce(
          (s, m) => s + (parseFloat(m["Clientes Captados"]) || 0),
          0
        );

        const profit = sumIng - sumInv;
        const globalROI = sumInv > 0 ? (profit / sumInv) * 100 : 0;
        const globalCPC = sumClics > 0 ? sumInv / sumClics : 0;
        const globalCPL = sumLeads > 0 ? sumInv / sumLeads : 0;
        const globalConv = sumLeads > 0 ? (sumCli / sumLeads) * 100 : 0;

        document.getElementById("kpiInversion").textContent = clp(sumInv);

        const roiEl = document.getElementById("kpiROI");
        roiEl.textContent = globalROI.toFixed(1) + "% ROI";
        roiEl.className =
          globalROI >= 0 ? "kpi-sub text-green" : "kpi-sub text-red";

        document.getElementById("kpiClics").textContent = sumClics;
        document.getElementById("kpiCPC").textContent = clp(globalCPC) + " CPC";

        document.getElementById("kpiLeads").textContent = sumLeads;
        document.getElementById("kpiCPL").textContent = clp(globalCPL) + " CPL";

        document.getElementById("kpiClientes").textContent = sumCli;
        document.getElementById("kpiConv").textContent =
          globalConv.toFixed(1) + "% Conv.";
      }

      /* CRUD */
      function abrirForm() {
        document.getElementById("formMarketing").reset();
        document.getElementById("mID").value = "";
        document.getElementById("modalTitle").textContent = "Nueva Campaña";
        // Fecha hoy predeterminada (YYYY-MM-DD)
        document.getElementById("mInicio").value = new Date()
          .toISOString()
          .split("T")[0];
        document.getElementById("modalForm").classList.add("active");
      }
      function cerrarForm() {
        document.getElementById("modalForm").classList.remove("active");
      }

      function editar(id) {
        const m = MARKETING_DATA.find((x) => String(x[KEY_COL]) === String(id));
        if (!m) return;

        document.getElementById("mID").value = id;
        document.getElementById("mCampana").value = m.Campaña || "";
        document.getElementById("mEstado").value = m.Estado || "Activa";
        
        // Se asigna el valor al select (como ya cargamos las opciones, funcionará)
        document.getElementById("mCanal").value = m.Canal || "";
        
        document.getElementById("mInversion").value = m.Inversion || 0;

        // CORRECCIÓN: Usar helper para asignar fechas correctamente
        document.getElementById("mInicio").value = toInputDate(
          m["Fecha Inicio"]
        );
        document.getElementById("mFin").value = toInputDate(m["Fecha Fin"]);

        document.getElementById("mClics").value = m.Clics || 0;
        document.getElementById("mLeads").value = m.Leads || 0;
        document.getElementById("mClientes").value =
          m["Clientes Captados"] || 0;
        document.getElementById("mIngresos").value =
          m["Ingresos Generados"] || 0;
        document.getElementById("mObs").value = m.Observaciones || "";

        document.getElementById("modalTitle").textContent = "Editar Campaña";
        document.getElementById("modalForm").classList.add("active");
      }

      document.getElementById("formMarketing").onsubmit = async (e) => {
        e.preventDefault();
        document.getElementById("spinner").style.display = "grid";
        const idVal = document.getElementById("mID").value;

        const payload = {
          Campaña: document.getElementById("mCampana").value,
          Estado: document.getElementById("mEstado").value,
          Canal: document.getElementById("mCanal").value,
          Inversion:
            parseFloat(document.getElementById("mInversion").value) || 0,
          "Fecha Inicio": document.getElementById("mInicio").value,
          "Fecha Fin": document.getElementById("mFin").value,
          Clics: parseFloat(document.getElementById("mClics").value) || 0,
          Leads: parseFloat(document.getElementById("mLeads").value) || 0,
          "Clientes Captados":
            parseFloat(document.getElementById("mClientes").value) || 0,
          "Ingresos Generados":
            parseFloat(document.getElementById("mIngresos").value) || 0,
          Observaciones: document.getElementById("mObs").value,
        };

        if (idVal) {
          payload[KEY_COL] = idVal;
        } else {
          payload[KEY_COL] = "MKT_" + Date.now();
        }

        try {
          if (typeof appSheetCRUD === "function") {
            const act = idVal ? "Edit" : "Add";
            await appSheetCRUD("Marketing", act, [payload]);
          } else {
            await new Promise((r) => setTimeout(r, 1000));
          }
          cerrarForm();
          await cargarDatos();
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          document.getElementById("spinner").style.display = "none";
        }
      };

      /* Helpers */
      function clp(v) {
        return (
          "$" +
          new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(v)
        );
      }
      function fmtFecha(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleDateString("es-CL", { timeZone: "UTC" });
      }

      // NUEVO HELPER: Convierte cualquier fecha a YYYY-MM-DD para el input
      function toInputDate(val) {
        if (!val) return "";
        // Si ya viene como YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(val))) return String(val);

        // Si viene en formato ISO con T (2026-01-10T12:00:00)
        if (String(val).includes("T")) return String(val).split("T")[0];

        // Intento con objeto Date
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

        return "";
      }

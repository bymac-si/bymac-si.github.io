// ===== Extracted from detalle_gastos.html =====

/* --- HELPERS --- */
      function clp(v) {
        return "$" + new Intl.NumberFormat("es-CL").format(v || 0);
      }
      function parseMonto(v) {
        return (
          parseFloat(
            String(v)
              .replace(/\$|\.|,/g, "")
              .trim()
          ) || 0
        );
      }
      function parsePct(v) {
        return parseFloat(String(v).replace(",", ".")) || 0;
      }
      function getKeyVal(o) {
        return o.ID || o.id || "";
      }

      let USUARIO = null;
      let PROV_MAP = {}; // Mapa de proveedores: ID -> Nombre

      document.addEventListener("DOMContentLoaded", async () => {
        try {
          // 1. CORRECCIÓN SESIÓN: Leer sesion_externa
          const sesionStr = localStorage.getItem("sesion_externa");
          
          if (!sesionStr) {
             console.warn("No session found, redirecting");
             window.location.href = "login_residente.html";
             return;
          }
          
          const sesionObj = JSON.parse(sesionStr);
          USUARIO = sesionObj.datos; // Extraer datos reales del envoltorio

          // Mostrar Unidad en Header (si existe etiqueta, si no el ID)
          document.getElementById("lblUnidad").textContent =
            USUARIO.UnidadLabel || USUARIO.UnidadID || "...";

          await cargarDetalle();
        } catch (e) {
          console.error(e);
          alert("Error cargando detalles. Revisa tu conexión.");
        } finally {
          document.getElementById("loader").style.display = "none";
        }
      });

      async function cargarDetalle() {
        // 2. CARGA DE DATOS (Incluyendo Proveedores ahora)
        const [
          copropiedades,
          unidades,
          gastos,
          cobros,
          gastosComunes,
          proveedores,
        ] = await Promise.all([
          fetchData("Copropiedades"),
          fetchData("Unidades"),
          fetchData("Gastos").catch(() => []),
          fetchData("Cobros").catch(() => []),
          fetchData("GastosComunes").catch(() => []),
          fetchData("Proveedores").catch(() => []), // <--- NUEVO
        ]);

        // 3. Crear Mapa de Proveedores para búsqueda rápida
        proveedores.forEach((p) => {
          PROV_MAP[getKeyVal(p)] = p.Nombre || p.RazonSocial || "Proveedor";
        });

        const myCoproID = String(USUARIO.CopropiedadID).trim();
        const myUnidadID = String(USUARIO.UnidadID).trim();

        const comunidad = copropiedades.find(
          (c) => String(getKeyVal(c)) === myCoproID
        );
        const unidad = unidades.find(
          (u) => String(getKeyVal(u)) === myUnidadID
        );

        if (!comunidad || !unidad) throw new Error("Datos de comunidad/unidad no encontrados");

        // --- Periodo ---
        const hoy = new Date();
        const mesStr = `${String(hoy.getMonth() + 1).padStart(
          2,
          "0"
        )}-${hoy.getFullYear()}`;
        document.getElementById("lblMes").textContent =
          new Date().toLocaleDateString("es-CL", {
            month: "long",
            year: "numeric",
          });

        const fechaVence = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 5);
        document.getElementById("lblVence").textContent =
          fechaVence.toLocaleDateString("es-CL");

        // --- Gastos Mes ---
        let totalGastoComunidad = 0;
        
        // Filtrar gastos de la comunidad y del mes actual
        const gastosMes = gastos.filter((g) => {
          if (String(g.CopropiedadID) !== myCoproID) return false;
          // Filtro simple por mes actual (mejora esto en producción con g.Fecha)
          if (!g.Fecha) return false;
          const d = new Date(g.Fecha);
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const y = d.getFullYear();
          return `${m}-${y}` === mesStr;
        });

        totalGastoComunidad = gastosMes.reduce(
          (s, g) => s + parseMonto(g.Monto),
          0
        );

        // --- Cuota ---
        const alicuota = parsePct(unidad.Alicuota);
        const pctFondo = parsePct(comunidad.FondoReserva);
        const factorFondo = pctFondo > 1 ? pctFondo / 100 : pctFondo;

        const miGastoComun = Math.round(totalGastoComunidad * (alicuota / 100));
        const miFondo = Math.round(miGastoComun * factorFondo);

        // --- Deuda Anterior ---
        const moras = cobros.filter(
          (c) =>
            String(c.UnidadID) === myUnidadID &&
            c.Estado === "Pendiente" &&
            c.Mes !== mesStr
        );
        const totalMora = moras.reduce(
          (s, c) => s + parseMonto(c.TotalAPagar),
          0
        );

        // --- Cobro Oficial ---
        const cobroActual = cobros.find(
          (c) => String(c.UnidadID) === myUnidadID && c.Mes === mesStr
        );
        let finalPagar = 0;

        if (cobroActual) {
          const gcOficial = parseMonto(cobroActual.MontoGastoComun);
          const moraOficial = parseMonto(cobroActual.MontoMoraAnterior);

          if (cobroActual.Estado === "Pagado") {
            document.getElementById("resGC").textContent = "$0 (Pagado)";
            document.getElementById("resGC").style.color = "#10b981";
            document.getElementById("resMiCuota").textContent = "$0";
            document.getElementById("resFondo").textContent = "$0";
            document.getElementById("resDeuda").textContent = clp(totalMora);
            finalPagar = totalMora;
          } else {
            const totalOficial = parseMonto(cobroActual.TotalAPagar);
            const fondoInferido = totalOficial - gcOficial - moraOficial;

            document.getElementById("resGC").textContent =
              clp(totalGastoComunidad);
            document.getElementById("resMiCuota").textContent = clp(gcOficial);
            document.getElementById("resFondo").textContent = clp(
              fondoInferido > 0 ? fondoInferido : 0
            );
            document.getElementById("resDeuda").textContent = clp(moraOficial);
            finalPagar = totalOficial;
          }
        } else {
          document.getElementById("resGC").textContent =
            clp(totalGastoComunidad);
          document.getElementById("resMiCuota").textContent = clp(miGastoComun);
          document.getElementById("resFondo").textContent = clp(miFondo);
          document.getElementById("resDeuda").textContent = clp(totalMora);
          finalPagar = miGastoComun + miFondo + totalMora;
        }

        // --- Render UI ---
        document.getElementById("lblAlicuota").textContent = alicuota + "%";
        document.getElementById("lblFondoPct").textContent =
          factorFondo * 100 + "%";
        document.getElementById("resTotal").textContent = clp(finalPagar);
        document.getElementById("lblTotalComunidad").textContent =
          clp(totalGastoComunidad);

        if (totalMora > 0) {
          document.getElementById("rowDeudaAnt").style.display = "flex";
          document.getElementById("wrapperDeudas").style.display = "block";
          const listaDeudas = document.getElementById("listaDeudas");
          listaDeudas.innerHTML = moras
            .map(
              (m) => `
                <div class="debt-item">
                    <span>${m.Mes}</span>
                    <span>${clp(parseMonto(m.TotalAPagar))}</span>
                </div>
            `
            )
            .join("");
        }

        renderDesglose(gastosMes);
      }

      function renderDesglose(gastos) {
        const container = document.getElementById("listaGastosComunidad");
        if (gastos.length === 0) {
          container.innerHTML =
            '<div style="text-align:center; padding:30px; color:#94a3b8; font-size:13px;">No hay gastos registrados este mes.</div>';
          return;
        }

        // Agrupar
        const grupos = {};
        gastos.forEach((g) => {
          const cat = g.TipoGasto || "Otros";
          if (!grupos[cat]) grupos[cat] = { total: 0, items: [] };
          grupos[cat].total += parseMonto(g.Monto);
          grupos[cat].items.push(g);
        });

        let html = "";
        for (const [cat, data] of Object.entries(grupos)) {
          html += `
            <div class="expense-group">
                <div class="group-header">
                    <span>${cat}</span>
                    <span>${clp(data.total)}</span>
                </div>
                ${data.items
                  .map((item) => {
                    // RESOLUCIÓN DE NOMBRE DE PROVEEDOR
                    // Buscamos en el mapa si existe ID, si no usamos el campo texto, si no "Sin Proveedor"
                    const nombreProv =
                      PROV_MAP[item.ProveedorID] || item.Proveedor || "";
                    const descrip = item.Descripcion || "";

                    return `
                    <div class="expense-item">
                        <div class="exp-main">
                            <span class="exp-provider">${
                              nombreProv || "Gasto General"
                            }</span>
                            <span class="exp-desc">${descrip}</span>
                            <span class="exp-date">${
                              item.Fecha
                                ? new Date(item.Fecha).toLocaleDateString()
                                : ""
                            }</span>
                        </div>
                        <div class="exp-amount">${clp(
                          parseMonto(item.Monto)
                        )}</div>
                    </div>
                `;
                  })
                  .join("")}
            </div>`;
        }
        container.innerHTML = html;
      }

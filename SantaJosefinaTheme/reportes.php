<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>CRM - Reportes Gastos Comunes</title>
  <link rel="stylesheet" href="css/styles.css" />
  <script src="js/app.js"></script>
  <script src="assets/js/gastos-comunes.js"></script> <!-- 🔹 Nuevo -->
  <script>requireAuth();</script>
</head>
<body>
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Reporte de Gastos Comunes</h1>

  <div style="margin-bottom:20px;">
    <label for="reporteCopro"><b>Copropiedad:</b></label>
    <select id="reporteCopro"></select>

    <label for="reporteMes" style="margin-left:20px;"><b>Mes:</b></label>
    <select id="reporteMes"></select>

    <button onclick="window.print()" class="btn-outline" style="margin-left:20px;">🖨 Imprimir</button>
  </div>

  <h2>Total de Gastos: <span id="totalGastos">$0</span></h2>

  <table>
    <thead>
      <tr>
        <th>Unidad</th>
        <th>Propietario</th>
        <th>Alicuota (%)</th>
        <th>Prorrateo</th>
      </tr>
    </thead>
    <tbody id="tablaReporte"></tbody>
  </table>

  <div id="desgloseWrapper" style="margin-top:40px;"></div>
</main>

<div id="footer"></div>

<script>
let copros=[], unidades=[], gastosComunes=[], copropietarios=[], gastos=[];

async function cargarReporte(){
  [copros, unidades, gastosComunes, copropietarios, gastos] = await Promise.all([
    fetchData("Copropiedades"),
    fetchData("Unidades"),
    fetchData("GastosComunes"),  // 🔹 corregido
    fetchData("Copropietarios"),
    fetchData("Gastos")
  ]);

  reporteCopro.innerHTML = copros.map(c =>
    `<option value="${getKeyVal(c)}">${c.Nombre}</option>`
  ).join("");

  reporteCopro.addEventListener("change", cargarMeses);
  cargarMeses();
}

function cargarMeses(){
  const coproID = reporteCopro.value;

  const meses = gastosComunes
    .filter(gc => String(gc.CopropiedadID) === String(coproID))
    .map(gc => gc.Mes);

  const mesesUnicos = [...new Set(meses)].sort();
  reporteMes.innerHTML = mesesUnicos.map(m =>
    `<option value="${m}">${m}</option>`
  ).join("");

  reporteMes.addEventListener("change", renderReporte);
  renderReporte();
}

function renderReporte(){
  const coproID = reporteCopro.value;
  const mesSel = reporteMes.value;

  const gc = gastosComunes.find(x =>
    String(x.CopropiedadID) === String(coproID) && String(x.Mes) === String(mesSel)
  );

  const total = gc ? parseFloat(gc.TotalGastos) : 0;
  totalGastos.textContent = formatoPrecio(total);

  const unidadesC = unidades.filter(u => String(u.CopropiedadID) === String(coproID));
  tablaReporte.innerHTML = unidadesC.map(u=>{
    const prop = copropietarios.find(p => getKeyVal(p) === u.PropietarioID);
    const cuota = (parseFloat(u.Alicuota)||0)/100 * total;
    return `
      <tr>
        <td>${u.Numero}</td>
        <td>${prop?.Nombre || "—"}</td>
        <td>${u.Alicuota || 0}</td>
        <td>${formatoPrecio(cuota)}</td>
      </tr>
    `;
  }).join("");

  // 🔹 Desglose
  const gastosMes = gastos.filter(g =>
    String(g.CopropiedadID) === String(coproID) &&
    String(g.Mes) === String(mesSel)
  );

  const desglose = {};
  gastosMes.forEach(g=>{
    const tipo = g.TipoGasto || "Sin clasificar";
    desglose[tipo] = (desglose[tipo] || 0) + (parseFloat(g.Monto)||0);
  });

  const wrapper = document.getElementById("desgloseWrapper");
  wrapper.innerHTML = `
    <h3>Desglose de Gastos (${mesSel})</h3>
    <table>
      <thead><tr><th>Tipo de Gasto</th><th>Monto</th></tr></thead>
      <tbody>
        ${Object.entries(desglose).map(([tipo,monto])=>`
          <tr><td>${tipo}</td><td>${formatoPrecio(monto)}</td></tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

cargarReporte();
</script>
</body>
</html>
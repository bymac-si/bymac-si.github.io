<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Reportes Gastos Comunes</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/app.js"></script>
  <script>requireAuth();</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
</head>
<body>
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Reporte de Gastos Comunes</h1>

  <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
    <div><label><b>Copropiedad</b></label><br><select id="reporteCopro"></select></div>
    <div><label><b>Mes (MM-YYYY)</b></label><br><select id="reporteMes"></select></div>
    <div style="margin-left:auto;display:flex;gap:8px;">
      <button class="btn-outline" onclick="window.print()">🖨 Imprimir</button>
      <button class="btn-primary" onclick="exportarPDF()">📄 Exportar PDF</button>
    </div>
  </div>

  <h2>Total de Gastos: <span id="totalGastos">$0</span></h2>

  <h3 style="margin-top:16px;">Prorrateo por Unidad</h3>
  <table>
    <thead><tr><th>Unidad</th><th>Propietario</th><th>Alicuota (%)</th><th>Prorrateo</th></tr></thead>
    <tbody id="tablaReporte"></tbody>
  </table>

  <div id="desgloseWrapper" style="margin-top:28px;"></div>
</main>

<div id="footer"></div>

<script>
document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();
});

let copros=[], unidades=[], gastosComunes=[], copropietarios=[], gastos=[];
let ultimo={};

async function cargar(){
  [copros, unidades, gastosComunes, copropietarios, gastos] = await Promise.all([
    fetchData("Copropiedades"),
    fetchData("Unidades"),
    fetchData("GastosComunes"),   // nombre exacto
    fetchData("Copropietarios"),
    fetchData("Gastos")
  ]);

  reporteCopro.innerHTML = copros.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
  reporteCopro.onchange = ()=>{ cargarMeses(); };

  cargarMeses();
}

function cargarMeses(){
  const coproID = reporteCopro.value;
  const meses = gastosComunes
    .filter(gc=>String(gc.CopropiedadID)===String(coproID))
    .map(gc=>gc.Mes);

  const mesesUnicos = [...new Set(meses)].sort((a,b)=>{
    const [ma,ya]=(a||"").split("-").map(Number);
    const [mb,yb]=(b||"").split("-").map(Number);
    return (ya-yb)||(ma-mb);
  });

  reporteMes.innerHTML = mesesUnicos.map(m=>`<option value="${m}">${m}</option>`).join("");
  reporteMes.onchange = render;
  render();
}

function render(){
  const coproID=reporteCopro.value;
  const mesSel=reporteMes.value;

  const gc = gastosComunes.find(x=>String(x.CopropiedadID)===String(coproID) && String(x.Mes)===String(mesSel));
  const total = gc ? parseFloat(gc.TotalGastos) : 0;
  totalGastos.textContent = formatoPrecio(total);

  const unidadesC = unidades.filter(u=>String(u.CopropiedadID)===String(coproID));
  const propietarioNombre = id => (copropietarios.find(p=>getKeyVal(p)===id)?.Nombre || "—");
  tablaReporte.innerHTML = unidadesC.map(u=>{
    const cuota = (parseFloat(u.Alicuota)||0)/100 * total;
    return `<tr>
      <td>${u.Numero}</td>
      <td>${propietarioNombre(u.PropietarioID)}</td>
      <td>${u.Alicuota||0}</td>
      <td>${formatoPrecio(cuota)}</td>
    </tr>`;
  }).join("");

  const gastosMes = gastos.filter(g=>String(g.CopropiedadID)===String(coproID) && String(g.Mes)===String(mesSel));
  const desglose={};
  gastosMes.forEach(g=>{
    const t = g.TipoGasto || "Sin clasificar";
    desglose[t] = (desglose[t]||0) + (parseFloat(g.Monto)||0);
  });

  desgloseWrapper.innerHTML = `
    <h3>Desglose de Gastos (${mesSel})</h3>
    <table id="tablaDesglose">
      <thead><tr><th>Tipo de Gasto</th><th>Monto</th></tr></thead>
      <tbody>
        ${Object.entries(desglose).map(([t,m])=>`<tr><td>${t}</td><td>${formatoPrecio(m)}</td></tr>`).join("")}
      </tbody>
    </table>
  `;

  ultimo = {mesSel, coproID, total};
}

function exportarPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Reporte de Gastos - ${reporteMes.value}`, 14, 15);
  doc.text(`Copropiedad: ${copros.find(c=>String(getKeyVal(c))===String(reporteCopro.value))?.Nombre||""}`,14,22);
  doc.text(`Total: ${totalGastos.textContent}`,14,29);
  doc.autoTable({ html:'#tablaDesglose', startY: 36, theme:'grid', headStyles:{fillColor:[26,43,72]} });
  doc.save(`Gastos_${reporteMes.value}.pdf`);
}

cargar();
</script>
</body>
</html>
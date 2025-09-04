<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Reportes Gastos Comunes</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/app.js"></script>
  <script>requireAuth();</script>
  <!-- Librerías externas -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
  <style>
    /* Ocultar printArea salvo en impresión */
    #printArea { display:none; }
    @media print {
      body * { visibility:hidden; }
      #printArea, #printArea * { visibility:visible; }
      #printArea { display:block; position:absolute; top:0; left:0; width:100%; padding:20px; color:black; }
    }
  </style>
</head>
<body>
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Reporte de Gastos Comunes</h1>

  <!-- Filtros -->
  <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
    <div>
      <label><b>Copropiedad</b></label><br>
      <select id="reporteCopro"></select>
    </div>
    <div>
      <label><b>Mes (MM-YYYY)</b></label><br>
      <select id="reporteMes"></select>
    </div>
    <div style="margin-left:auto;display:flex;gap:8px;">
      <button class="btn-outline" onclick="window.print()">🖨 Imprimir</button>
      <button class="btn-primary" onclick="exportarPDF()">📄 Exportar PDF</button>
    </div>
  </div>

  <!-- Vista Web -->
  <h2>Total de Gastos: <span id="totalGastos">$0</span></h2>
  <h3 style="margin-top:16px;">Prorrateo por Unidad</h3>
  <table>
    <thead><tr><th>Unidad</th><th>Propietario</th><th>Alicuota (%)</th><th>Prorrateo</th></tr></thead>
    <tbody id="tablaReporte"></tbody>
  </table>
  <div id="desgloseWrapper" style="margin-top:28px;"></div>
</main>

<!-- Print-Friendly -->
<div id="printArea">
  <div style="text-align:center; margin-bottom:20px;">
    <h2 id="printCopro"></h2>
	  <h3 id="printDir"></h3>
    <h3>Mes: <span id="printMes"></span></h3>
  </div>
  <h2>Total de Gastos: <span id="totalGastosPrint">$0</span></h2>
  <h3>Prorrateo por Unidad</h3>
  <table>
    <thead><tr><th>Unidad</th><th>Propietario</th><th>Alicuota</th><th>Prorrateo</th></tr></thead>
    <tbody id="tablaReportePrint"></tbody>
  </table>
  <div id="desgloseWrapperPrint" style="margin-top:20px;"></div>
</div>

<div id="footer"></div>

<script>
document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();
  cargarReporte();
});

let copros=[], unidades=[], gastosComunes=[], copropietarios=[], gastos=[], provs=[];
let ultimo={};

// formato fecha DD/MM/YYYY
function formatFechaDDMMYYYY(fechaISO){
  if(!fechaISO) return "—";
  const d = new Date(fechaISO);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

async function cargarReporte(){
  [copros, unidades, gastosComunes, copropietarios, gastos, provs] = await Promise.all([
    fetchData("Copropiedades"),
    fetchData("Unidades"),
    fetchData("GastosComunes"),
    fetchData("Copropietarios"),
    fetchData("Gastos"),
    fetchData("Proveedores")
  ]);

  reporteCopro.innerHTML = copros.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
  reporteCopro.onchange = ()=> cargarMeses();
  cargarMeses();
}

function cargarMeses(){
  const coproID = reporteCopro.value;
  const meses = gastosComunes.filter(gc=>String(gc.CopropiedadID)===String(coproID)).map(gc=>gc.Mes);
  const mesesUnicos = [...new Set(meses)].sort((a,b)=>{
    const [ma,ya]=(a||"").split("-").map(Number);
    const [mb,yb]=(b||"").split("-").map(Number);
    return (ya-yb)||(ma-mb);
  });
  reporteMes.innerHTML = mesesUnicos.map(m=>`<option value="${m}">${m}</option>`).join("");
  reporteMes.onchange = renderReporte;
  renderReporte();
}

function renderReporte(){
  const coproID=reporteCopro.value;
  const mesSel=reporteMes.value;
  const provMap={}; provs.forEach(p=>provMap[getKeyVal(p)]=p.Nombre);

  const gc = gastosComunes.find(x=>String(x.CopropiedadID)===String(coproID) && String(x.Mes)===String(mesSel));
  const total = gc ? parseFloat(gc.TotalGastos) : 0;
  totalGastos.textContent = formatoPrecio(total);
  totalGastosPrint.textContent = formatoPrecio(total);

  const unidadesC = unidades.filter(u=>String(u.CopropiedadID)===String(coproID));
  const propietarioNombre = id => (copropietarios.find(p=>getKeyVal(p)===id)?.Nombre || "—");
  const rows = unidadesC.map(u=>{
    const cuota = Math.round(((parseFloat(u.Alicuota)||0)/100) * total);
    return `<tr><td>${u.Numero}</td><td>${propietarioNombre(u.PropietarioID)}</td><td>${u.Alicuota||0}</td><td>${formatoPrecio(cuota)}</td></tr>`;
  }).join("");
  tablaReporte.innerHTML = rows;
  tablaReportePrint.innerHTML = rows;

  // desglose consolidado
  const gastosMes = gastos.filter(g=>String(g.CopropiedadID)===String(coproID) && String(g.Mes)===String(mesSel));
  const desglose={};
  gastosMes.forEach(g=>{
    const t = g.TipoGasto || "Sin clasificar";
    if(!desglose[t]) desglose[t]={total:0, items:[]};
    desglose[t].total += (parseFloat(g.Monto)||0);
    desglose[t].items.push(g);
  });

  function renderDesglose(wrapperId){
    document.getElementById(wrapperId).innerHTML = `
      <h3>Desglose de Gastos (${mesSel})</h3>
      <table id="tablaDesglose" style="width:100%;margin-top:8px;border-collapse:collapse;">
        <thead><tr><th>Tipo</th><th>Proveedor</th><th>Fecha</th><th>Documento</th><th>Monto</th></tr></thead>
        <tbody>
          ${Object.entries(desglose).map(([tipo,data])=>
            data.items.map((it,i)=>`
              <tr>
                ${i===0?`<td rowspan="${data.items.length}"><b>${tipo}</b><br>${formatoPrecio(data.total)}</td>`:""}
                <td>${provMap[it.ProveedorID]||"—"}</td>
                <td>${formatFechaDDMMYYYY(it.Fecha)}</td>
                <td>${it.Documento||""}</td>
                <td>${formatoPrecio(it.Monto)}</td>
              </tr>
            `).join("")
          ).join("")}
        </tbody>
      </table>
    `;
  }
  renderDesglose("desgloseWrapper");
  renderDesglose("desgloseWrapperPrint");

  printCopro.textContent = copros.find(c=>String(getKeyVal(c))===String(coproID))?.Nombre||"";
  printDir.textContent = copros.find(c=>String(getKeyVal(c))===String(coproID))?.Direccion||"";
  printMes.textContent = mesSel;
}

function exportarPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Reporte de Gastos - ${reporteMes.value}`, 14, 15);
  doc.autoTable({ html:'#tablaDesglose', startY:25, theme:'grid', headStyles:{fillColor:[26,43,72]} });
  doc.save(`Gastos_${reporteMes.value}.pdf`);
}
</script>
</body>
</html>
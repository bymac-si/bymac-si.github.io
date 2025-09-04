<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Reportes Gastos Comunes</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/app.js"></script>
  <script>requireAuth();</script>
  <style>
    /* Print-Friendly oculto por defecto */
    #printArea { display:none; }
    @media print {
      body * { visibility:hidden; }
      #printArea, #printArea * { visibility:visible; }
      #printArea { display:block; position:absolute; top:0; left:0; width:100%; padding:20px; color:black; }
    }
    .resumen-totales {
      display:flex;
      gap:40px;
      margin:20px 0;
      font-size:18px;
      font-weight:bold;
    }
    .resumen-totales span { color:#B46A55; }
    .info-copro { margin-bottom:15px; font-size:14px; color:#444; }
  </style>
</head>
<body style="max-width:1200px; margin: 0 auto;">
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
      <label><b>Mes</b></label><br>
      <select id="reporteMes"></select>
    </div>
    <div style="margin-left:auto;display:flex;gap:8px;">
      <button class="btn-outline" onclick="window.print()">🖨 Imprimir</button>
    </div>
  </div>

  <!-- Info Copropiedad -->
  <div class="info-copro">
    <b>Nombre:</b> <span id="infoNombre"></span><br>
    <b>Dirección:</b> <span id="infoDir"></span><br>
    <b>RUT:</b> <span id="infoRut"></span>
  </div>

  <!-- Resumen Totales -->
  <div class="resumen-totales">
    <div>Total Gastos: <span id="resTotalGastos">$0</span></div>
    <div>Aporte Fondo Reserva: <span id="resFondo">$0</span></div>
    <div>Total General: <span id="resTotalGeneral">$0</span></div>
  </div>

  <!-- Tabla de prorrateo -->
  <h3>Prorrateo por Unidad</h3>
  <table>
    <thead>
      <tr>
        <th>Unidad</th>
        <th>Propietario</th>
        <th>Alicuota (%)</th>
        <th>Prorrateo Gastos</th>
        <th>Aporte Fondo Reserva</th>
        <th>Total a Pagar</th>
      </tr>
    </thead>
    <tbody id="tablaReporte"></tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right;"><b>Totales:</b></td>
        <td id="totalGastosUnidades">$0</td>
        <td id="totalFondosUnidades">$0</td>
        <td id="totalFinalUnidades"><b>$0</b></td>
      </tr>
    </tfoot>
  </table>

  <div id="desgloseWrapper" style="margin-top:28px;"></div>
</main>

<!-- Print-Friendly -->
<div id="printArea">
  <div style="text-align:center; margin-bottom:20px;">
    <h2 id="printCopro"></h2>
    <h3 id="printDir"></h3>
    <h3 id="printRut"></h3>
    <h3>Mes: <span id="printMes"></span></h3>
  </div>

  <div class="resumen-totales">
    <div>Total Gastos: <span id="resTotalGastosPrint">$0</span></div>
    <div>Aporte Fondo Reserva: <span id="resFondoPrint">$0</span></div>
    <div>Total General: <span id="resTotalGeneralPrint">$0</span></div>
  </div>

  <h3>Prorrateo por Unidad</h3>
  <table>
    <thead>
      <tr>
        <th>Unidad</th>
        <th>Propietario</th>
        <th>Alicuota</th>
        <th>Prorrateo Gastos</th>
        <th>Aporte Fondo Reserva</th>
        <th>Total a Pagar</th>
      </tr>
    </thead>
    <tbody id="tablaReportePrint"></tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right;"><b>Totales:</b></td>
        <td id="totalGastosUnidadesPrint">$0</td>
        <td id="totalFondosUnidadesPrint">$0</td>
        <td id="totalFinalUnidadesPrint"><b>$0</b></td>
      </tr>
    </tfoot>
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

function formatMesLargo(mes){
  if(!mes) return "";
  const [mm,yyyy]=mes.split("-");
  const fecha=new Date(Number(yyyy), Number(mm)-1, 1);
  return fecha.toLocaleDateString("es-CL",{month:"long", year:"numeric"});
}
function formatoCLP(n){ return "$"+new Intl.NumberFormat("es-CL").format(n||0); }
function formatFechaDDMMYYYY(fechaISO){
  if(!fechaISO) return "—";
  const d=new Date(fechaISO);
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
  const coproID=reporteCopro.value;
  const meses=gastosComunes.filter(gc=>String(gc.CopropiedadID)===String(coproID)).map(gc=>gc.Mes);
  const mesesUnicos=[...new Set(meses)].sort((a,b)=>{
    const [ma,ya]=(a||"").split("-").map(Number);
    const [mb,yb]=(b||"").split("-").map(Number);
    return (ya-yb)||(ma-mb);
  });
  reporteMes.innerHTML = mesesUnicos.map(m=>`<option value="${m}">${formatMesLargo(m)}</option>`).join("");
  reporteMes.onchange = renderReporte;
  renderReporte();
}

function renderReporte(){
  const coproID=reporteCopro.value;
  const mesSel=reporteMes.value;
  const mesTexto=formatMesLargo(mesSel);

  const copro=copros.find(c=>String(getKeyVal(c))===String(coproID));
  const gc=gastosComunes.find(x=>String(x.CopropiedadID)===String(coproID) && String(x.Mes)===mesSel);

  const total=gc ? parseFloat(gc.TotalGastos):0;
  const fondoPct=parseFloat(copro?.FondoReserva)||0;
  const aporteFondo=Math.round(total*(fondoPct/100));
  const totalGeneral=total+aporteFondo;

  // Info copropiedad
  infoNombre.textContent=copro?.Nombre||"";
  infoDir.textContent=copro?.Direccion||"";
  infoRut.textContent=copro?.RUT||"";

  printCopro.textContent=copro?.Nombre||"";
  printDir.textContent=copro?.Direccion||"";
  printRut.textContent="RUT: "+(copro?.RUT||"");
  printMes.textContent=mesTexto;

  // Resumen
  resTotalGastos.textContent=formatoCLP(total);
  resFondo.textContent=formatoCLP(aporteFondo);
  resTotalGeneral.textContent=formatoCLP(totalGeneral);

  resTotalGastosPrint.textContent=formatoCLP(total);
  resFondoPrint.textContent=formatoCLP(aporteFondo);
  resTotalGeneralPrint.textContent=formatoCLP(totalGeneral);

  // ... resto de lógica de prorrateo y desglose igual que antes ...
}
</script>
</body>
</html>
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
    .categoria-separador { border-top:2px solid #333; margin:10px 0; }
  </style>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h2 class="page-title">Reporte de Gastos Comunes</h2>
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
   <div class="categoria-separador"></div>

  <!-- Encabezado Web -->
  <div id="encabezadoWeb" style="margin-bottom:20px;">
    <h3 id="webCopro"></h3>
    <p id="webDir"></p>
    <p><b>RUT:</b> <span id="webRUT"></span></p>
    <h3>Mes: <span id="webMes"></span></h3>
  </div>

  <!-- Totales -->
  <h2>Total de Gastos: <span id="totalGastos">$0</span></h2>
  <h3>Aporte Fondo de Reserva: <span id="aporteFR">$0</span></h3>
  <h2>Total a Pagar: <span id="totalFinal">$0</span></h2>

  <!-- Tabla de prorrateo -->
  <h3 style="margin-top:16px;">Prorrateo por Unidad</h3>
  <table>
    <thead>
      <tr>
        <th>Unidad</th>
        <th>Propietario</th>
        <th>Alicuota (%)</th>
        <th>Gasto Común</th>
        <th>Fondo de Reserva</th>
        <th>Total a Pagar</th>
      </tr>
    </thead>
    <tbody id="tablaReporte"></tbody>
  </table>

  <!-- Desglose -->
  <div id="desgloseWrapper" style="margin-top:28px;"></div>
</main>

<!-- Print-Friendly -->
<div id="printArea">
  <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/logo_santajosefina.png"
           alt="Logo Santa Josefina" style="width:140px;height:auto;padding-bottom:-50px;">
  <p style="position: relative; top: -40px;"> <span style="font: size 1.1em;">Santa Josefina SpA</span>
  <br><span style="font-size: 0.7em;">RUT: 77.233.573-3
  <br>Administración de Edificios y Condominios</p></span>
	<br><br>
  <div style="text-align:center; margin-bottom:20px;position: relative; top: -20px;">
    <h2>Informe de Gastos Comunes</h2>
    <h3 id="printCopro"></h3>
    <h4 id="printDir"></h4>
    <p><b>RUT:</b> <span id="printRUT"></span></p>
    <h4>Mes: <span id="printMes"></span></h4>
  </div>
  <h3>Total de Gastos: <span id="totalGastosPrint">$0</span></h3>
  <h4>Aporte Fondo de Reserva: <span id="aporteFRPrint">$0</span></h4>
  <h3>Total a Pagar: <span id="totalFinalPrint">$0</span></h3>

  <h4>Prorrateo por Unidad</h4>
  <table>
    <thead>
      <tr>
        <th>Unidad</th>
        <th>Propietario</th>
        <th>Alicuota</th>
        <th>Gasto Común</th>
        <th>Fondo de Reserva</th>
        <th>Total a Pagar</th>
      </tr>
    </thead>
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

// === Helpers ===
function formatoEntero(v){ return "$"+ new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(v||0); }
function formatMesLargo(mes){
  if(!mes) return "";
  const [mm,yyyy]=mes.split("-");
  const fecha=new Date(Number(yyyy), Number(mm)-1, 1);
  return fecha.toLocaleDateString("es-CL",{month:"long", year:"numeric"});
}
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
  document.getElementById("reporteCopro").innerHTML = copros.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
  document.getElementById("reporteCopro").onchange = ()=> cargarMeses();
  cargarMeses();
}

function cargarMeses(){
  const coproID=document.getElementById("reporteCopro").value;
  const meses=gastosComunes.filter(gc=>String(gc.CopropiedadID)===String(coproID)).map(gc=>gc.Mes);
  const mesesUnicos=[...new Set(meses)].sort((a,b)=>{
    const [ma,ya]=(a||"").split("-").map(Number);
    const [mb,yb]=(b||"").split("-").map(Number);
    return (ya-yb)||(ma-mb);
  });
  document.getElementById("reporteMes").innerHTML = mesesUnicos.map(m=>`<option value="${m}">${formatMesLargo(m)}</option>`).join("");
  document.getElementById("reporteMes").onchange = renderReporte;
  renderReporte();
}

function renderReporte(){
  const coproID=document.getElementById("reporteCopro").value;
  const mesSel=document.getElementById("reporteMes").value;
  const mesTexto=formatMesLargo(mesSel);

  const provMap={}; provs.forEach(p=>provMap[getKeyVal(p)]=p.Nombre);

  // Copropiedad actual
  const copro=copros.find(c=>String(getKeyVal(c))===String(coproID));
  const fondoReservaPct=parseFloat(copro?.FondoReserva||0)/100;

  // Totales
  const gc=gastosComunes.find(x=>String(x.CopropiedadID)===String(coproID) && String(x.Mes)===mesSel);
  const totalG=gc ? parseFloat(gc.TotalGastos):0;
  const aporteFR=totalG*fondoReservaPct;
  const totalFinal=totalG+aporteFR;

  // Encabezados
  document.getElementById("webCopro").textContent=copro?.Nombre||"";
  document.getElementById("webDir").textContent=copro?.Direccion||"";
  document.getElementById("webRUT").textContent=copro?.RUT||"";
  document.getElementById("webMes").textContent=mesTexto;

  document.getElementById("printCopro").textContent=copro?.Nombre||"";
  document.getElementById("printDir").textContent=copro?.Direccion||"";
  document.getElementById("printRUT").textContent=copro?.RUT||"";
  document.getElementById("printMes").textContent=mesTexto;

  document.getElementById("totalGastos").textContent=formatoEntero(totalG);
  document.getElementById("aporteFR").textContent=formatoEntero(aporteFR);
  document.getElementById("totalFinal").textContent=formatoEntero(totalFinal);

  document.getElementById("totalGastosPrint").textContent=formatoEntero(totalG);
  document.getElementById("aporteFRPrint").textContent=formatoEntero(aporteFR);
  document.getElementById("totalFinalPrint").textContent=formatoEntero(totalFinal);

  // Prorrateo
  const unidadesC=unidades.filter(u=>String(u.CopropiedadID)===String(coproID));
  const propietarioNombre=id=>(copropietarios.find(p=>getKeyVal(p)===id)?.Nombre||"—");
  const rows=unidadesC.map(u=>{
    const cuotaGasto=Math.round(((parseFloat(u.Alicuota)||0)/100)*totalG);
    const cuotaFR=Math.round(((parseFloat(u.Alicuota)||0)/100)*aporteFR);
    const cuotaTotal=cuotaGasto+cuotaFR;
    return `<tr>
      <td>${u.Numero}</td>
      <td>${propietarioNombre(u.PropietarioID)}</td>
      <td>${u.Alicuota||0}</td>
      <td>${formatoEntero(cuotaGasto)}</td>
      <td>${formatoEntero(cuotaFR)}</td>
      <td>${formatoEntero(cuotaTotal)}</td>
    </tr>`;
  }).join("");
  document.getElementById("tablaReporte").innerHTML=rows;
  document.getElementById("tablaReportePrint").innerHTML=rows;

  // Desglose con separadores
  const gastosMes=gastos.filter(g=>String(g.CopropiedadID)===String(coproID) && String(g.Mes)===mesSel);
  const desglose={};
  gastosMes.forEach(g=>{
    const t=g.TipoGasto||"Sin clasificar";
    if(!desglose[t]) desglose[t]={total:0, items:[]};
    desglose[t].total+=(parseFloat(g.Monto)||0);
    desglose[t].items.push(g);
  });

  function renderDesglose(wrapperId){
    document.getElementById(wrapperId).innerHTML=`
      <h4>Desglose de Gastos (${mesTexto})</h4>
      ${Object.entries(desglose).map(([tipo,data])=>`
        <div class="categoria-separador"></div>
        <h4>${tipo}: ${formatoEntero(data.total)}</h4>
        <table style="width:100%;margin-top:8px;border-collapse:collapse;">
          <thead><tr><th>Proveedor</th><th>Fecha</th><th>Documento</th><th>Monto</th></tr></thead>
          <tbody>
            ${data.items.map(it=>`
              <tr>
                <td>${provMap[it.ProveedorID]||"—"}</td>
                <td>${formatFechaDDMMYYYY(it.Fecha)}</td>
                <td>${it.Documento||""}</td>
                <td>${formatoEntero(it.Monto)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `).join("")}
    `;
  }
  renderDesglose("desgloseWrapper");
  renderDesglose("desgloseWrapperPrint");
}
</script>
</body>
</html>
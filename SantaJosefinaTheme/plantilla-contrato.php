<?php
/* 
Template Name: Contrato – Corretaje
*/
if ( ! defined( 'ABSPATH' ) ) { exit; }
get_header();
?>
<style>
  body { color:#1A2B48; }
  .container { max-width:1200px; margin:0 auto; padding: 40px; }
  h1.page-title{ font-size:28px; font-weight:700; margin-bottom:16px; }
  h2.section-title{ font-size:18px; font-weight:700; margin:18px 0 8px; }
  .muted{ color:#555; }
  .grid { display:grid; gap:10px; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:18px; }
  .row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; }
  .row > * { flex: 1 1 220px; }
  .label { font-weight:600; display:block; margin-bottom:4px; }
  input, select { font-weight:400; width:90%; padding:10px; border:1px solid #d1d5db; border-radius:6px; }
  .btns { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#f4f4f5; font-size:12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace; }

  table { width:100%; border-collapse:collapse; }
  th, td { padding:8px; border-bottom:1px solid #e5e7eb; text-align:left; }
  th { background:#fafafa; }

  .contrato { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:8px; }
  .contrato p { line-height:1.6; margin: 10px 0; text-align:justify; }
  .firma-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:36px; }
  .firma-box { text-align:center; padding-top:36px; }
  .firma-line { border-top:1px solid #111; margin-top:40px; padding-top:6px; }
  .small { font-size:12px; }

  .spinner-backdrop{ position:fixed; inset:0; background:rgba(255,255,255,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; }
  .spinner-card{ background:#fff; padding:18px 22px; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.08); text-align:center; min-width:260px; color:#1A2B48; font-weight:600; }
  .spinner{ width:28px; height:28px; border-radius:50%; border:3px solid #eee; border-top-color:#B46A55; margin:0 auto 10px auto; animation:spin 0.9s linear infinite; }
  @keyframes spin{ to{ transform:rotate(360deg); } }
  .hidden{ display:none !important; }

  @page { size: Letter; margin: 20mm; }
  @media print { header, footer, .no-print, #wpadminbar { display:none !important; } body { max-width: 100%; } .contrato { border:none; } .logo-print {visibility: visible;} }
  .logo-print { visibility: hidden; }
</style>

<main class="container">
  <h2 class="page-title no-print">Contrato de Corretaje</h2>

  <div class="card no-print">
    <div class="row">
      <div>
        <label class="label">Propiedad / Copropiedad</label>
        <select id="selCopro"></select>
      </div>
      <div>
        <label class="label">Comuna</label>
        <input id="inpComuna" readonly>
      </div>
      <div>
        <label class="label">Dirección</label>
        <input id="inpDir" readonly>
      </div>
      <div>
        <label class="label">Precio de Operación (CLP)</label>
        <input id="inpPrecio" class="mono" placeholder="Ej: 120.000.000" inputmode="decimal">
      </div>
      <div>
        <label class="label">Comisión %</label>
        <select id="selPct">
          <option value="1">1%</option>
          <option value="1.5">1,5%</option>
          <option value="2">2%</option>
        </select>
      </div>
    </div>
    <div class="btns">
      <button class="" onclick="window.location.reload()">🔄 Actualizar</button>
      <button class="" onclick="imprimir()">🖨 Imprimir Contrato</button>
    </div>
  </div>

  <div class="grid no-print">
    <div class="card">
      <h2 class="section-title">Resumen</h2>
      <p><b>Propiedad:</b> <span id="cxCopro">—</span></p>
      <p><b>Dirección:</b> <span id="cxDir">—</span></p>
      <p><b>Comuna:</b> <span id="cxComuna">—</span></p>
      <p><b>Precio:</b> <span id="cxPrecio">—</span></p>
      <p><b>Comisión:</b> <span id="cxPct">—</span></p>
    </div>
    <div class="card">
      <h2 class="section-title">Cálculo de Comisión</h2>
      <p class="small muted">Fórmula: <span class="mono">Precio × (Pct/100)</span></p>
      <table>
        <tr><th>Neto (CLP)</th>   <td id="outMontoNeto" class="mono">—</td></tr>
        <tr><th>IVA 19%</th>      <td id="outIVA"       class="mono">—</td></tr>
        <tr><th>Total</th>         <td id="outTotal"     class="mono">—</td></tr>
      </table>
    </div>
  </div>

  <div class="contrato" id="areaContrato">
    <div style="font-size:0.8em;">
      <img src="/assets/img/logo_santajosefina.png" alt="Logo Santa Josefina" style="width: 140px; position: relative; top: -50px;" class="logo-print">
      <div><div class="small muted logo-print" style="position:relative; top:-75px;">Administración de Edificios y Condominios</div></div><br>
      <div style="position:relative; top:-75px;">
        <h3 class="page-title" style="text-align:center;">Contrato de Corretaje</h3>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0 18px;">
        <p><b>Entre:</b> <b>Santa Josefina SpA</b>, RUT 77.233.573-3 (en adelante, el “Corredor”) y el/la <b>Cliente</b>, respecto de la propiedad ubicada en <span id="c_dir">[Dirección]</span>, comuna de <span id="c_comuna">[Comuna]</span> (la “Propiedad”), se celebra el presente <b>Contrato de Corretaje</b> conforme a las cláusulas siguientes:</p>

        <h3 class="section-title">Primera: Objeto</h3>
        <p>El Corredor realizará gestiones de intermediación para la venta o arriendo de la Propiedad descrita, procurando las mejores condiciones comerciales para el Cliente.</p>

        <h3 class="section-title">Segunda: Comisión</h3>
        <p>La comisión del Corredor asciende a <b><span id="c_pct">[Pct]</span>%</b> sobre el precio efectivo de la operación, equivalente a <b><span id="c_monto_neto" class="mono">[Neto]</span></b> más IVA (<span class="mono" id="c_monto_iva">[IVA]</span>), totalizando <b><span class="mono" id="c_monto_tot">[Total]</span></b>.</p>

        <h3 class="section-title">Tercera: Vigencia</h3>
        <p>Este contrato tendrá una duración de 90 días corridos, renovables automáticamente por períodos iguales salvo aviso en contrario con 15 días de anticipación.</p>

        <h3 class="section-title">Cuarta: Exclusividad</h3>
        <p>Salvo pacto en contrario, las partes acuerdan carácter no exclusivo. En caso de exclusividad, el Cliente se obliga a canalizar todas las ofertas a través del Corredor durante la vigencia.</p>

        <h3 class="section-title">Quinta: Pago</h3>
        <p>La comisión será exigible al momento de la firma de la escritura de compraventa o del contrato de arriendo, según corresponda.</p>

        <h3 class="section-title">Sexta: Domicilio</h3>
        <p>Para todos los efectos legales, las partes fijan su domicilio en Santiago.</p>

        <div class="firma-grid">
          <div class="firma-box">
            <div class="firma-line"></div>
            <div><b>Cliente</b></div>
          </div>
          <div class="firma-box">
            <div class="firma-line"></div>
            <div><b>Santa Josefina SpA</b></div>
            <div class="small muted">RUT 77.233.573-3</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<div id="pageSpinner" class="spinner-backdrop hidden" aria-hidden="true">
  <div class="spinner-card">
    <div class="spinner"></div>
    <div id="spinnerText">Cargando datos...</div>
  </div>
</div>

<script src="/assets/js/app.js"></script>
<script>
requireAuth();

let COPROS=[], TARIFAS=[]; // TARIFAS no se usa aquí, se deja por homogeneidad
let coproSel=null;

function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.classList.remove('hidden'); }
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }
function formatoCLP(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }

async function cargarDatos(){
  try{
    showSpinner("Cargando tablas...");
    [COPROS] = await Promise.all([
      fetchData("Copropiedades")
    ]);
    const sel = document.getElementById("selCopro");
    sel.innerHTML = COPROS.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
    sel.onchange = onSelectCopro;
    if(COPROS.length){ sel.value = getKeyVal(COPROS[0]); await onSelectCopro(); }
    document.getElementById("inpPrecio").addEventListener("input", calcular);
    document.getElementById("selPct").addEventListener("change", calcular);
  }catch(err){ alert("Error al cargar datos: "+(err.message||err)); console.error(err); }
  finally{ hideSpinner(); }
}

document.addEventListener("DOMContentLoaded", cargarDatos);

async function onSelectCopro(){
  const id = document.getElementById("selCopro").value;
  coproSel = COPROS.find(c=> String(getKeyVal(c))===String(id));
  if(!coproSel) return;
  document.getElementById("cxCopro").textContent = coproSel.Nombre||"—";
  document.getElementById("cxDir").textContent   = (coproSel.Direccion||"—");
  document.getElementById("cxComuna").textContent= (coproSel.Comuna||"—");
  document.getElementById("inpDir").value = (coproSel.Direccion||"");
  document.getElementById("inpComuna").value = (coproSel.Comuna||"");
  document.getElementById("c_dir").textContent = (coproSel.Direccion||"[Dirección]");
  document.getElementById("c_comuna").textContent = (coproSel.Comuna||"[Comuna]");
  calcular();
}

function parseCLP(raw){ return parseFloat((raw||"").toString().replaceAll(".","").replace(",","."))||0; }

function calcular(){
  const precio = parseCLP(document.getElementById("inpPrecio").value);
  const pct = parseFloat(document.getElementById("selPct").value||"0");

  document.getElementById("cxPrecio").textContent = precio? formatoCLP(precio): "—";
  document.getElementById("cxPct").textContent = pct? (pct.toString().replace(".",",")+"%") : "—";
  document.getElementById("c_pct").textContent = pct? (pct.toString().replace(".",","")) : "[Pct]";

  let neto = Math.round(precio * (pct/100));
  let iva  = Math.round(neto * 0.19);
  let total= Math.round(neto + iva);

  document.getElementById("outMontoNeto").textContent = formatoCLP(neto);
  document.getElementById("outIVA").textContent       = formatoCLP(iva);
  document.getElementById("outTotal").textContent     = formatoCLP(total);

  document.getElementById("c_monto_neto").textContent = formatoCLP(neto);
  document.getElementById("c_monto_iva").textContent  = formatoCLP(iva);
  document.getElementById("c_monto_tot").textContent  = formatoCLP(total);
}

function imprimir(){ window.print(); }
</script>
<?php get_footer(); ?>


<?php
/* 
Template Name: Contrato – Administración de Arriendo
*/
if ( ! defined( 'ABSPATH' ) ) { exit; }
get_header();
?>
<style>
  body { color:#1A2B48; }
  .container { max-width:1200px; margin:0 auto; padding: 40px; }
  h1.page-title{ font-size:28px; font-weight:700; margin-bottom:16px; }
  h2.section-title{ font-size:18px; font-weight:700; margin:18px 0 8px; }
  .muted{ color:#555; }
  .grid { display:grid; gap:10px; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:18px; }
  .row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; }
  .row > * { flex: 1 1 220px; }
  .label { font-weight:600; display:block; margin-bottom:4px; }
  input, select { font-weight:400; width:90%; padding:10px; border:1px solid #d1d5db; border-radius:6px; }
  .btns { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#f4f4f5; font-size:12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace; }

  table { width:100%; border-collapse:collapse; }
  th, td { padding:8px; border-bottom:1px solid #e5e7eb; text-align:left; }
  th { background:#fafafa; }

  .contrato { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:8px; }
  .contrato p { line-height:1.6; margin: 10px 0; text-align:justify; }
  .firma-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:36px; }
  .firma-box { text-align:center; padding-top:36px; }
  .firma-line { border-top:1px solid #111; margin-top:40px; padding-top:6px; }
  .small { font-size:12px; }

  .spinner-backdrop{ position:fixed; inset:0; background:rgba(255,255,255,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; }
  .spinner-card{ background:#fff; padding:18px 22px; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.08); text-align:center; min-width:260px; color:#1A2B48; font-weight:600; }
  .spinner{ width:28px; height:28px; border-radius:50%; border:3px solid #eee; border-top-color:#B46A55; margin:0 auto 10px auto; animation:spin 0.9s linear infinite; }
  @keyframes spin{ to{ transform:rotate(360deg); } }
  .hidden{ display:none !important; }

  @page { size: Letter; margin: 20mm; }
  @media print { header, footer, .no-print, #wpadminbar { display:none !important; } body { max-width: 100%; } .contrato { border:none; } .logo-print {visibility: visible;} }
  .logo-print { visibility: hidden; }
</style>

<main class="container">
  <h2 class="page-title no-print">Contrato de Administración de Arriendo</h2>

  <div class="card no-print">
    <div class="row">
      <div>
        <label class="label">Propiedad / Copropiedad</label>
        <select id="selCopro2"></select>
      </div>
      <div>
        <label class="label">Comuna</label>
        <input id="inpComuna2" readonly>
      </div>
      <div>
        <label class="label">Dirección</label>
        <input id="inpDir2" readonly>
      </div>
      <div>
        <label class="label">Canon de Arriendo Mensual (CLP)</label>
        <input id="inpCanon" class="mono" placeholder="Ej: 600.000" inputmode="decimal">
      </div>
      <div>
        <label class="label">Comisión % (7–12)</label>
        <select id="selPct2">
          <option>7</option><option>8</option><option>9</option><option>10</option><option>11</option><option selected>12</option>
        </select>
      </div>
    </div>
    <div class="btns">
      <button onclick="window.location.reload()">🔄 Actualizar</button>
      <button onclick="imprimir()">🖨 Imprimir Contrato</button>
    </div>
  </div>

  <div class="grid no-print">
    <div class="card">
      <h2 class="section-title">Resumen</h2>
      <p><b>Propiedad:</b> <span id="cxCopro2">—</span></p>
      <p><b>Dirección:</b> <span id="cxDir2">—</span></p>
      <p><b>Comuna:</b> <span id="cxComuna2">—</span></p>
      <p><b>Canon:</b> <span id="cxCanon">—</span></p>
      <p><b>Comisión:</b> <span id="cxPct2">—</span></p>
    </div>
    <div class="card">
      <h2 class="section-title">Cálculo de Honorarios (Mensual)</h2>
      <p class="small muted">Fórmula: <span class="mono">Canon × (Pct/100)</span></p>
      <table>
        <tr><th>Neto (CLP)</th>   <td id="outMontoNeto2" class="mono">—</td></tr>
        <tr><th>IVA 19%</th>      <td id="outIVA2"       class="mono">—</td></tr>
        <tr><th>Total</th>         <td id="outTotal2"     class="mono">—</td></tr>
      </table>
    </div>
  </div>

  <div class="contrato" id="areaContrato2">
    <div style="font-size:0.8em;">
      <img src="/assets/img/logo_santajosefina.png" alt="Logo Santa Josefina" style="width: 140px; position: relative; top: -50px;" class="logo-print">
      <div><div class="small muted logo-print" style="position:relative; top:-75px;">Administración de Edificios y Condominios</div></div><br>
      <div style="position:relative; top:-75px;">
        <h3 class="page-title" style="text-align:center;">Contrato de Administración de Arriendo</h3>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0 18px;">
        <p><b>Entre:</b> el/la <b>Propietario/a</b> de la propiedad ubicada en <span id="c2_dir">[Dirección]</span>, comuna de <span id="c2_comuna">[Comuna]</span> (en adelante, el “Propietario”) y <b>Santa Josefina SpA</b>, RUT 77.233.573-3 (en adelante, el “Administrador”), se celebra el presente <b>Contrato de Administración de Arriendo</b>.</p>

        <h3 class="section-title">Primera: Objeto</h3>
        <p>El Administrador gestionará el arriendo, cobranza, mantención menor y administración general de la propiedad, rindiendo cuentas mensuales al Propietario.</p>

        <h3 class="section-title">Segunda: Honorarios</h3>
        <p>El Propietario pagará al Administrador una comisión mensual del <b><span id="c2_pct">[Pct]</span>%</b> sobre el canon de arriendo vigente, equivalente a <b><span id="c2_monto_neto" class="mono">[Neto]</span></b> más IVA (<span class="mono" id="c2_monto_iva">[IVA]</span>), total <b><span class="mono" id="c2_monto_tot">[Total]</span></b>.</p>

        <h3 class="section-title">Tercera: Plazo</h3>
        <p>La vigencia será de 12 meses, renovable automáticamente, pudiendo cualquiera de las partes poner término con aviso escrito de 30 días.</p>

        <h3 class="section-title">Cuarta: Obligaciones</h3>
        <p>El Administrador actuará con diligencia en la búsqueda de arrendatarios, suscripción de contratos, cobranza, pago de servicios con cargo al Propietario y coordinación de mantenciones.</p>

        <h3 class="section-title">Quinta: Rendición y Transferencias</h3>
        <p>El Administrador rendirá mensualmente, informando ingresos por arriendo, descuentos por gastos autorizados y transferirá el saldo al Propietario dentro de 5 días hábiles desde recepción del canon.</p>

        <h3 class="section-title">Sexta: Domicilio</h3>
        <p>Para todos los efectos legales, las partes fijan su domicilio en Santiago.</p>

        <div class="firma-grid">
          <div class="firma-box">
            <div class="firma-line"></div>
            <div><b>Propietario/a</b></div>
          </div>
          <div class="firma-box">
            <div class="firma-line"></div>
            <div><b>Santa Josefina SpA</b></div>
            <div class="small muted">RUT 77.233.573-3</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<div id="pageSpinner" class="spinner-backdrop hidden" aria-hidden="true">
  <div class="spinner-card">
    <div class="spinner"></div>
    <div id="spinnerText">Cargando datos...</div>
  </div>
</div>

<script src="/assets/js/app.js"></script>
<script>
requireAuth();

let COPROS2=[];
let coproSel2=null;

function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.classList.remove('hidden'); }
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }
function formatoCLP(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }

async function cargarDatos2(){
  try{
    showSpinner("Cargando tablas...");
    [COPROS2] = await Promise.all([
      fetchData("Copropiedades")
    ]);
    const sel = document.getElementById("selCopro2");
    sel.innerHTML = COPROS2.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
    sel.onchange = onSelectCopro2;
    if(COPROS2.length){ sel.value = getKeyVal(COPROS2[0]); await onSelectCopro2(); }
    document.getElementById("inpCanon").addEventListener("input", calcular2);
    document.getElementById("selPct2").addEventListener("change", calcular2);
  }catch(err){ alert("Error al cargar datos: "+(err.message||err)); console.error(err); }
  finally{ hideSpinner(); }
}

document.addEventListener("DOMContentLoaded", cargarDatos2);

async function onSelectCopro2(){
  const id = document.getElementById("selCopro2").value;
  coproSel2 = COPROS2.find(c=> String(getKeyVal(c))===String(id));
  if(!coproSel2) return;
  document.getElementById("cxCopro2").textContent = coproSel2.Nombre||"—";
  document.getElementById("cxDir2").textContent   = (coproSel2.Direccion||"—");
  document.getElementById("cxComuna2").textContent= (coproSel2.Comuna||"—");
  document.getElementById("inpDir2").value = (coproSel2.Direccion||"");
  document.getElementById("inpComuna2").value = (coproSel2.Comuna||"");
  document.getElementById("c2_dir").textContent = (coproSel2.Direccion||"[Dirección]");
  document.getElementById("c2_comuna").textContent = (coproSel2.Comuna||"[Comuna]");
  calcular2();
}

function parseCLP(raw){ return parseFloat((raw||"").toString().replaceAll(".","").replace(",","."))||0; }

function calcular2(){
  const canon = parseCLP(document.getElementById("inpCanon").value);
  const pct = parseFloat(document.getElementById("selPct2").value||"0");

  document.getElementById("cxCanon").textContent = canon? formatoCLP(canon): "—";
  document.getElementById("cxPct2").textContent = pct? (pct.toString().replace(".",",")+"%") : "—";
  document.getElementById("c2_pct").textContent = pct? (pct.toString().replace(".",","")) : "[Pct]";

  let neto = Math.round(canon * (pct/100));
  let iva  = Math.round(neto * 0.19);
  let total= Math.round(neto + iva);

  document.getElementById("outMontoNeto2").textContent = formatoCLP(neto);
  document.getElementById("outIVA2").textContent       = formatoCLP(iva);
  document.getElementById("outTotal2").textContent     = formatoCLP(total);

  document.getElementById("c2_monto_neto").textContent = formatoCLP(neto);
  document.getElementById("c2_monto_iva").textContent  = formatoCLP(iva);
  document.getElementById("c2_monto_tot").textContent  = formatoCLP(total);
}

function imprimir(){ window.print(); }
</script>
<?php get_footer(); ?>

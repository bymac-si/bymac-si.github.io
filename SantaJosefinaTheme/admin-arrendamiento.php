<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Administración de Arriendo</title>
  <link rel="stylesheet" href="/assets/css/styles.css">
  <script src="/assets/js/app.js"></script>
  <script>requireAuth();</script>
  <style>
    body { max-width:1200px; margin:0 auto; color:#1A2B48; }
    .container { padding:40px; }
    h1.page-title, h2.page-title { font-size:28px; font-weight:700; margin-bottom:16px; }
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
    .contrato p { line-height:1.6; margin:10px 0; text-align:justify; }
    .firma-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:36px; }
    .firma-box { text-align:center; padding-top:36px; }
    .firma-line { border-top:1px solid #111; margin-top:40px; padding-top:6px; }
    .small { font-size:12px; }
    .logo-print { visibility:hidden; }

    /* Spinner */
    .spinner-backdrop{ position:fixed; inset:0; background:rgba(255,255,255,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; }
    .spinner-card{ background:#fff; padding:18px 22px; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.08); text-align:center; min-width:260px; color:#1A2B48; font-weight:600; }
    .spinner{ width:28px; height:28px; border-radius:50%; border:3px solid #eee; border-top-color:#B46A55; margin:0 auto 10px auto; animation:spin 0.9s linear infinite; }
    @keyframes spin{ to{ transform:rotate(360deg); } }
    .hidden{ display:none !important; }

    /* Print US Letter */
    @page { size: Letter; margin: 20mm; }
    @media print {
      #header, #footer, .no-print { display:none !important; }
      body { max-width:100%; }
      .contrato { border:none; }
      .logo-print { visibility:visible; }
    }
  </style>
</head>
<body>
<div id="header" class="no-print"></div>

<main class="container">
  <h2 class="page-title no-print">Contrato de Administración de Arriendo</h2>

  <!-- Controles -->
  <div class="card no-print">
    <div class="row">
      <div>
        <label class="label">Propietario (Cliente)</label>
        <select id="selCliente"></select>
      </div>
      <div>
        <label class="label">Propiedad</label>
        <select id="selPropiedad"></select>
      </div>
      <div>
        <label class="label">Canon de Arriendo (CLP)</label>
        <input id="inpCanon" class="mono" inputmode="decimal" placeholder="Ej: 650.000">
      </div>
      <div>
        <label class="label">Comisión Administración</label>
        <select id="selComision">
          <option value="0.07">7 %</option>
          <option value="0.08">8 %</option>
          <option value="0.09">9 %</option>
          <option value="0.10" selected>10 %</option>
          <option value="0.11">11 %</option>
          <option value="0.12">12 %</option>
        </select>
      </div>
    </div>
    <div class="btns">
      <button class="btn-outline" onclick="window.location.reload()">🔄 Actualizar</button>
      <button class="btn-primary" onclick="window.print()">🖨 Imprimir Contrato</button>
    </div>
  </div>

  <!-- Resumen -->
  <div class="grid no-print">
    <div class="card">
      <h2 class="section-title">Resumen</h2>
      <p><b>Propietario:</b> <span id="cxCliente">—</span> <span class="small muted">| <span id="cxEmail"></span> | <span id="cxFono"></span></span></p>
      <p><b>Propiedad:</b> <span id="cxTitulo">—</span></p>
      <p><b>Dirección:</b> <span id="cxDireccion">—</span>, <span id="cxComuna">—</span>, <span id="cxRegion">—</span></p>
      <p><b>Canon Mensual:</b> <span id="cxCanon">—</span></p>
      <p><b>Comisión:</b> <span id="cxComision">—</span></p>
    </div>
    <div class="card">
      <h2 class="section-title">Cálculo Mensual</h2>
      <table>
        <tr><th>Neto (CLP)</th>   <td id="outNeto"   class="mono">—</td></tr>
        <tr><th>IVA 19%</th>      <td id="outIVA"    class="mono">—</td></tr>
        <tr><th>Total a pagar</th><td id="outTotal"  class="mono">—</td></tr>
      </table>
    </div>
  </div>

  <!-- Contrato -->
  <div class="contrato" id="areaContrato">
    <div style="font-size:0.8em;">
      <img src="/assets/img/logo_santajosefina.png" alt="Logo Santa Josefina" style="width:140px; position:relative; top:-50px;" class="logo-print">
      <div class="small muted logo-print" style="position:relative; top:-75px;">Administración de Arriendo</div>
    </div>

    <h3 class="page-title" style="text-align:center;">Contrato de Administración de Arriendo</h3>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0 18px;">

    <p>En Santiago de Chile, a la fecha, comparecen: <b><span id="c_nombre">[Nombre Propietario]</span></b>, RUT <span id="c_rut">[RUT]</span>, correo <span id="c_mail">[Email]</span> y teléfono <span id="c_fono">[Teléfono]</span>, en adelante, el “Propietario”; y <b>Santa Josefina SpA</b>, RUT 77.233.573-3, en adelante, el “Administrador”, quienes celebran el siguiente <b>Contrato de Administración de Arriendo</b>:</p>

    <h3 class="section-title">Primera: Objeto</h3>
    <p>El Propietario encomienda al Administrador la administración del arrendamiento del inmueble ubicado en <b><span id="c_dir">[Dirección]</span></b>, comuna de <b><span id="c_comuna">[Comuna]</span></b>, región de <b><span id="c_region">[Región]</span></b>, individualizado como <b><span id="c_titulo">[Título]</span></b>.</p>

    <h3 class="section-title">Segunda: Honorarios</h3>
    <p>El Propietario pagará mensualmente al Administrador el <b><span id="c_pct">[Porcentaje]</span></b> del canon de arriendo vigente al mes de prestación del servicio. Montos afectos a IVA.</p>
    <table style="margin:10px 0 6px; font-size:0.9em;">
      <tr><th style="width:180px;">Neto (CLP)</th>       <td id="c_neto"  class="mono" style="text-align:right;">—</td></tr>
      <tr><th>IVA 19%</th>                               <td id="c_iva"   class="mono" style="text-align:right;">—</td></tr>
      <tr><th>Total a pagar</th>                         <td id="c_total" class="mono" style="text-align:right;">—</td></tr>
    </table>

    <h3 class="section-title">Tercera: Obligaciones</h3>
    <p>El Administrador realizará la gestión de cobranza, pago de cuentas (si procede), atención de incidencias, coordinación de mantenciones y rendición mensual al Propietario.</p>

    <h3 class="section-title">Cuarta: Vigencia</h3>
    <p>Este contrato tendrá duración de 12 meses, renovable automáticamente salvo aviso con 30 días de anticipación.</p>

    <h3 class="section-title">Quinta: Domicilio</h3>
    <p>Para todos los efectos legales, las partes fijan su domicilio en la ciudad de Santiago.</p>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-line"></div>
        <div><b>Propietario</b></div>
        <div class="small muted" id="c_nombre_firma">[Nombre Propietario]</div>
      </div>
      <div class="firma-box">
        <div class="firma-line"></div>
        <div><b>Santa Josefina SpA</b></div>
        <div class="small muted">RUT 77.233.573-3</div>
      </div>
    </div>
  </div>
</main>

<!-- SPINNER -->
<div id="pageSpinner" class="spinner-backdrop hidden" aria-hidden="true">
  <div class="spinner-card"><div class="spinner"></div><div id="spinnerText">Cargando datos...</div></div>
</div>

<div id="footer" class="no-print"></div>

<script>
function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.classList.remove('hidden'); }
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }
function formatoCLP(v){ return "$"+new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }
function deNum(str){ return parseFloat((str||"").toString().replaceAll(".","").replace(",", "."))||0; }

let CLIENTES=[], PROPS=[], clienteSel=null, propSel=null;

document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();
  await cargarDatos();
});

async function cargarDatos(){
  try{
    showSpinner("Cargando tablas...");
    [CLIENTES, PROPS] = await Promise.all([ fetchData("Clientes"), fetchData("Propiedades") ]);
    selCliente.innerHTML   = CLIENTES.map(c=>`<option value="${c.ID}">${c.Nombre}</option>`).join("");
    selPropiedad.innerHTML = PROPS.map(p=>`<option value="${p.ID}">${p.Titulo||p.Direccion||("Propiedad "+p.ID)}</option>`).join("");

    selCliente.onchange   = onSelectCliente;
    selPropiedad.onchange = onSelectPropiedad;
    inpCanon.oninput      = recalcular;
    selComision.onchange  = recalcular;

    if(CLIENTES.length){ selCliente.value = CLIENTES[0].ID; onSelectCliente(); }
    if(PROPS.length){ selPropiedad.value = PROPS[0].ID; onSelectPropiedad(); }
  }catch(e){ alert("Error al cargar datos: "+(e.message||e)); }
  finally{ hideSpinner(); }
}

function onSelectCliente(){
  const id = selCliente.value;
  clienteSel = CLIENTES.find(x=>String(x.ID)===String(id));
  cxCliente.textContent = clienteSel?.Nombre||"—";
  cxEmail.textContent   = clienteSel?.Email||"";
  cxFono.textContent    = clienteSel?.Telefono||clienteSel?.["Teléfono"]||"";
  c_nombre.textContent  = clienteSel?.Nombre||"[Nombre Propietario]";
  c_rut.textContent     = clienteSel?.RUT||"[RUT]";
  c_mail.textContent    = clienteSel?.Email||"[Email]";
  c_fono.textContent    = clienteSel?.Telefono||clienteSel?.["Teléfono"]||"[Teléfono]";
  c_nombre_firma.textContent = clienteSel?.Nombre||"[Nombre Propietario]";
}

function onSelectPropiedad(){
  const id = selPropiedad.value;
  propSel = PROPS.find(x=>String(x.ID)===String(id));
  cxTitulo.textContent    = propSel?.Titulo||propSel?.Direccion||"—";
  cxDireccion.textContent = propSel?.Direccion||"—";
  cxComuna.textContent    = propSel?.Comuna||"—";
  cxRegion.textContent    = propSel?.Region||"—";
  c_titulo.textContent    = propSel?.Titulo||propSel?.Direccion||"[Título]";
  c_dir.textContent       = propSel?.Direccion||"[Dirección]";
  c_comuna.textContent    = propSel?.Comuna||"[Comuna]";
  c_region.textContent    = propSel?.Region||"[Región]";
  // Canon editable (si tienes campo Canon en BBDD, puedes precargarlo aquí)
  recalcular();
}

function recalcular(){
  const canon = deNum(inpCanon.value);
  cxCanon.textContent = canon? formatoCLP(canon):"—";

  const pct   = parseFloat(selComision.value||"0.10");
  const pctTx = (pct*100).toFixed(0)+" %";
  cxComision.textContent = pctTx;
  c_pct.textContent      = pctTx;

  const neto  = Math.round(canon * pct);
  const iva   = Math.round(neto * 0.19);
  const total = neto + iva;

  outNeto.textContent  = formatoCLP(neto);
  outIVA.textContent   = formatoCLP(iva);
  outTotal.textContent = formatoCLP(total);
  c_neto.textContent   = formatoCLP(neto);
  c_iva.textContent    = formatoCLP(iva);
  c_total.textContent  = formatoCLP(total);
}
</script>
</body>
</html>
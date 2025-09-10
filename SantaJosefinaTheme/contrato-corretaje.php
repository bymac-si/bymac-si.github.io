<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Corretaje de Propiedades</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
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
  <h2 class="page-title no-print">Contrato de Corretaje de Propiedades</h2>

  <!-- Controles -->
  <div class="card no-print">
    <div class="row">
      <div>
        <label class="label">Cliente</label>
        <select id="selCliente"></select>
      </div>
      <div>
        <label class="label">Propiedad</label>
        <select id="selPropiedad"></select>
      </div>
      <div>
        <label class="label">Precio de Venta (CLP)</label>
        <input id="inpPrecio" class="mono" inputmode="decimal" placeholder="Ej: 120.000.000">
      </div>
      <div>
        <label class="label">Comisión</label>
        <select id="selComision">
          <option value="0.01">1,0 %</option>
          <option value="0.015" selected>1,5 %</option>
          <option value="0.02">2,0 %</option>
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
      <p><b>Cliente:</b> <span id="cxCliente">—</span> <span class="small muted">| <span id="cxEmail"></span> | <span id="cxFono"></span></span></p>
      <p><b>Propiedad:</b> <span id="cxTitulo">—</span></p>
      <p><b>Dirección:</b> <span id="cxDireccion">—</span>, <span id="cxComuna">—</span>, <span id="cxRegion">—</span></p>
      <p><b>Precio Base:</b> <span id="cxPrecio">—</span></p>
      <p><b>Comisión:</b> <span id="cxComision">—</span></p>
    </div>
    <div class="card">
      <h2 class="section-title">Cálculo de Honorarios</h2>
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
      <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/logo_santajosefina.png" alt="Logo Santa Josefina" style="width:140px; position:relative; top:-50px;" class="logo-print">
      <div class="small muted logo-print" style="position:relative; top:-75px;">Corretaje de Propiedades</div>
    </div>

    <h3 class="page-title" style="text-align:center;">Contrato de Corretaje de Propiedades</h3>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0 18px;">

    <p>En Santiago de Chile, a la fecha, comparecen: <b><span id="c_nombre">[Nombre Cliente]</span></b>, RUT <span id="c_rut">[RUT]</span>, correo <span id="c_mail">[Email]</span> y teléfono <span id="c_fono">[Teléfono]</span>, en adelante, el “Cliente”; y <b>Santa Josefina SpA</b>, RUT 77.233.573-3, en adelante, el “Corredor”, quienes celebran el siguiente <b>Contrato de Corretaje de Propiedades</b>:</p>

    <h3 class="section-title">Primera: Objeto</h3>
    <p>El Cliente encomienda al Corredor la intermediación para la <b>venta</b> del inmueble ubicado en <b><span id="c_dir">[Dirección]</span></b>, comuna de <b><span id="c_comuna">[Comuna]</span></b>, región de <b><span id="c_region">[Región]</span></b>, individualizado como <b><span id="c_titulo">[Título]</span></b>.</p>

    <h3 class="section-title">Segunda: Honorarios</h3>
    <p>El Cliente pagará al Corredor, a título de honorarios, el <b><span id="c_pct">[Porcentaje]</span></b> del precio de venta pactado. El pago se efectuará al momento de la firma de la escritura definitiva. Montos afectos a IVA.</p>
    <table style="margin:10px 0 6px; font-size:0.9em;">
      <tr><th style="width:180px;">Neto (CLP)</th>       <td id="c_neto"  class="mono" style="text-align:right;">—</td></tr>
      <tr><th>IVA 19%</th>                               <td id="c_iva"   class="mono" style="text-align:right;">—</td></tr>
      <tr><th>Total a pagar</th>                         <td id="c_total" class="mono" style="text-align:right;">—</td></tr>
    </table>

    <h3 class="section-title">Tercera: Vigencia</h3>
    <p>Este contrato rige por 120 días corridos, renovables automáticamente salvo aviso de término con 10 días de anticipación.</p>

    <h3 class="section-title">Cuarta: Domicilio</h3>
    <p>Para todos los efectos legales, las partes fijan su domicilio en la ciudad de Santiago.</p>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-line"></div>
        <div><b>Cliente</b></div>
        <div class="small muted" id="c_nombre_firma">[Nombre Cliente]</div>
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

    selCliente.onchange  = onSelectCliente;
    selPropiedad.onchange= onSelectPropiedad;
    inpPrecio.oninput    = recalcular;
    selComision.onchange = recalcular;

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
  c_nombre.textContent  = clienteSel?.Nombre||"[Nombre Cliente]";
  c_rut.textContent     = clienteSel?.RUT||"[RUT]";
  c_mail.textContent    = clienteSel?.Email||"[Email]";
  c_fono.textContent    = clienteSel?.Telefono||clienteSel?.["Teléfono"]||"[Teléfono]";
  c_nombre_firma.textContent = clienteSel?.Nombre||"[Nombre Cliente]";
}

function onSelectPropiedad(){
  const id = selPropiedad.value;
  propSel = PROPS.find(x=>String(x.ID)===String(id));
  const precio = Number(propSel?.Precio||0);
  inpPrecio.value       = precio? new Intl.NumberFormat("es-CL").format(precio):"";
  cxPrecio.textContent  = precio? formatoCLP(precio):"—";
  cxTitulo.textContent  = propSel?.Titulo||propSel?.Direccion||"—";
  cxDireccion.textContent = propSel?.Direccion||"—";
  cxComuna.textContent  = propSel?.Comuna||"—";
  cxRegion.textContent  = propSel?.Region||"—";
  c_titulo.textContent  = propSel?.Titulo||propSel?.Direccion||"[Título]";
  c_dir.textContent     = propSel?.Direccion||"[Dirección]";
  c_comuna.textContent  = propSel?.Comuna||"[Comuna]";
  c_region.textContent  = propSel?.Region||"[Región]";
  recalcular();
}

function recalcular(){
  const base = deNum(inpPrecio.value);
  const pct  = parseFloat(selComision.value||"0");
  const pctTxt = (pct*100).toFixed(1).replace(".0","")+" %";
  cxComision.textContent = pctTxt;
  c_pct.textContent      = pctTxt;

  const neto  = Math.round(base * pct);
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
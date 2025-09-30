<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Propuesta Comercial — Administración de Condominios</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
  <script>requireAuth();</script>
  <style>
    :root{
      --brand:#1A2B48;
      --accent:#2A6AA9;  /* azul títulos impresión */
      --muted:#555;
      --line:#e5e7eb;
    }
    html{scroll-behavior:smooth;}
    body{max-width:1200px;margin:0 auto;color:var(--brand);}
    .container{padding:40px;}
    .page-title{font-size:28px;font-weight:700;margin-bottom:16px;}
    .section-title{font-size:18px;font-weight:700;margin:18px 0 8px;}
    .muted{color:var(--muted);}
    .grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));}
    .card{background:#fff;border:1px solid var(--line);border-radius:8px;padding:18px;}
    .row{display:flex;gap:12px;flex-wrap:wrap;align-items:end;}
    .row>*{flex:1 1 240px;}
    .label{font-weight:600;display:block;margin-bottom:4px;}
    input,select,textarea{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;}
    .btns{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap;}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#f4f4f5;font-size:12px;}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,"Courier New",monospace;}
    table{width:100%;border-collapse:collapse;}
    th,td{padding:8px;border-bottom:1px solid var(--line);text-align:left;}
    th{background:#fafafa;}
    .is-invalid{border-color:#ef4444!important;background:#fff7f7;}
    .text-error{color:#b91c1c;font-size:12px;margin-top:6px;display:none;}

    /* Spinner */
    .spinner-backdrop{position:fixed;inset:0;background:rgba(255,255,255,.85);display:none;align-items:center;justify-content:center;z-index:9999;}
    .spinner-card{background:#fff;padding:18px 22px;border:1px solid var(--line);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.08);text-align:center;min-width:260px;color:var(--brand);font-weight:600;}
    .spinner{width:28px;height:28px;border-radius:50%;border:3px solid #eee;border-top-color:#B46A55;margin:0 auto 10px auto;animation:spin .9s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}
    .hidden{display:none!important;}

    /* PRINT */
    .print-only{display:none;}
    @page{ size:Letter; margin:20mm; }
    @media print{
      #header, #footer, .no-print{display:none!important;}
      body{max-width:100%;background:#fff;color:var(--brand);font-size:10pt;line-height:1.1;}
      .card{border:none;}
      thead{display:table-header-group;}
      tr, img{page-break-inside:avoid;}
      .print-only{display:block;text-align:justify;}
      .print-short .hide-on-short{display:none!important;}
      .salto{page-break-before:always;}

      /* Portada */
      .print-cover{page-break-after:always;}
      .print-cover .brand-logo{width:160px;margin-bottom:40px;}
      .print-cover h1{font-size:36px;margin:40px 0 8px;}
      .print-cover h2{font-size:22px;font-weight:400;color:#111;}
      .print-cover .foot{position:fixed;bottom:20mm;left:0;right:0;text-align:center;font-size:12px;}

      /* Títulos azules */
      .print-section h2.title{color:var(--accent);font-size:28px;margin:0 0 14px;}
      .print-section h3.stitle{color:var(--accent);font-size:18px;margin:18px 0 8px;}

      /* Tabla honorarios */
      .print-table{width:100%;border-collapse:collapse;margin-top:10px;}
      .print-table th{background:var(--accent);color:#fff;border:1px solid var(--accent);}
      .print-table td{border:1px solid var(--line);}

      /* Footer numeración */
      .print-footer{
        position:fixed;bottom:10mm;left:0;right:0;
        display:flex;justify-content:center;font-size:12px;color:#333;
      }
      .print-footer .pnum::after{
        content:"Propuesta Comercial | " attr(data-name) " | Página " counter(page) " de " counter(pages);
      }
    }
  </style>
</head>
<body>
<div id="header" class="no-print"></div>
<main class="container">
  <h1 class="page-title no-print">Propuesta Comercial — Comunidad <span id="printNombre">—</span></h1>

  <!-- CONTROLES -->
  <div class="card no-print">
    <div class="row">
      <div>
        <label class="label">Origen de datos</label>
        <select id="selOrigen" style="line-height: 1.5; height: 40px; font-size: 14px;">
          <option value="prospecto">Prospectos (recomendado)</option>
          <option value="copro">Copropiedades</option>
        </select>
      </div>
      <div>
        <label class="label">Comunidad / Condominio</label>
        <select id="selEntidad" style="line-height: 1.5; height: 40px; font-size: 14px;"></select>
      </div>
      <div>
        <label class="label">Comuna</label>
        <input id="inpComuna" readonly style="font-size: 14px; width: 90%;">
      </div>
      <div>
        <label class="label">Dirección</label>
        <input id="inpDireccion" readonly style="font-size: 14px; width: 90%;">
      </div>
      <div>
        <label class="label">RUT</label>
        <input id="inpRUT" readonly style="font-size: 14px; width: 90%;">
        <div id="rutMsg" class="text-error">RUT inválido</div>
      </div>
      <div>
        <label class="label">N° Unidades</label>
        <input id="inpUnidades" class="mono" readonly style="font-size: 14px; width: 90%;">
      </div>
      <div>
        <label class="label">Factor Comuna (TablaTarifas)</label>
        <input id="inpFactor" class="mono" readonly style="font-size: 14px; width: 90%;">
      </div>
      <div>
        <label class="label">UTM (CLP)</label>
        <input id="inpUTM" class="mono" placeholder="Ej: 67.000" inputmode="decimal" style="font-size: 14px; width: 90%;">
      </div>
    </div>
    <div class="btns">
      <button class="btn-primary" onclick="window.location.reload()">Actualizar</button>
      <button class="btn-primary" onclick="window.print()">Imprimir</button>
    </div>
  </div>

  <!-- RESUMEN (OCULTO EN IMPRESIÓN) -->
  <div class="grid">
    <div class="card no-print">
      <h2 class="section-title">Resumen del Prospecto</h2>
      <p><b>Comunidad:</b> <span id="cxNombre">—</span></p>
      <p><b>Dirección:</b> <span id="cxDir">—</span></p>
      <p><b>RUT:</b> <span id="cxRUT">—</span></p>
      <p><b>Comuna:</b> <span id="cxComuna">—</span> <span class="badge">Factor: <span id="cxFactor">—</span></span></p>
      <p><b>N° Unidades:</b> <span id="cxUnidades">—</span></p>
      <p><b>UTM:</b> <span id="cxUTM">—</span></p>
    </div>

    <!-- HONORARIOS (PANTALLA) -->
    <div id="secHonorarios" class="card no-print">
      <h2 class="section-title">Honorarios estimados</h2>
      <p class="muted">Fórmula Ley N°21.442 (según factor y N° de unidades)</p>
      <table>
        <thead>
          <tr>
            <th>Escenario</th>
            <th>Fórmula</th>
            <th style="text-align:right;">Neto</th>
            <th style="text-align:right;">IVA (19%)</th>
            <th style="text-align:right;">Total</th>
            <th style="text-align:right;">Prorrateo /unidad (con IVA)</th>
          </tr>
        </thead>
        <tbody id="tbodyHonorarios"></tbody>
      </table>
    </div>
  </div>

  <!-- PORTADA (IMPRESIÓN) -->
  <section class="print-only print-cover">
    <img class="brand-logo" src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/logo_santajosefina.png" alt="Santa Josefina SpA" style="position: absolute; top: -5mm; left: 10mm;">
    <span style="position: relative; top: 50mm;">
      <h1>Propuesta Comercial</h1>
      <h2 id="coverSub">Condominio —</h2>
    </span>
  </section>

  <!-- SECCIONES (IMPRESIÓN) -->
  <section class="print-only print-section">
    <h2 class="title">Nuestro Servicio</h2>

    <h3 class="stitle">¿Por qué nace la Administración de Edificios y Condominios?</h3>
    <p>Para mantener funcionando en forma óptima un condominio se requiere tiempo, gastos, contratación de personal, planificación y control de mantenciones periódicas para la maquinaria e infraestructura de la comunidad. Son funciones que pocas personas dentro del condominio están capacitadas y/o dispuestas a desarrollar. La <b>Ley N°21.442 de Copropiedad Inmobiliaria</b> establece que estas funciones pueden ser desempeñadas por un copropietario o por una persona natural o empresa especializada contratada por acuerdo de la Asamblea de Copropietarios.</p>

    <h3 class="stitle">¿Cuáles son las funciones de un Administrador de Edificios y Condominios?</h3>
    <p>El Administrador tendrá las funciones que se establezcan en el Reglamento de Copropiedad y las que expresamente le confiera la Asamblea de Copropietarios. Conforme a la <b>Ley N°21.442</b>, el Administrador se mantiene en sus funciones mientras cuente con la confianza de la Asamblea, pudiendo ser removido por acuerdo de ésta.</p>

    <h3 class="stitle">Nuestro Compromiso</h3>
    <ul>
      <li style="list-style-type: none;"><b>Transparencia:</b> ítems de cobro accesibles y detallados en informes mensuales.</li>
      <li style="list-style-type: none;"><b>Disponibilidad:</b> respuesta oportuna a las necesidades de la comunidad.</li>
      <li style="list-style-type: none;"><b>Cordialidad:</b> trato respetuoso y colaborativo.</li>
      <li style="list-style-type: none;"><b>Visitas periódicas:</b> supervisión semanal en distintos horarios.</li>
      <li style="list-style-type: none;"><b>Informes periódicos:</b> reportes de avance de gastos y presupuestos, además del informe mensual.</li>
    </ul>

    <h3 class="stitle">Su Unidad, su Palacio</h3>
    <p>Cuidamos los bienes comunes con la misma dedicación con que usted cuida su unidad (departamento, bodega y estacionamiento).</p>

    <h3 class="stitle">Gastos Comunes</h3>
    <p>Corresponden al funcionamiento normal del condominio. Cada comunidad presenta un nivel de gasto propio según sus características y consumo. Optimizamos costos sin comprometer la integridad de los bienes comunes.</p>

    <h3 class="stitle">Información Clara y Detallada</h3>
    <p>Cada copropietario puede acceder a la información relevante de su comunidad. Mensualmente recibirá un informe de gastos comunes y, cuando corresponda, alertas sobre variaciones proyectadas para la toma de decisiones.</p>

    <h3 class="stitle salto">Nuestros Beneficios</h3>
    <ul>
      <li style="list-style-type: none;">Experiencia aplicando la <b>Ley N°21.442 de Copropiedad Inmobiliaria</b>.</li>
      <li style="list-style-type: none;">Reportes e informes administrativos incluidos en nuestros honorarios.</li>
      <li style="list-style-type: none;">Gestión transparente y proyección presupuestaria (semestral, anual o bianual).</li>
      <li style="list-style-type: none;"><b>Marcos Castro Abarca</b>, Director de Santa Josefina SpA, fue socio fundador y Secretario General por cuatro períodos del Colegio Inmobiliario de Chile A.G.N.</li>
    </ul>
  </section>

  <!-- HONORARIOS (IMPRESIÓN) -->
  <section class="print-only print-section">
    <h2 class="title">Honorarios</h2>
    <table class="print-table" style="text-align:center;">
      <thead>
        <tr>
          <th style="text-align:center;">Unidades</th>
          <th style="text-align:center;">Precio Neto</th>
          <th style="text-align:center;">Precio IVA inc.</th>
          <th style="text-align:center;">Costo aproximado por Unidad (*)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td id="p_unidades" class="mono" style="text-align:center;">—</td>
          <td id="p_neto" class="mono" style="text-align:center;">—</td>
          <td id="p_total" class="mono" style="text-align:center;">—</td>
          <td id="p_unit" class="mono" style="text-align:center;">—</td>
        </tr>
      </tbody>
    </table>
    <p class="muted" style="font-size:12px;margin-top:6px;">(*) El costo aproximado por unidad se calcula con el <b>Total con IVA</b> y se ajusta al prorrateo de cada unidad.</p>
    <p class="muted" style="font-size:12px;margin-top:4px;">
      <b>Desglose por unidad:</b>
      Neto: <span id="p_unit_neto" class="mono">—</span> ·
      IVA: <span id="p_unit_iva" class="mono">—</span> ·
      Total: <span id="p_unit_total" class="mono">—</span>
    </p>
  </section>
</main>

<!-- FOOTER IMPRESIÓN -->

  <p class="print-only" style="text-align: left;">Atentamente,</p><br>
  <p class="print-only" style="font-weight: bold; text-align: center;">Marcos Castro Abarca</p>
  <p class="print-only" style="text-align: center;">Director de Santa Josefina SpA</p>

<!-- SPINNER -->
<div id="pageSpinner" class="spinner-backdrop no-print" aria-hidden="true">
  <div class="spinner-card">
    <div class="spinner"></div>
    <div id="spinnerText">Cargando datos...</div>
  </div>
</div>

<div id="footer" class="no-print"></div>

<script>
/* ===== Utilidades ===== */
function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.style.display='flex'; }
function hideSpinner(){ const sp=document.getElementById('pageSpinner'); sp.style.display='none'; }
function clp(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }
function norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim(); }
function printShort(){ document.body.classList.add('print-short'); window.print(); setTimeout(()=>document.body.classList.remove('print-short'), 800); }

/* RUT helpers */
function cleanRut(r){ return (r||'').toString().replace(/[^0-9kK]/g,'').toUpperCase(); }
function rutDv(num){ let M=0,S=1; for(; num; num=Math.floor(num/10)) S=(S+num%10*(9-M++%6))%11; return S ? String(S-1) : 'K'; }
function isRutValid(rut){ const s=cleanRut(rut); if(s.length<2) return false; const body=s.slice(0,-1), dv=s.slice(-1); const calc=rutDv(parseInt(body,10)||0); return String(calc)===String(dv); }
function formatRut(r){ const s=cleanRut(r); if(s.length<2) return r||''; const body=s.slice(0,-1), dv=s.slice(-1); const withDots=body.replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return withDots+'-'+dv; }

/* Lectura payload (sessionStorage + querystring) */
function readIncoming(){
  let data=null;
  try{ data = JSON.parse(sessionStorage.getItem('cotizacionProspecto')||'null'); }catch(e){}
  const qs = new URLSearchParams(location.search);
  const payload = {
    prospectoId: (data?.prospectoId) || qs.get('prospectoId') || null,
    nombre:      (data?.nombre)      || qs.get('nombre')      || '',
    comuna:      (data?.comuna)      || qs.get('comuna')      || '',
    unidades:    (data?.unidades)    || Number(qs.get('unidades')||0),
    direccion:   (data?.direccion)   || qs.get('direccion')   || '',
    rut:         (data?.rut)         || qs.get('rut')         || '',
    factor:      (data?.factor ?? (qs.get('factor')?Number(qs.get('factor')):null)),
    utm:         (data?.utm    ?? (qs.get('utm')?Number(qs.get('utm')):null)),
  };
  return payload;
}

/* Estado */
let TARIFAS=[], PROSPECTOS=[], COPROS=[];
let origen='prospecto', entidadSel=null, factor=0, nUnidades=0, utmCLP=0;

/* Cálculo honorarios — Ley 21.442 (corregida) */
function calcularNeto(unidades, factor, utm){
  if(!(factor>0 && utm>0)) return 0;
  const base = factor * 1.75 * utm;
  if(unidades<=20) return base;
  const extra = unidades - 20;
  return base + (extra * factor * 1.75 * utm * 0.013);
}

/* Resumen impresión (compatibilidad con llamados previos) */
function updatePrintResumen(neto, iva, total){
  const mN = document.getElementById("printMontoNeto");
  const mI = document.getElementById("printIVA");
  const mT = document.getElementById("printTotal");
  if(mN) mN.textContent = clp(neto||0);
  if(mI) mI.textContent = clp(iva||0);
  if(mT) mT.textContent = clp(total||0);
}
window.updatePrintResume = updatePrintResumen; // alias sin "n"

/* Fallbacks de fetch */
async function safeFetch(table){ try{ return await fetchData(table); }catch(e){ return []; } }

/* Boot con failsafe anti-spinning */
async function boot(){
  showSpinner('Cargando datos...');
  try{
    [TARIFAS, PROSPECTOS, COPROS] = await Promise.all([
      safeFetch('TablaTarifas'),
      safeFetch('ProspectosCopro'),
      safeFetch('Copropiedades')
    ]);

    const selOrigen = document.getElementById('selOrigen');
    const selEntidad= document.getElementById('selEntidad');
    selOrigen.onchange = () => { origen=selOrigen.value; renderEntidadOptions(); onEntidadChange(); };
    selEntidad.onchange = onEntidadChange;

    renderEntidadOptions();

    // Precarga desde session/query
    const it = readIncoming();
    if(it.prospectoId){
      const idx = [...selEntidad.options].findIndex(o => String(o.value)===String(it.prospectoId));
      if(idx>=0) selEntidad.selectedIndex = idx;
    }
    onEntidadChange(it);

    document.getElementById('inpUTM').addEventListener('input', ()=>{
      const raw=(inpUTM.value||'').toString().replaceAll('.','').replace(',','.');
      utmCLP=parseFloat(raw)||0;
      document.getElementById('cxUTM').textContent = utmCLP>0 ? clp(utmCLP) : '—';
      renderHonorarios();
    });
  }catch(err){
    console.error('boot error:', err);
    alert('Error al cargar datos: ' + (err.message||err));
  }finally{
    hideSpinner();
  }
}
setTimeout(()=>hideSpinner(), 8000); // failsafe
window.addEventListener('error', ()=>hideSpinner());
window.addEventListener('unhandledrejection', ()=>hideSpinner());

/* Cargar header/footer y arrancar */
document.addEventListener('DOMContentLoaded', async ()=>{
  try{ document.getElementById('header').innerHTML = await (await fetch('https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/header.html')).text(); }catch(e){}
  try{ document.getElementById('footer').innerHTML = await (await fetch('https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/footer.html')).text(); }catch(e){}
  boot();
});

/* Poblado de opciones */
function renderEntidadOptions(){
  const selEntidad= document.getElementById('selEntidad');
  let items = (origen==='prospecto' && PROSPECTOS.length) ? PROSPECTOS : COPROS;
  selEntidad.innerHTML = items.map(x=>`<option value="${getKeyVal(x)}">${x.Nombre||x.RazonSocial||'—'}</option>`).join('');
}

function markRutValidity(rutFmt, isValid){
  const inp = document.getElementById('inpRUT');
  const msg = document.getElementById('rutMsg');
  const cx  = document.getElementById('cxRUT');
  cx.textContent = rutFmt || '—';
  if(isValid){ inp.classList.remove('is-invalid'); msg.style.display='none'; }
  else{ inp.classList.add('is-invalid'); msg.style.display='block'; }
}

/* Cambio de entidad (con prefill opcional) */
function onEntidadChange(prefill){
  const selEntidad= document.getElementById('selEntidad');
  const id = selEntidad.value;
  const list = (origen==='prospecto' && PROSPECTOS.length) ? PROSPECTOS : COPROS;
  entidadSel = list.find(x => String(getKeyVal(x))===String(id)) || null;

  const nombre = prefill?.nombre ?? entidadSel?.Nombre ?? entidadSel?.RazonSocial ?? '—';
  const comuna = prefill?.comuna ?? entidadSel?.Comuna ?? '—';
  const dir    = prefill?.direccion ?? entidadSel?.Direccion ?? entidadSel?.Dirección ?? '—';
  const rutRaw = prefill?.rut ?? entidadSel?.RUT ?? '—';
  const rutFmt = (rutRaw && rutRaw!=='—') ? formatRut(rutRaw) : '—';
  const rutOK  = rutRaw && rutRaw!=='—' ? isRutValid(rutRaw) : true;
  nUnidades    = Number(prefill?.unidades ?? entidadSel?.Unidades ?? entidadSel?.NUnidades ?? entidadSel?.CantidadUnidades ?? 0);

  // Factor
  let f=null;
  if(prefill?.factor!=null) f = Number(prefill.factor);
  if(f==null){
    const t = TARIFAS.find(tt => norm(tt.Comuna)===norm(comuna));
    f = t ? Number(t.Factor||0) : 0;
  }
  factor = f;

  // UTM
  if(prefill?.utm!=null){
    utmCLP = Number(prefill.utm)||0;
    if(utmCLP>0) document.getElementById('inpUTM').value = utmCLP;
  }

  // Pinta campos
  document.getElementById('inpComuna').value = comuna;
  document.getElementById('inpDireccion').value = dir;
  document.getElementById('inpRUT').value = rutFmt;
  document.getElementById('inpUnidades').value = nUnidades || '';
  document.getElementById('inpFactor').value = factor || '';

  document.getElementById('cxNombre').textContent = nombre;
  document.getElementById('cxDir').textContent    = dir;
  document.getElementById('cxComuna').textContent = comuna;
  document.getElementById('cxFactor').textContent = factor || '—';
  document.getElementById('cxUnidades').textContent = nUnidades || '—';

  // Título / portada
  const printNameEl = document.getElementById('printNombre');
  if(printNameEl) printNameEl.textContent = nombre;
  const coverSub = document.getElementById('coverSub');
  if(coverSub) coverSub.textContent = nombre ? ('Condominio ' + nombre) : 'Condominio';

  markRutValidity(rutFmt, rutOK);
  renderHonorarios();
}

/* Render honorarios (pantalla + impresión) */
function renderHonorarios(){
  const tb = document.getElementById('tbodyHonorarios');

  // tomar/normalizar UTM
  const raw = (inpUTM.value||'').toString().replaceAll('.','').replace(',','.');
  if(raw) utmCLP = parseFloat(raw)||0;

  if(!(factor>0) || !(utmCLP>0) || !(nUnidades>=0)){
    tb.innerHTML = `<tr><td colspan="6" class="muted">Ingresa el valor de la UTM para ver los honorarios.</td></tr>`;
    document.getElementById('cxUTM').textContent = utmCLP>0 ? clp(utmCLP) : '—';
    updatePrintResumen(0,0,0);
    setPrintTable(0,0,0,nUnidades||0);
    return;
  }
  document.getElementById('cxUTM').textContent = clp(utmCLP);

  const escenarios = [
    { nombre:'Según datos del prospecto', unidades:nUnidades },
    { nombre:'Simulación 20 unidades', unidades:20 },
    { nombre:'Simulación 40 unidades', unidades:40 }
  ];

  tb.innerHTML = escenarios.map(sc=>{
    const neto = Math.round(calcularNeto(sc.unidades, factor, utmCLP));
    const iva  = Math.round(neto * 0.19);
    const tot  = neto + iva;
    const unit = sc.unidades>0 ? Math.round(tot / sc.unidades) : 0;
    const formula = sc.unidades<=20
      ? `Factor × 1,75 × UTM`
      : `Factor × 1,75 × UTM + (${sc.unidades} − 20) × Factor × 1,75 × UTM × 0,013`;
    return `<tr>
      <td>${sc.nombre}</td>
      <td class="mono">${formula}</td>
      <td class="mono" style="text-align:right;">${clp(neto)}</td>
      <td class="mono" style="text-align:right;">${clp(iva)}</td>
      <td class="mono" style="text-align:right;">${clp(tot)}</td>
      <td class="mono" style="text-align:right;">${clp(unit)}</td>
    </tr>`;
  }).join('');

  // primer escenario para impresión
  const neto0 = Math.round(calcularNeto(nUnidades, factor, utmCLP));
  const iva0  = Math.round(neto0 * 0.19);
  const tot0  = neto0 + iva0;
  updatePrintResumen(neto0, iva0, tot0);
  setPrintTable(neto0, iva0, tot0, nUnidades||0);
}

/* Tabla de impresión + desglose por unidad */
function setPrintTable(neto, iva, total, unidades){
  document.getElementById('p_unidades').textContent = unidades>0 ? unidades : '—';
  document.getElementById('p_neto').textContent = clp(neto);
  document.getElementById('p_total').textContent = clp(total);

  const unitTotal = (unidades>0) ? Math.round(total / unidades) : 0;
  const unitNeto  = (unidades>0) ? Math.round(neto  / unidades) : 0;
  const unitIva   = (unidades>0) ? Math.round(iva   / unidades) : 0;

  document.getElementById('p_unit').textContent = unitTotal>0 ? clp(unitTotal) : '—';
  document.getElementById('p_unit_neto').textContent = unitNeto>0 ? clp(unitNeto) : '—';
  document.getElementById('p_unit_iva').textContent  = unitIva>0 ? clp(unitIva) : '—';
  document.getElementById('p_unit_total').textContent = unitTotal>0 ? clp(unitTotal) : '—';
}
</script>
</body>
</html>
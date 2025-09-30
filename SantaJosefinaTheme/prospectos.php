<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Prospectos</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
  <script>requireAuth();</script>
  <style>
    body{ max-width:1200px; margin:0 auto; color:#1A2B48; }
    main{ padding:40px; }
    .page-title{ font-size:28px; font-weight:700; margin-bottom:16px; }
    table{ width:100%; border-collapse:collapse; }
    th,td{ padding:8px; border-bottom:1px solid #e5e7eb; text-align:left; }
    th{ background:#fafafa; }
    .row{ display:flex; gap:12px; flex-wrap:wrap; align-items:end; }
    .row>*{ flex:1 1 220px; }
    .label{ display:block; font-weight:600; margin-bottom:4px; }
    input,select{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px; }
    .btns{ display:flex; gap:6px; flex-wrap:wrap; }
    .modal{ display:none; position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:10000; align-items:center; justify-content:center; }
    .modal.active{ display:flex; }
    .modal-content{ width:100%; max-width:680px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:18px; box-shadow:0 12px 30px rgba(0,0,0,.18); }
    .spinner-backdrop{ position:fixed; inset:0; background:rgba(255,255,255,0.85); display:none; place-items:center; z-index:12000; }
    .spinner-card{ background:#fff; padding:18px 22px; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.08); text-align:center; min-width:260px; color:#1A2B48; font-weight:600; }
    .spinner{ width:28px; height:28px; border-radius:50%; border:3px solid #eee; border-top-color:#B46A55; margin:0 auto 10px; animation:spin .9s linear infinite; }
    @keyframes spin{ to{ transform:rotate(360deg); } }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace; }
    .muted{ color:#666; }
  </style>
</head>
<body>
<div id="header"></div>

<main>
  <h1 class="page-title">Gestión de Prospectos</h1>

  <div class="row" style="margin-bottom:12px;">
    <div>
      <label class="label">Buscar</label>
      <input id="inpBuscar" placeholder="Nombre, comuna, dirección, RUT o contacto" style="width: 90%; font-size: 14px;">
    </div>
    <div>
      <label class="label">Comuna</label>
      <select id="selComuna" style="width: 100%; height: 40px; font-size: 14px;"><option value="">(Todas)</option></select>
    </div>
    <div>
      <label class="label">UTM (CLP) para cotización</label>
      <input id="inpUTMPros" class="mono" placeholder="Ej: 67.000" inputmode="decimal" style="width: 90%; font-size: 14px;">
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn-primary" style="height: 60px;" id="btnNew">Nuevo Prospecto</button>
      <button class="btn-primary" style="height: 60px;" id="btnReload">Recargar</button>
      <button class="btn-primary" style="height: 60px;" id="btnExport">Exportar CSV</button>
      <button class="btn-primary" style="height: 60px;" onclick="window.print()">Imprimir</button>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>ID</th><th>Nombre</th><th>Comuna</th>
        <th style="text-align:right;">Unidades</th><th>Dirección</th>
        <th>RUT</th><th>Contacto</th><th class="no-print">Acciones</th>
      </tr>
    </thead>
    <tbody id="tablaProspectos"><tr><td colspan="8" class="muted">Cargando…</td></tr></tbody>
  </table>
</main>

<!-- Modal Alta/Edición -->
<div id="modalProspecto" class="modal" aria-hidden="true">
  <div class="modal-content">
    <h2 id="modalTitleProspecto">Nuevo Prospecto</h2>
    <form id="formProspecto">
      <input type="hidden" id="prospectoID">
      <label>Nombre</label><input id="prosNombre" required>
      <label>Comuna</label>
      <input id="prosComuna" list="dlComunas" placeholder="Ej: Santiago">
      <datalist id="dlComunas"></datalist>
      <div class="muted" style="font-size:12px;">Sugerencias basadas en <b>TablaTarifas</b>.</div>
      <label>Unidades</label><input id="prosUnidades" type="number" min="0">
      <label>Dirección</label><input id="prosDireccion">
      <label>RUT</label><input id="prosRUT" placeholder="12.345.678-9">
      <label>Contacto</label><input id="prosContacto" placeholder="Nombre / email / teléfono">
      <div style="text-align:right;margin-top:10px;">
        <button type="button" class="btn-primary" onclick="cerrarModalProspecto()">Cancelar</button>
        <button class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Detalle -->
<div id="modalDetalle" class="modal" aria-hidden="true">
  <div class="modal-content">
    <h2>Detalle Prospecto</h2>
    <div id="detalleContenido"></div>
    <div style="text-align:right;margin-top:10px;">
      <button class="btn-primary" type="button" onclick="cerrarModalDetalle()">Cerrar</button>
    </div>
  </div>
</div>

<!-- Spinner -->
<div id="pageSpinner" class="spinner-backdrop" aria-hidden="true">
  <div class="spinner-card">
    <div class="spinner"></div>
    <div id="spinnerText">Cargando…</div>
  </div>
</div>

<div id="footer" class="no-print"></div>

<script>
/* ===== Utilidades ===== */
function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.style.display='grid'; }
function hideSpinner(){ document.getElementById('pageSpinner').style.display='none'; }
function norm(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function parseCLPInput(s){ return parseFloat((s||'').toString().replaceAll('.','').replace(',','.'))||0; }
function escapeCSV(v){ if(v==null) return ''; const s=String(v).replaceAll('"','""'); return /[",\n]/.test(s) ? '"'+s+'"' : s; }
function clp(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }

/* Detectores/fallbacks para claves y helpers del backend */
if(typeof window.getKeyVal !== 'function'){
  window.getKeyVal = (o)=> o? (o._id ?? o.id ?? o.ID ?? o.Key ?? o.key ?? o.Id ?? o[Object.keys(o)[0]]):"";
}
if(typeof window.getKeyName !== 'function'){
  window.getKeyName = (row)=>{
    if(!row || typeof row!=='object') return 'ID';
    const cands=['ID','_id','Id','id','Key','key','RowKey','_RowNumber'];
    for(const c of cands){ if(c in row) return c; }
    return Object.keys(row)[0] || 'ID';
  };
}
/* Generador de clave cuando el backend la exige */
function generateKey(prefix='ID'){
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8).toUpperCase()}`;
}

/* ===== Estado ===== */
let PROS=[], VIEW=[], TARIFAS=[];
let KEY_NAME='ID';
let LAST_EDIT_ORIGINAL_KEY=null;

/* ===== Boot ===== */
document.addEventListener("DOMContentLoaded", async ()=>{
  try{ document.getElementById("header").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/header.html")).text(); }catch(e){}
  try{ document.getElementById("footer").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/footer.html")).text(); }catch(e){}

  bindUI();
  await cargarTodo();
});

/* ===== UI ===== */
function bindUI(){
  btnNew.addEventListener('click', ()=>abrirFormProspecto());
  btnReload.addEventListener('click', cargarTodo);
  btnExport.addEventListener('click', exportCSV);
  inpBuscar.addEventListener('input', aplicarFiltros);
  selComuna.addEventListener('change', aplicarFiltros);

  // cerrar modales
  const m1=modalProspecto, m2=modalDetalle;
  m1.addEventListener('click', e=>{ if(e.target===m1) cerrarModalProspecto(); });
  m2.addEventListener('click', e=>{ if(e.target===m2) cerrarModalDetalle(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ cerrarModalProspecto(); cerrarModalDetalle(); }});
}

/* ===== Datos ===== */
async function cargarTodo(){
  try{
    showSpinner('Cargando datos…');
    const [pros, tarifas] = await Promise.all([
      fetchData('ProspectosCopro'),
      fetchData('TablaTarifas').catch(()=>[])
    ]);

    PROS = pros || [];
    if(PROS.length) KEY_NAME = getKeyName(PROS[0]);
    TARIFAS = tarifas || [];

    // filtros de comuna
    const comunasPros=[...new Set(PROS.map(p=>p.Comuna).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    selComuna.innerHTML = '<option value="">(Todas)</option>' + comunasPros.map(c=>`<option value="${c}">${c}</option>`).join('');

    // datalist comunas (desde tarifas)
    const comunasTar=[...new Set(TARIFAS.map(t=>t.Comuna).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    dlComunas.innerHTML = comunasTar.map(c=>`<option value="${c}">`).join('');

    aplicarFiltros();
  }catch(err){
    console.error(err);
    alert('Error al cargar datos: '+(err.message||err));
  }finally{ hideSpinner(); }
}

/* ===== Filtros/render ===== */
function aplicarFiltros(){
  const q = norm(inpBuscar.value);
  const comuna = selComuna.value;

  VIEW = PROS.filter(p=>{
    if(comuna && p.Comuna!==comuna) return false;
    if(!q) return true;
    return [getKeyVal(p), p.Nombre, p.RazonSocial, p.Comuna, p.Unidades, p.NUnidades, p.CantidadUnidades, p.Direccion, p.Dirección, p.RUT, p.Contacto, p.Email, p.Telefono]
      .map(v=>norm(v))
      .some(s=>s.includes(q));
  });

  renderTabla();
}

function renderTabla(){
  if(!VIEW.length){
    tablaProspectos.innerHTML = '<tr><td colspan="8" class="muted">Sin resultados.</td></tr>';
    return;
  }
  tablaProspectos.innerHTML = VIEW.map(p=>{
    const key = getKeyVal(p);
    const nombre = p.Nombre || p.RazonSocial || "—";
    const comuna = p.Comuna || "—";
    const unidades = p.Unidades || p.NUnidades || p.CantidadUnidades || 0;
    const direccion = p.Direccion || p.Dirección || "—";
    const rut = p.RUT || "—";
    const contacto = p.Contacto || p.Email || p.Telefono || "—";
    return `
      <tr>
        <td class="mono">${key}</td>
        <td>${nombre}</td>
        <td>${comuna}</td>
        <td class="mono" style="text-align:right;">${unidades||0}</td>
        <td>${direccion}</td>
        <td class="mono">${rut}</td>
        <td>${contacto}</td>
        <td class="no-print" style="min-width:300px;">
          <div class="btns">
            <button class="btn-primary" onclick='abrirDetalle(${JSON.stringify(key)})'>Ver</button>
            <button class="btn-primary" onclick='abrirFormProspecto(${JSON.stringify(key)})'>Editar</button>
            <button class="btn-primary" onclick='eliminarProspecto(${JSON.stringify(key)})'>Eliminar</button>
            <button class="btn-primary" onclick='abrirCotizacion(${JSON.stringify(key)})'>Cotizar</button>
            <button class="btn-primary" onclick='agregarAClientes(${JSON.stringify(key)})'>Cliente</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ===== Acciones ===== */
function abrirDetalle(id){
  const p = PROS.find(x=>String(getKeyVal(x))===String(id));
  if(!p){ alert('No encontrado'); return; }
  detalleContenido.innerHTML = `
    <p><b>ID:</b> ${getKeyVal(p)||"—"}</p>
    <p><b>Nombre:</b> ${p.Nombre||p.RazonSocial||"—"}</p>
    <p><b>Comuna:</b> ${p.Comuna||"—"}</p>
    <p><b>Unidades:</b> ${p.Unidades||p.NUnidades||p.CantidadUnidades||0}</p>
    <p><b>Dirección:</b> ${p.Direccion||p.Dirección||"—"}</p>
    <p><b>RUT:</b> ${p.RUT||"—"}</p>
    <p><b>Contacto:</b> ${p.Contacto||p.Email||p.Telefono||"—"}</p>`;
  modalDetalle.classList.add('active');
}
function cerrarModalDetalle(){ modalDetalle.classList.remove('active'); }

function abrirFormProspecto(id){
  const title = document.getElementById('modalTitleProspecto');
  formProspecto.reset(); prospectoID.value = ""; LAST_EDIT_ORIGINAL_KEY=null;

  if(id){
    title.textContent = "Editar Prospecto";
    const p = PROS.find(x=>String(getKeyVal(x))===String(id));
    if(!p){ alert("No encontrado"); return; }
    LAST_EDIT_ORIGINAL_KEY = getKeyName(p);
    prospectoID.value = getKeyVal(p);
    prosNombre.value = p.Nombre || p.RazonSocial || "";
    prosComuna.value = p.Comuna || "";
    prosUnidades.value = p.Unidades || p.NUnidades || p.CantidadUnidades || 0;
    prosDireccion.value = p.Direccion || p.Dirección || "";
    prosRUT.value = p.RUT || "";
    prosContacto.value = p.Contacto || p.Email || p.Telefono || "";
  }else{
    title.textContent = "Nuevo Prospecto";
  }
  modalProspecto.classList.add('active');
}
function cerrarModalProspecto(){ modalProspecto.classList.remove('active'); }

/* Guardar (Add/Edit) */
formProspecto.onsubmit = async (e)=>{
  e.preventDefault();
  const idValue = prospectoID.value || null;

  const payload = {
    Nombre: (prosNombre.value||"").trim(),
    Comuna: (prosComuna.value||"").trim(),
    Unidades: Number(prosUnidades.value||0),
    Direccion: (prosDireccion.value||"").trim(),
    RUT: (prosRUT.value||"").trim(),
    Contacto: (prosContacto.value||"").trim(),
  };

  const keyField = (idValue ? (LAST_EDIT_ORIGINAL_KEY || KEY_NAME) : KEY_NAME);

  // EDIT -> enviar clave exacta
  if(idValue){
    payload[keyField] = idValue;
  }else{
    // ADD -> generar clave si el backend la exige
    payload[keyField] = generateKey(keyField.toUpperCase());
  }

  try{
    showSpinner(idValue ? 'Guardando…' : 'Creando…');

    if(typeof upsertData === 'function'){
      await upsertData('ProspectosCopro', payload);
    }else if(typeof appSheetCRUD === 'function'){
      if(idValue) await appSheetCRUD('ProspectosCopro','Edit',[payload]);
      else        await appSheetCRUD('ProspectosCopro','Add', [payload]);
    }else{
      alert('No hay método de escritura disponible (upsertData/appSheetCRUD).');
      return;
    }
    cerrarModalProspecto();
    await cargarTodo();
  }catch(err){
    console.error(err);
    alert('Error al guardar: '+(err.message||JSON.stringify(err)));
  }finally{
    hideSpinner();
  }
};

async function eliminarProspecto(id){
  if(!confirm('¿Eliminar este prospecto?')) return;
  try{
    showSpinner('Eliminando…');
    if(typeof deleteByKey === 'function'){
      await deleteByKey('ProspectosCopro', id);
    }else if(typeof appSheetCRUD === 'function'){
      await appSheetCRUD('ProspectosCopro','Delete',[{[KEY_NAME]:id}]);
    }else{
      alert('No hay método de borrado disponible (deleteByKey/appSheetCRUD).'); return;
    }
    await cargarTodo();
  }catch(err){
    console.error(err);
    alert('Error al eliminar: '+(err.message||err));
  }finally{ hideSpinner(); }
}

/* Cotización y Clientes */
function getFactorByComuna(cname){
  const c = (cname||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const t = TARIFAS.find(tt => (tt.Comuna||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim() === c);
  return t ? Number(t.Factor||0) : null;
}

function abrirCotizacion(id){
  const row = PROS.find(x=>String(getKeyVal(x))===String(id));
  if(!row){ alert('No se encontró el prospecto.'); return; }
  const factor = getFactorByComuna(row.Comuna);
  const utm = parseCLPInput(inpUTMPros.value);

  const params = new URLSearchParams({
    prospectoId: getKeyVal(row),
    nombre: row.Nombre || row.RazonSocial || '',
    comuna: row.Comuna || '',
    unidades: String(row.Unidades || row.NUnidades || row.CantidadUnidades || 0),
    direccion: row.Direccion || row.Dirección || '',
    rut: row.RUT || ''
  });
  if(factor!=null) params.set('factor', String(factor));
  if(utm>0) params.set('utm', String(Math.round(utm)));

  window.location.href = `https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/cotizacion-admin-condominio.php?${params.toString()}`;
}

async function agregarAClientes(id){
  try{
    const row = PROS.find(x=>String(getKeyVal(x))===String(id));
    if(!row){ alert('No se encontró el prospecto.'); return; }
    const payload = {
      Nombre: row.Nombre || row.RazonSocial || '',
      Comuna: row.Comuna || '',
      Direccion: row.Direccion || row.Dirección || '',
      RUT: row.RUT || '',
      Unidades: row.Unidades || row.NUnidades || row.CantidadUnidades || 0,
      Contacto: row.Contacto || row.Email || row.Telefono || ''
    };
    showSpinner('Agregando a Clientes…');
    if(typeof upsertData === 'function')      await upsertData('Clientes', payload);
    else if(typeof appSheetCRUD === 'function') await appSheetCRUD('Clientes','Add',[payload]);
    else { alert('No hay método de escritura disponible para Clientes.'); return; }
    alert('Cliente agregado correctamente.');
  }catch(e){ console.error(e); alert('Error al agregar a Clientes: '+(e.message||e)); }
  finally{ hideSpinner(); }
}

/* Export CSV */
function exportCSV(){
  const headers = ['ID','Nombre','Comuna','Unidades','Direccion','RUT','Contacto'];
  const lines = [headers.join(',')];
  VIEW.forEach(r=>{
    lines.push([
      escapeCSV(getKeyVal(r)),
      escapeCSV(r.Nombre || r.RazonSocial || ''),
      escapeCSV(r.Comuna || ''),
      escapeCSV(r.Unidades || r.NUnidades || r.CantidadUnidades || 0),
      escapeCSV(r.Direccion || r.Dirección || ''),
      escapeCSV(r.RUT || ''),
      escapeCSV(r.Contacto || r.Email || r.Telefono || '')
    ].join(','));
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ProspectosCopro.csv'; a.click(); URL.revokeObjectURL(url);
}
</script>
</body>
</html>
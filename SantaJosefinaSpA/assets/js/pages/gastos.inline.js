// ===== Extracted from gastos.html =====

/* ===== Utilidades ===== */
function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.style.display='grid'; }
function hideSpinner(){ document.getElementById('pageSpinner').style.display='none'; }
function norm(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function escapeCSV(v){ if(v==null) return ''; const s=String(v).replaceAll('"','""'); return /[",\n]/.test(s) ? '"'+s+'"' : s; }
function clp(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }
function fmtFecha(iso){ 
  if(!iso) return ""; 
  // Intentar manejar formatos de fecha (YYYY-MM-DDT... o YYYY-MM-DD)
  const d = new Date(iso);
  // Ajuste zona horaria simple si es necesario, o uso directo UTC
  return d.toLocaleDateString("es-CL", { timeZone: 'UTC' }); 
}

/* Helpers Claves */
if(typeof window.getKeyVal !== 'function'){ window.getKeyVal = (o)=> o? (o._id ?? o.id ?? o.ID ?? o.Key ?? o.key ?? o.Id ?? o[Object.keys(o)[0]]):""; }
if(typeof window.getKeyName !== 'function'){ window.getKeyName = (row)=>{ if(!row || typeof row!=='object') return 'ID'; const cands=['ID','_id','Id','id','Key','key']; for(const c of cands){ if(c in row) return c; } return Object.keys(row)[0] || 'ID'; }; }
function generateKey(prefix='ID'){ return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8).toUpperCase()}`; }

/* ===== Estado ===== */
let GASTOS=[], COPROS=[], PROVS=[], VIEW=[];
let KEY_NAME="ID";

/* ===== Inicialización ===== */
document.addEventListener("DOMContentLoaded", async ()=>{
  try{ document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); }catch(e){}
  try{ document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); }catch(e){}
  
  bindUI();
  await cargarTodo();
});

function bindUI(){
  // Botones
  document.getElementById('btnNew').addEventListener('click', ()=>abrirForm());
  document.getElementById('btnReload').addEventListener('click', cargarTodo);
  document.getElementById('btnExport').addEventListener('click', exportCSV);
  
  // Filtros
  document.getElementById('inpBuscar').addEventListener('input', aplicarFiltros);
  document.getElementById('selCoproFilter').addEventListener('change', aplicarFiltros);
  
  // Modal
  modalG.addEventListener('click', e=>{ if(e.target===modalG) cerrarForm(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') cerrarForm(); });
}

/* ===== Carga de Datos ===== */
async function cargarTodo(){
  try{
    showSpinner('Cargando gastos...');
    const [g, c, p] = await Promise.all([
      fetchData("Gastos").catch(()=>[]),
      fetchData("Copropiedades").catch(()=>[]),
      fetchData("Proveedores").catch(()=>[])
    ]);

    GASTOS = g || [];
    COPROS = c || [];
    PROVS  = p || [];

    if(GASTOS.length) KEY_NAME = getKeyName(GASTOS[0]);

    // Llenar Selects Copropiedades
    const coprosHTML = COPROS.map(x=>`<option value="${getKeyVal(x)}">${x.Nombre}</option>`).join("");
    document.getElementById('selCoproFilter').innerHTML = '<option value="">(Todas)</option>' + coprosHTML;
    document.getElementById('gCopro').innerHTML = coprosHTML;

    // Llenar Select Proveedores (Para el Formulario)
    document.getElementById('gProv').innerHTML = PROVS.map(x=>`<option value="${getKeyVal(x)}">${x.Nombre}</option>`).join("");

    aplicarFiltros();

  }catch(e){
    console.error(e);
    alert("Error cargando datos: " + e.message);
  }finally{
    hideSpinner();
  }
}

/* ===== Filtros y Render ===== */
function aplicarFiltros(){
  const q = norm(document.getElementById('inpBuscar').value);
  const coproID = document.getElementById('selCoproFilter').value;

  // Mapas para búsqueda rápida de nombres
  const provMap = {}; PROVS.forEach(p => provMap[getKeyVal(p)] = norm(p.Nombre));
  
  VIEW = GASTOS.filter(g => {
    // Filtro Copropiedad
    if(coproID && String(g.CopropiedadID) !== String(coproID)) return false;

    // Filtro Texto
    if(!q) return true;
    
    // Buscar en: Tipo, Documento, Obs, y Nombre del Proveedor (cruzado)
    const nombreProv = provMap[g.ProveedorID] || "";
    const searchStr = [g.TipoGasto, g.Documento, g.Observaciones, nombreProv].map(v=>norm(v)).join(" ");
    
    return searchStr.includes(q);
  });

  renderTabla();
}

function renderTabla(){
  const tb = document.getElementById('tablaG');
  if(!VIEW.length){ tb.innerHTML = '<tr><td colspan="8" class="muted">No hay gastos registrados.</td></tr>'; return; }

  // Mapas para mostrar Nombres en la tabla
  const coproMap={}; COPROS.forEach(c => coproMap[getKeyVal(c)] = c.Nombre);
  const provMap={};  PROVS.forEach(p => provMap[getKeyVal(p)] = p.Nombre);

  tb.innerHTML = VIEW.map(g => {
    const key = getKeyVal(g);
    const nombreCopro = coproMap[g.CopropiedadID] || "—";
    const nombreProv  = provMap[g.ProveedorID] || "—";

    return `<tr>
      <td><span style="font-weight:600; font-size:13px;">${nombreCopro}</span></td>
      <td>${nombreProv}</td>
      <td>${g.TipoGasto||""}</td>
      <td class="mono" style="text-align:right;">${clp(g.Monto)}</td>
      <td>${fmtFecha(g.Fecha)}</td>
      <td class="mono">${g.Documento||""}</td>
      <td style="font-size:12px; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${g.Observaciones||""}">${g.Observaciones||""}</td>
      <td class="no-print">
         <div class="acciones-group">
            <button class="btn-icon btn-editar" onclick="abrirForm('${key}')" title="Editar">
               <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-eliminar" onclick="eliminar('${key}')" title="Eliminar">
               <i class="fa-solid fa-trash"></i>
            </button>
         </div>
      </td>
    </tr>`;
  }).join("");
}

/* ===== CRUD ===== */
function abrirForm(id){
  const title = document.getElementById('modalTitle');
  document.getElementById('formG').reset();
  document.getElementById('gID').value = "";

  if(id){
    title.textContent = "Editar Gasto";
    const g = GASTOS.find(x => String(getKeyVal(x)) === String(id));
    if(!g){ alert("No encontrado"); return; }
    
    document.getElementById('gID').value = id;
    document.getElementById('gCopro').value = g.CopropiedadID;
    document.getElementById('gProv').value = g.ProveedorID;
    document.getElementById('gTipo').value = g.TipoGasto||"";
    document.getElementById('gMonto').value = g.Monto||0;
    
    // Manejo seguro de fecha para el input type="date"
    if(g.Fecha){
        const d = new Date(g.Fecha);
        if(!isNaN(d)) document.getElementById('gFecha').value = d.toISOString().split('T')[0];
    }
    
    document.getElementById('gDocumento').value = g.Documento||"";
    document.getElementById('gObs').value = g.Observaciones||"";
  } else {
    title.textContent = "Nuevo Gasto";
    // Fecha hoy por defecto
    document.getElementById('gFecha').value = new Date().toISOString().split('T')[0];
  }
  document.getElementById('modalG').classList.add("active");
}

function cerrarForm(){ document.getElementById('modalG').classList.remove("active"); }

document.getElementById('formG').onsubmit = async (e)=>{
  e.preventDefault();
  const idValue = document.getElementById('gID').value;
  
  const payload = {
    CopropiedadID: document.getElementById('gCopro').value,
    ProveedorID: document.getElementById('gProv').value,
    TipoGasto: document.getElementById('gTipo').value.trim(),
    Monto: parseFloat(document.getElementById('gMonto').value)||0,
    Fecha: document.getElementById('gFecha').value,
    Documento: document.getElementById('gDocumento').value.trim(),
    Observaciones: document.getElementById('gObs').value.trim()
  };

  const keyField = (idValue ? KEY_NAME : KEY_NAME);

  if(idValue){
     payload[keyField] = idValue;
  } else {
     payload[keyField] = generateKey('GST');
  }

  try{
    showSpinner(idValue ? 'Guardando...' : 'Creando...');
    if(typeof upsertData === 'function'){
       await upsertData("Gastos", payload);
    } else {
       if(idValue) await appSheetCRUD("Gastos","Edit",[payload]);
       else        await appSheetCRUD("Gastos","Add",[payload]);
    }
    cerrarForm();
    await cargarTodo();
  }catch(err){
    console.error(err);
    alert("Error al guardar: " + err.message);
  }finally{
    hideSpinner();
  }
};

async function eliminar(id){
  if(!confirm("¿Eliminar este registro de gasto?")) return;
  try{
    showSpinner("Eliminando...");
    if(typeof deleteByKey === 'function'){
       await deleteByKey("Gastos", id);
    } else {
       await appSheetCRUD("Gastos","Delete",[{[KEY_NAME]:id}]);
    }
    await cargarTodo();
  }catch(err){
    alert("Error: " + err.message);
  }finally{
    hideSpinner();
  }
}

/* ===== Exportar ===== */
function exportCSV(){
  const headers = ['ID','CopropiedadID','ProveedorID','TipoGasto','Monto','Fecha','Documento','Obs'];
  const lines = [headers.join(',')];
  
  VIEW.forEach(r => {
    lines.push([
      escapeCSV(getKeyVal(r)),
      escapeCSV(r.CopropiedadID),
      escapeCSV(r.ProveedorID),
      escapeCSV(r.TipoGasto),
      escapeCSV(r.Monto),
      escapeCSV(r.Fecha),
      escapeCSV(r.Documento),
      escapeCSV(r.Observaciones)
    ].join(','));
  });

  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); 
  a.href = url; a.download = 'GastosComunes.csv'; 
  a.click(); 
  URL.revokeObjectURL(url);
}

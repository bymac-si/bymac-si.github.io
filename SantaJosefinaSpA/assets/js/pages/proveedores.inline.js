// ===== Extracted from proveedores.html =====

/* ===== Utilidades ===== */
function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.style.display='grid'; }
function hideSpinner(){ document.getElementById('pageSpinner').style.display='none'; }
function norm(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function escapeCSV(v){ if(v==null) return ''; const s=String(v).replaceAll('"','""'); return /[",\n]/.test(s) ? '"'+s+'"' : s; }

/* Helpers de Claves */
if(typeof window.getKeyVal !== 'function'){ window.getKeyVal = (o)=> o? (o._id ?? o.id ?? o.ID ?? o.Key ?? o.key ?? o.Id ?? o[Object.keys(o)[0]]):""; }
if(typeof window.getKeyName !== 'function'){ window.getKeyName = (row)=>{ if(!row || typeof row!=='object') return 'ID'; const cands=['ID','_id','Id','id','Key','key']; for(const c of cands){ if(c in row) return c; } return Object.keys(row)[0] || 'ID'; }; }
function generateKey(prefix='ID'){ return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8).toUpperCase()}`; }

/* ===== Estado Global ===== */
let PROVS=[], COPROS=[], VIEW=[];
let KEY_NAME="ID";

/* ===== Inicialización ===== */
document.addEventListener("DOMContentLoaded", async ()=>{
  try{ document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); }catch(e){}
  try{ document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); }catch(e){}
  
  bindUI();
  await cargarTodo();
});

function bindUI(){
  // Botones Header
  document.getElementById('btnNew').addEventListener('click', ()=>abrirForm());
  document.getElementById('btnReload').addEventListener('click', cargarTodo);
  document.getElementById('btnExport').addEventListener('click', exportCSV);
  
  // Filtros
  document.getElementById('inpBuscar').addEventListener('input', aplicarFiltros);
  document.getElementById('selCoproFilter').addEventListener('change', aplicarFiltros);

  // Cerrar Modal con click fuera o Escape
  modalProv.addEventListener('click', e=>{ if(e.target===modalProv) cerrarForm(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') cerrarForm(); });
}

/* ===== Carga de Datos ===== */
async function cargarTodo(){
  try{
    showSpinner('Cargando proveedores...');
    const [p, c] = await Promise.all([ 
       fetchData("Proveedores").catch(()=>[]), 
       fetchData("Copropiedades").catch(()=>[]) 
    ]);
    
    PROVS = p || [];
    COPROS = c || [];
    
    if(PROVS.length) KEY_NAME = getKeyName(PROVS[0]);

    // Llenar Selects de Copropiedades (Filtro y Modal)
    const optionsHTML = COPROS.map(x=>`<option value="${getKeyVal(x)}">${x.Nombre}</option>`).join("");
    
    document.getElementById('selCoproFilter').innerHTML = '<option value="">(Todas)</option>' + optionsHTML;
    document.getElementById('provCopro').innerHTML = optionsHTML;

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

  VIEW = PROVS.filter(p => {
    // Filtro por Copropiedad
    if(coproID && String(p.CopropiedadID) !== String(coproID)) return false;
    
    // Filtro Texto
    if(!q) return true;
    const searchStr = [p.Nombre, p.RUT, p.Giro, p.Email, p.Telefono].map(v=>norm(v)).join(" ");
    return searchStr.includes(q);
  });

  renderTabla();
}

function renderTabla(){
  const tb = document.getElementById('tablaProv');
  if(!VIEW.length){ tb.innerHTML = '<tr><td colspan="7" class="muted">No se encontraron resultados.</td></tr>'; return; }

  // Mapa rápido para nombres de copropiedades
  const coproMap = {}; 
  COPROS.forEach(c => coproMap[getKeyVal(c)] = c.Nombre);

  tb.innerHTML = VIEW.map(p => {
    const key = getKeyVal(p);
    const nombreCopro = coproMap[p.CopropiedadID] || "—";
    
    return `<tr>
      <td><span style="font-weight:600; font-size:13px;">${nombreCopro}</span></td>
      <td>${p.Nombre||""}</td>
      <td class="mono">${p.RUT||""}</td>
      <td>${p.Giro||""}</td>
      <td>${p.Email||""}</td>
      <td>${p.Telefono||""}</td>
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

/* ===== CRUD: Crear / Editar ===== */
function abrirForm(id){
  const title = document.getElementById('modalTitleProv');
  document.getElementById('formProv').reset();
  document.getElementById('provID').value = "";

  if(id){
    title.textContent = "Editar Proveedor";
    const p = PROVS.find(x => String(getKeyVal(x)) === String(id));
    if(!p){ alert("No encontrado"); return; }
    
    document.getElementById('provID').value = id;
    document.getElementById('provCopro').value = p.CopropiedadID;
    document.getElementById('provNombre').value = p.Nombre||"";
    document.getElementById('provRUT').value = p.RUT||"";
    document.getElementById('provGiro').value = p.Giro||"";
    document.getElementById('provEmail').value = p.Email||"";
    document.getElementById('provTelefono').value = p.Telefono||"";
  } else {
    title.textContent = "Nuevo Proveedor";
  }
  document.getElementById('modalProv').classList.add("active");
}

function cerrarForm(){ document.getElementById('modalProv').classList.remove("active"); }

document.getElementById('formProv').onsubmit = async (e)=>{
  e.preventDefault();
  const idValue = document.getElementById('provID').value;
  
  // Construir Payload
  const payload = {
    CopropiedadID: document.getElementById('provCopro').value,
    Nombre: document.getElementById('provNombre').value.trim(),
    RUT: document.getElementById('provRUT').value.trim(),
    Giro: document.getElementById('provGiro').value.trim(),
    Email: document.getElementById('provEmail').value.trim(),
    Telefono: document.getElementById('provTelefono').value.trim()
  };

  const keyField = (idValue ? KEY_NAME : KEY_NAME); // Asumimos KEY_NAME consistente

  if(idValue){
     payload[keyField] = idValue;
  } else {
     payload[keyField] = generateKey('PROV');
  }

  try{
    showSpinner(idValue ? 'Guardando...' : 'Creando...');
    
    // Intenta usar upsertData, fallback a appSheetCRUD
    if(typeof upsertData === 'function'){
       await upsertData("Proveedores", payload);
    } else {
       if(idValue) await appSheetCRUD("Proveedores","Edit",[payload]);
       else        await appSheetCRUD("Proveedores","Add",[payload]);
    }

    cerrarForm();
    await cargarTodo(); // Recargar datos sin refrescar página completa
  }catch(err){
    console.error(err);
    alert("Error al guardar: " + err.message);
  }finally{
    hideSpinner();
  }
};

/* ===== CRUD: Eliminar ===== */
async function eliminar(id){
  if(!confirm("¿Estás seguro de eliminar este proveedor?\nNo se puede deshacer.")) return;
  try{
    showSpinner("Eliminando...");
    if(typeof deleteByKey === 'function'){
       await deleteByKey("Proveedores", id);
    } else {
       await appSheetCRUD("Proveedores","Delete",[{[KEY_NAME]:id}]);
    }
    await cargarTodo();
  }catch(err){
    alert("Error al eliminar: " + err.message);
  }finally{
    hideSpinner();
  }
}

/* ===== Exportar ===== */
function exportCSV(){
  const headers = ['ID','CopropiedadID','Nombre','RUT','Giro','Email','Telefono'];
  const lines = [headers.join(',')];
  
  VIEW.forEach(r => {
    lines.push([
      escapeCSV(getKeyVal(r)),
      escapeCSV(r.CopropiedadID),
      escapeCSV(r.Nombre),
      escapeCSV(r.RUT),
      escapeCSV(r.Giro),
      escapeCSV(r.Email),
      escapeCSV(r.Telefono)
    ].join(','));
  });

  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); 
  a.href = url; a.download = 'Proveedores.csv'; 
  a.click(); 
  URL.revokeObjectURL(url);
}

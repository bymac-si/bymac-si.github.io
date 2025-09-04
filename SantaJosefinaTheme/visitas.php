<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Visitas</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Gestión de Visitas</h1>
  <button class="btn-primary" onclick="abrirFormVisita()">+ Nueva Visita</button>

  <table style="margin-top:16px;">
    <thead>
      <tr><th>Cliente</th><th>Propiedad</th><th>Fecha</th><th>Agente</th><th>Acciones</th></tr>
    </thead>
    <tbody id="tablaVisitas"></tbody>
  </table>
</main>

<div id="modalVisita" class="modal">
  <div class="modal-content">
    <h2 id="modalTitleVisita">Nueva Visita</h2>
    <form id="formVisita">
      <input type="hidden" id="visitaID">
      <label>Cliente</label><select id="visitaCliente" required></select>
      <label>Propiedad</label><select id="visitaPropiedad" required></select>
      <label>Fecha</label><input type="date" id="visitaFecha" required>
      <label>Agente</label><input id="visitaAgente">
      <div style="text-align:right;margin-top:10px;">
        <button type="button" class="btn-outline" onclick="cerrarModalVisita()">Cancelar</button>
        <button class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<div id="modalDetalle" class="modal">
  <div class="modal-content">
    <h2>Detalle Visita</h2>
    <div id="detalleContenido"></div>
    <div style="text-align:right;margin-top:10px;">
      <button class="btn-primary" type="button" onclick="cerrarModalDetalle()">Cerrar</button>
    </div>
  </div>
</div>

<div id="footer"></div>

<script>
document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();
});

let visitas=[], clientes=[], propiedades=[], KEY_NAME="ID";

function formatearFechaISO(d){ if(!d) return ""; return new Date(d).toLocaleDateString("es-CL"); }

async function cargarVisitas(){
  [visitas, clientes, propiedades] = await Promise.all([
    fetchData("Visitas"),
    fetchData("Clientes"),
    fetchData("Propiedades")
  ]);
  if(visitas.length) KEY_NAME = getKeyName(visitas[0]);

  const clientesMap={}, propMap={};
  clientes.forEach(c=>clientesMap[getKeyVal(c)] = c.Nombre);
  propiedades.forEach(p=>propMap[getKeyVal(p)] = p.Direccion||"");

  tablaVisitas.innerHTML = visitas.map(v=>{
    const key = getKeyVal(v);
    return `<tr>
      <td>${clientesMap[v.Cliente]||"—"}</td>
      <td>${propMap[v.Propiedad]||"—"}</td>
      <td>${formatearFechaISO(v.Fecha||v["Fecha Visita"])}</td>
      <td>${v.Agente||""}</td>
      <td>
        <button class="btn-outline btn-ver" data-id="${key}">Ver</button>
        <button class="btn-outline btn-edit" data-id="${key}">Editar</button>
        <button class="btn-primary" onclick="eliminarVisita('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  visitaCliente.innerHTML = clientes.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
  visitaPropiedad.innerHTML = propiedades.map(p=>`<option value="${getKeyVal(p)}">${p.Direccion||""}</option>`).join("");

  tablaVisitas.onclick = (e)=>{
    const ver=e.target.closest(".btn-ver");
    const ed=e.target.closest(".btn-edit");
    if(ver) abrirDetalle(visitas.find(x=>String(getKeyVal(x))===String(ver.dataset.id)));
    if(ed) abrirFormVisita(ed.dataset.id);
  };
}

function abrirFormVisita(id){
  modalTitleVisita.textContent = id ? "Editar Visita" : "Nueva Visita";
  if(id){
    const v = visitas.find(x=>String(getKeyVal(x))===String(id));
    if(!v){ alert("No encontrada"); return; }
    visitaID.value=id;
    visitaCliente.value=v.Cliente;
    visitaPropiedad.value=v.Propiedad;
    visitaFecha.value=v.Fecha || v["Fecha Visita"] || "";
    visitaAgente.value=v.Agente||"";
  }else{
    formVisita.reset(); visitaID.value="";
  }
  modalVisita.classList.add("active");
}
function cerrarModalVisita(){ modalVisita.classList.remove("active"); }

formVisita.onsubmit = async (e)=>{
  e.preventDefault();
  const id = visitaID.value || undefined;
  const payload = {
    ...(id?{[KEY_NAME]:id}:{}),
    Cliente: visitaCliente.value,
    Propiedad: visitaPropiedad.value,
    Fecha: visitaFecha.value,       // ISO (YYYY-MM-DD) desde input date
    Agente: (visitaAgente.value||"").trim()
  };
  if(id) await appSheetCRUD("Visitas","Edit",[payload]);
  else   await appSheetCRUD("Visitas","Add",[payload]);
  cerrarModalVisita(); location.reload();
};

async function eliminarVisita(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Visitas","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

function abrirDetalle(v){
  const c = clientes.find(x=>getKeyVal(x)===v.Cliente);
  const p = propiedades.find(x=>getKeyVal(x)===v.Propiedad);
  detalleContenido.innerHTML = `
    <p><b>Cliente:</b> ${c?.Nombre||"—"}</p>
    <p><b>Propiedad:</b> ${p?.Direccion||"—"}</p>
    <p><b>Fecha:</b> ${formatearFechaISO(v.Fecha||v["Fecha Visita"])}</p>
    <p><b>Agente:</b> ${v.Agente||""}</p>
  `;
  modalDetalle.classList.add("active");
}
function cerrarModalDetalle(){ modalDetalle.classList.remove("active"); }

cargarVisitas();
</script>
</body>
</html>
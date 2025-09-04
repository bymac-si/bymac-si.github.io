<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CRM Inmobiliario - Propiedades</title>
<link rel="stylesheet" href="assets/css/styles.css">
<script src="assets/js/app.js"></script>
<script>requireAuth();</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Gestión de Propiedades</h1>
  <button onclick="abrirFormPropiedad()" class="btn-primary" style="margin-bottom:20px;">+ Nueva Propiedad</button>

  <table>
    <thead>
      <tr>
        <th>Título</th>
        <th>Dirección</th>
        <th>Tipo</th>
        <th>Precio</th>
        <th>Estado</th>
        <th>Propietario</th>
        <th>Agente</th>
        <th>Imagen</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody id="tablaPropiedades"></tbody>
  </table>
</main>

<!-- MODAL FORM -->
<div id="modalPropiedad" class="modal">
  <div class="modal-content">
    <h2 id="modalTitlePropiedad">Nueva Propiedad</h2>
    <form id="formPropiedad">
      <input type="hidden" id="propiedadID">
      <label>Título</label><input id="propiedadTitulo" required>
      <label>Dirección</label><input id="propiedadDireccion" required>
      <label>Tipo</label><input id="propiedadTipo">
      <label>Precio</label><input type="number" id="propiedadPrecio">
      <label>Estado</label><input id="propiedadEstado">
      <label>Propietario</label><input id="propiedadPropietario">
      <label>Agente</label><input id="propiedadAgente">
      <label>URL Imagen</label><input id="propiedadImagen">
      <div style="text-align:right;margin-top:10px;">
        <button type="button" onclick="cerrarModalPropiedad()" class="btn-outline">Cancelar</button>
        <button class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL DETALLE -->
<div id="modalDetalle" class="modal">
  <div class="modal-content">
    <h2>Detalle Propiedad</h2>
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

let propiedadesGlobal=[], KEY_NAME="ID";
const hoyISO = ()=> new Date().toISOString().split("T")[0];
const formatoCLP = v => "$"+new Intl.NumberFormat("es-CL").format(Number(v||0));

async function cargarPropiedades(){
  propiedadesGlobal = await fetchData("Propiedades");
  if(propiedadesGlobal.length) KEY_NAME = getKeyName(propiedadesGlobal[0]);

  tablaPropiedades.innerHTML = propiedadesGlobal.map(p=>{
    const key = getKeyVal(p);
    return `<tr>
      <td>${p.Titulo||""}</td>
      <td>${p.Direccion||""}</td>
      <td>${p.Tipo||""}</td>
      <td>${formatoCLP(p.Precio)}</td>
      <td>${p.Estado||""}</td>
      <td>${p.Propietario||""}</td>
      <td>${p.Agente||""}</td>
      <td>${p.ImagenURL?`<img src="${p.ImagenURL}" style="width:80px;border-radius:4px;">`:"—"}</td>
      <td>
        <button class="btn-outline btn-ver" data-id="${key}">Ver</button>
        <button class="btn-outline btn-edit" data-id="${key}">Editar</button>
        <button class="btn-primary" onclick="eliminarPropiedad('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  tablaPropiedades.onclick = (e)=>{
    const v = e.target.closest(".btn-ver");
    const ed = e.target.closest(".btn-edit");
    if(v) abrirDetallePropiedad(v.dataset.id);
    if(ed) abrirFormPropiedad(ed.dataset.id);
  };
}

function abrirFormPropiedad(id){
  modalTitlePropiedad.textContent = id ? "Editar Propiedad" : "Nueva Propiedad";
  if(id){
    const p = propiedadesGlobal.find(x=>String(getKeyVal(x))===String(id));
    if(!p){ alert("No encontrada"); return; }
    propiedadID.value = id;
    propiedadTitulo.value = p.Titulo||"";
    propiedadDireccion.value = p.Direccion||"";
    propiedadTipo.value = p.Tipo||"";
    propiedadPrecio.value = p.Precio||0;
    propiedadEstado.value = p.Estado||"";
    propiedadPropietario.value = p.Propietario||"";
    propiedadAgente.value = p.Agente||"";
    propiedadImagen.value = p.ImagenURL||"";
  }else{
    formPropiedad.reset();
    propiedadID.value = "";
  }
  modalPropiedad.classList.add("active");
}
function cerrarModalPropiedad(){ modalPropiedad.classList.remove("active"); }

formPropiedad.onsubmit = async (e)=>{
  e.preventDefault();
  const id = propiedadID.value || undefined;

  const payload = {
    ...(id?{[KEY_NAME]:id}:{}),
    Direccion: propiedadDireccion.value.trim(),
    Titulo: propiedadTitulo.value.trim(),
    Tipo: propiedadTipo.value.trim(),
    Precio: parseFloat(propiedadPrecio.value)||0,
    Estado: propiedadEstado.value.trim(),
    Propietario: propiedadPropietario.value.trim(),
    Agente: propiedadAgente.value.trim(),
    // IMPORTANTE: nombre exacto de columna en AppSheet/Sheet
    "Fecha Captacion": id 
      ? (propiedadesGlobal.find(x=>String(getKeyVal(x))===String(id))?.["Fecha Captacion"] || hoyISO())
      : hoyISO(),
    ImagenURL: propiedadImagen.value.trim()||null
  };
  // console.log(payload);
  if(id) await appSheetCRUD("Propiedades","Edit",[payload]);
  else   await appSheetCRUD("Propiedades","Add",[payload]);
  cerrarModalPropiedad(); location.reload();
};

async function eliminarPropiedad(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Propiedades","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

function abrirDetallePropiedad(id){
  const p = propiedadesGlobal.find(x=>String(getKeyVal(x))===String(id));
  if(!p){ alert("No encontrada"); return; }
  detalleContenido.innerHTML = `
    <p><b>Título:</b> ${p.Titulo||""}</p>
    <p><b>Dirección:</b> ${p.Direccion||""}</p>
    <p><b>Tipo:</b> ${p.Tipo||""}</p>
    <p><b>Precio:</b> ${formatoCLP(p.Precio)}</p>
    <p><b>Estado:</b> ${p.Estado||""}</p>
    <p><b>Propietario:</b> ${p.Propietario||""}</p>
    <p><b>Agente:</b> ${p.Agente||""}</p>
    <p><b>Fecha Captación:</b> ${p["Fecha Captacion"]||""}</p>
    <p><b>Imagen:</b><br>${p.ImagenURL?`<img src="${p.ImagenURL}" style="width:200px;border-radius:6px;">`:"—"}</p>
  `;
  modalDetalle.classList.add("active");
}
function cerrarModalDetalle(){ modalDetalle.classList.remove("active"); }

cargarPropiedades();
</script>
</body>
</html>
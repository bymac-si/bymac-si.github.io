<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>CRM Inmobiliario - Administración</title>
<link rel="stylesheet" href="assets/css/styles.css" />
<script src="assets/js/app.js"></script>
<script>
  requireAuth();
</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">

<!-- NAV -->
<div id="header"></div>

<!-- CONTENIDO -->
<main style="padding:40px;">
  <h1 id="tituloPagina" style="font-size:28px; font-weight:600; color:#1A2B48; margin-bottom:20px;">
    Administración
  </h1>

  <div style="display:flex; gap:10px; align-items:center; margin-bottom:16px;">
    <button id="btnNuevo" class="btn-primary">+ Nuevo</button>
    <input id="filtro" type="text" placeholder="Buscar..." style="flex:1; padding:8px; border:1px solid #e5e7eb; border-radius:4px;">
  </div>

  <table>
    <thead id="tablaHead"></thead>
    <tbody id="tablaBody"></tbody>
  </table>
</main>

<!-- MODAL: Crear/Editar Usuario o Agente -->
<div id="modalEntidad" class="modal">
  <div class="modal-content">
    <h2 id="modalTitleEntidad">Nuevo</h2>
    <form id="formEntidad">
      <input type="hidden" id="entidadID">

      <div id="camposUsuario">
        <input type="email" id="usuarioEmail" placeholder="Correo corporativo">
        <input type="text" id="usuarioNombre" placeholder="Nombre completo">
        <select id="usuarioRol">
          <option value="Colaborador">Colaborador</option>
          <option value="Admin">Admin</option>
        </select>
        <select id="usuarioActivo">
          <option value="SI">Activo</option>
          <option value="NO">Inactivo</option>
        </select>
      </div>

      <div id="camposAgente">
        <input type="text" id="agenteNombre" placeholder="Nombre completo">
        <input type="text" id="agenteEmail" placeholder="Correo">
        <input type="text" id="agenteTelefono" placeholder="Teléfono">
        <select id="agenteActivo">
          <option value="SI">Activo</option>
          <option value="NO">Inactivo</option>
        </select>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
        <button type="button" onclick="cerrarModalEntidad()" class="btn-outline">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: Tareas de Agente -->
<div id="modalTareas" class="modal">
  <div class="modal-content">
    <h2 id="modalTitleTareas">Tareas del Agente</h2>
    <div style="margin-bottom:10px;">
      <button id="btnNuevaTarea" class="btn-primary">+ Nueva Tarea</button>
    </div>
    <table>
      <thead><tr><th>Título</th><th>Estado</th><th>Prioridad</th><th>Fecha Límite</th><th>Acciones</th></tr></thead>
      <tbody id="tablaTareas"></tbody>
    </table>
    <div style="margin-top:12px; text-align:right;">
      <button type="button" onclick="cerrarModalTareas()" class="btn-outline">Cerrar</button>
    </div>
  </div>
</div>

<!-- MODAL FORM TAREA -->
<div id="modalFormTarea" class="modal">
  <div class="modal-content">
    <h2 id="modalTitleTarea">Nueva Tarea</h2>
    <form id="formTarea">
      <input type="hidden" id="tareaID">
      <input type="hidden" id="tareaAgenteID">

      <label>Título</label>
      <input type="text" id="tareaTitulo" required>

      <label>Descripción</label>
      <textarea id="tareaDescripcion" rows="3"></textarea>

      <label>Estado</label>
      <select id="tareaEstado">
        <option value="Pendiente">Pendiente</option>
        <option value="En Progreso">En Progreso</option>
        <option value="Completada">Completada</option>
      </select>

      <label>Prioridad</label>
      <select id="tareaPrioridad">
        <option value="Baja">Baja</option>
        <option value="Media">Media</option>
        <option value="Alta">Alta</option>
      </select>

      <label>Fecha Límite</label>
      <input type="date" id="tareaFechaLimite">

      <label>Comentarios</label>
      <textarea id="tareaComentarios" rows="2"></textarea>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
        <button type="button" class="btn-outline" onclick="cerrarFormTarea()">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<div id="footer"></div>

<script>
requireAuth();
requireRole(['Admin','Colaborador']); 

let tipo = new URLSearchParams(window.location.search).get("tipo") || "usuarios";
let dataGlobal=[], tareas=[];
const tbody=document.getElementById("tablaBody");
const thead=document.getElementById("tablaHead");
let agenteActivoID=null;

// ==== Inicialización ====
document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();

  document.getElementById("tituloPagina").textContent = (tipo==="agentes") ? "Gestión de Agentes" : "Administración de Usuarios";
  document.getElementById("camposUsuario").style.display = (tipo==="usuarios")?"block":"none";
  document.getElementById("camposAgente").style.display = (tipo==="agentes")?"block":"none";

  document.getElementById("btnNuevo").onclick=()=>abrirFormEntidad();

  // Vincular botón de nueva tarea
  document.getElementById("btnNuevaTarea").onclick=()=>abrirFormTarea();

  await cargarEntidades();
});

// ==== Cargar entidades ====
async function cargarEntidades(){
  if(tipo==="usuarios"){
    dataGlobal = await fetchData("Usuarios");
    thead.innerHTML=`<tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Activo</th><th>Acciones</th></tr>`;
  } else {
    [dataGlobal,tareas] = await Promise.all([
      fetchData("Agentes"),
      fetchData("Tareas")
    ]);
    thead.innerHTML=`<tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Activo</th><th>Acciones</th></tr>`;
  }
  renderTabla();
}

// ==== Render tabla ====
function renderTabla(){
  const q=(document.getElementById("filtro").value||"").toLowerCase();
  const data=dataGlobal.filter(e=>
    (e.Nombre||"").toLowerCase().includes(q) ||
    (e.Email||"").toLowerCase().includes(q)
  );

  tbody.innerHTML=data.map(e=>{
    const id=getKeyVal(e);
    if(tipo==="usuarios"){
      return `<tr>
        <td>${(e.Email||"")}</td>
        <td>${e.Nombre||""}</td>
        <td>${e.Rol||"Colaborador"}</td>
        <td>${e.Activo||"NO"}</td>
        <td>
          <button class="btn-outline" onclick="abrirFormEntidad('${id}')">Editar</button>
          <button class="btn-primary" onclick="eliminarEntidad('${id}')">Eliminar</button>
        </td>
      </tr>`;
    } else {
      return `<tr>
        <td>${e.Nombre||""}</td>
        <td>${e.Email||""}</td>
        <td>${e.Telefono||""}</td>
        <td>${e.Activo||"NO"}</td>
        <td>
          <button class="btn-outline" onclick="abrirFormEntidad('${id}')">Editar</button>
          <button class="btn-outline" onclick="abrirModalTareas('${id}')">Tareas</button>
          <button class="btn-primary" onclick="eliminarEntidad('${id}')">Eliminar</button>
        </td>
      </tr>`;
    }
  }).join("");
}

// ==== Modal Entidad ====
function abrirFormEntidad(id){
  document.getElementById("modalTitleEntidad").textContent=id? "Editar":"Nuevo";
  if(id){
    const e=dataGlobal.find(x=>String(getKeyVal(x))===String(id));
    if(!e) return alert("No encontrado");
    document.getElementById("entidadID").value=id;

    if(tipo==="usuarios"){
      usuarioEmail.value=e.Email||"";
      usuarioNombre.value=e.Nombre||"";
      usuarioRol.value=e.Rol||"Colaborador";
      usuarioActivo.value=e.Activo||"NO";
    } else {
      agenteNombre.value=e.Nombre||"";
      agenteEmail.value=e.Email||"";
      agenteTelefono.value=e.Telefono||"";
      agenteActivo.value=e.Activo||"NO";
    }
  } else {
    formEntidad.reset();
    entidadID.value="";
  }
  modalEntidad.classList.add("active");
}
function cerrarModalEntidad(){ modalEntidad.classList.remove("active"); }

document.getElementById("formEntidad").addEventListener("submit", async e=>{
  e.preventDefault();
  const id=document.getElementById("entidadID").value;
  let payload={};

  if(tipo==="usuarios"){
    payload={
      ...(id?{ID:id}:{ }),
      Email: usuarioEmail.value.trim().toLowerCase(),
      Nombre: usuarioNombre.value.trim(),
      Rol: usuarioRol.value,
      Activo: usuarioActivo.value
    };
    await appSheetCRUD("Usuarios",id?"Edit":"Add",[payload]);
  } else {
    payload={
      ...(id?{ID:id}:{ }),
      Nombre: agenteNombre.value.trim(),
      Email: agenteEmail.value.trim(),
      Telefono: agenteTelefono.value.trim(),
      Activo: agenteActivo.value
    };
    await appSheetCRUD("Agentes",id?"Edit":"Add",[payload]);
  }
  cerrarModalEntidad();
  location.reload();
});

// ==== Eliminar entidad ====
async function eliminarEntidad(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD(tipo==="usuarios"?"Usuarios":"Agentes","Delete",[{ID:id}]);
  location.reload();
}

// ==== Modal Tareas ====
function abrirModalTareas(agenteID){
  agenteActivoID=agenteID;
  const ag=dataGlobal.find(x=>getKeyVal(x)===agenteID);
  document.getElementById("modalTitleTareas").textContent=`Tareas de ${ag?.Nombre||""}`;
  renderTareas();
  modalTareas.classList.add("active");
}
function cerrarModalTareas(){ modalTareas.classList.remove("active"); }

function renderTareas(){
  const rows=tareas.filter(t=>String(t.AgenteID)===String(agenteActivoID)).map(t=>`
    <tr>
      <td>${t.Título||""}</td>
      <td>${t.Estado||""}</td>
      <td>${t.Prioridad||""}</td>
      <td>${t.FechaLimite||""}</td>
      <td>
        <button class="btn-outline" onclick="abrirFormTarea('${agenteActivoID}','${t.ID}')">Editar</button>
        <button class="btn-primary" onclick="eliminarTarea('${t.ID}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
  document.getElementById("tablaTareas").innerHTML=rows;
}

// ==== Modal Form Tarea ====
function abrirFormTarea(agenteID, tareaID){
  document.getElementById("modalTitleTarea").textContent=tareaID? "Editar Tarea":"Nueva Tarea";
  document.getElementById("tareaAgenteID").value=agenteID||agenteActivoID||"";

  if(tareaID){
    const t=tareas.find(x=>x.ID===tareaID);
    if(!t) return;
    document.getElementById("tareaID").value=t.ID;
    tareaTitulo.value=t.Título||"";
    tareaDescripcion.value=t.Descripción||"";
    tareaEstado.value=t.Estado||"Pendiente";
    tareaPrioridad.value=t.Prioridad||"Media";
    tareaFechaLimite.value=t.FechaLimite||"";
    tareaComentarios.value=t.Comentarios||"";
  } else {
    formTarea.reset();
    document.getElementById("tareaID").value="";
  }
  modalFormTarea.classList.add("active");
}
function cerrarFormTarea(){ modalFormTarea.classList.remove("active"); }

formTarea.addEventListener("submit", async e=>{
  e.preventDefault();
  const id=document.getElementById("tareaID").value;
  const payload={
    ...(id?{ID:id}:{ }),
    AgenteID: document.getElementById("tareaAgenteID").value,
    Título: document.getElementById("tareaTitulo").value.trim(),
    Descripción: document.getElementById("tareaDescripcion").value.trim(),
    Estado: document.getElementById("tareaEstado").value,
    Prioridad: document.getElementById("tareaPrioridad").value,
    FechaCreación: id? (tareas.find(x=>x.ID===id)?.FechaCreación||new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
    FechaLimite: document.getElementById("tareaFechaLimite").value,
    Comentarios: document.getElementById("tareaComentarios").value.trim()
  };

  await appSheetCRUD("Tareas",id?"Edit":"Add",[payload]);
  cerrarFormTarea();
  alert("Tarea guardada correctamente.");
  location.reload();
});

async function eliminarTarea(id){
  if(!confirm("¿Eliminar tarea?")) return;
  await appSheetCRUD("Tareas","Delete",[{"ID":id}]);
  alert("Tarea eliminada.");
  location.reload();
}
</script>
</body>
</html>
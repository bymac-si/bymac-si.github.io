// ===== Extracted from usuarios.html =====

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
          <button class="btn-primary" onclick="abrirFormEntidad('${id}')">Editar</button>
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
          <button class="btn-primary" onclick="abrirFormEntidad('${id}')">Editar</button>
          <button class="btn-primary" onclick="abrirModalTareas('${id}')">Tareas</button>
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
        <button class="btn-primary" onclick="abrirFormTarea('${agenteActivoID}','${t.ID}')">Editar</button>
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

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Contactos</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body>
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Contactos</h1>

  <table>
    <thead>
      <tr>
        <th>Nombre</th><th>Email</th><th>Teléfono</th><th>Mensaje</th><th>Fecha</th><th>Estado</th><th>Acciones</th>
      </tr>
    </thead>
    <tbody id="tablaContactos"></tbody>
  </table>
</main>

<div id="modalContacto" class="modal">
  <div class="modal-content">
    <h2 id="modalTitle">Actualizar Contacto</h2>
    <form id="formContactoAdm">
      <input type="hidden" id="contactoID">
      <label>Estado</label>
      <select id="contactoEstado">
        <option>Nuevo</option>
        <option>Lead</option>
        <option>Cliente</option>
        <option>Descartado</option>
      </select>
      <label>Notas</label>
      <textarea id="contactoNotas" rows="4"></textarea>
      <div style="text-align:right;margin-top:10px;">
        <button type="button" class="btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<div id="footer"></div>

<script>
document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();
});

let contactos=[], KEY_NAME="ID";

async function cargarContactos(){
  contactos = await fetchData("Contactos");
  if(contactos.length) KEY_NAME = getKeyName(contactos[0]);

  tablaContactos.innerHTML = contactos.map(r=>{
    const key=getKeyVal(r);
    return `<tr>
      <td>${r.Nombre||""}</td>
      <td>${r.Email||""}</td>
      <td>${r.Telefono||""}</td>
      <td>${r.Mensaje||""}</td>
      <td>${r.Fecha||""}</td>
      <td>${r.Estado||"Nuevo"}</td>
      <td>
        <button class="btn-outline" onclick="abrirModal('${key}')">Editar</button>
        <button class="btn-primary" onclick="eliminar('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");
}

function abrirModal(id){
  const c = contactos.find(x=>String(getKeyVal(x))===String(id));
  if(!c){ alert("No encontrado"); return; }
  contactoID.value = id;
  contactoEstado.value = c.Estado||"Nuevo";
  contactoNotas.value = c.Notas||"";
  modalContacto.classList.add("active");
}
function cerrarModal(){ modalContacto.classList.remove("active"); }

formContactoAdm.onsubmit = async (e)=>{
  e.preventDefault();
  const id = contactoID.value;
  const payload = {
    [KEY_NAME]: id,
    Estado: contactoEstado.value,
    Notas: contactoNotas.value.trim()
  };
  await appSheetCRUD("Contactos","Edit",[payload]);
  cerrarModal(); location.reload();
};

async function eliminar(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Contactos","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

cargarContactos();
</script>
</body>
</html>
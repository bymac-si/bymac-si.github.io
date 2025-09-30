<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Clientes</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Gestión de Clientes</h1>
  <button class="btn-primary" onclick="abrirFormCliente()">Nuevo Cliente</button>

  <table style="margin-top:16px;">
    <thead>
      <tr>
        <th>Nombre</th><th>Email</th><th>Teléfono</th><th>Canal</th><th>Segmento</th><th>Estado</th><th>Acciones</th>
      </tr>
    </thead>
    <tbody id="tablaClientes"></tbody>
  </table>
</main>

<div id="modalCliente" class="modal">
  <div class="modal-content">
    <h2 id="modalTitleCliente">Nuevo Cliente</h2>
    <form id="formCliente">
      <input type="hidden" id="clienteID">
      <label>Nombre</label><input id="clienteNombre" required>
      <label>Email</label><input id="clienteEmail" type="email">
      <label>Teléfono</label><input id="clienteTelefono">
      <label>Canal</label><input id="clienteCanal">
      <label>Segmento</label><input id="clienteSegmento">
      <label>Estado</label><input id="clienteEstado">
      <div style="text-align:right;margin-top:10px;">
        <button type="button" class="btn-primary" onclick="cerrarModalCliente()">Cancelar</button>
        <button class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<div id="footer"></div>

<script>
document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/footer.html")).text();
});

let clientesGlobal=[], KEY_NAME="ID";

async function cargarClientes(){
  clientesGlobal = await fetchData("Clientes");
  if(clientesGlobal.length) KEY_NAME = getKeyName(clientesGlobal[0]);

  tablaClientes.innerHTML = clientesGlobal.map(c=>{
    const key = getKeyVal(c);
    return `<tr>
      <td>${c.Nombre||""}</td>
      <td>${c.Email||""}</td>
      <td>${c.Telefono||c["Teléfono"]||""}</td>
      <td>${c.Canal||""}</td>
      <td>${c.Segmento||""}</td>
      <td>${c.Estado||""}</td>
      <td>
        <button class="btn-primary btn-edit" data-id="${key}">Editar</button>
        <button class="btn-primary" onclick="eliminarCliente('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  tablaClientes.onclick = (e)=>{
    const b=e.target.closest(".btn-edit");
    if(b) abrirFormCliente(b.dataset.id);
  };
}

function abrirFormCliente(id){
  modalTitleCliente.textContent = id ? "Editar Cliente" : "Nuevo Cliente";
  if(id){
    const c = clientesGlobal.find(x=>String(getKeyVal(x))===String(id));
    if(!c){ alert("No encontrado"); return; }
    clienteID.value = id;
    clienteNombre.value = c.Nombre||"";
    clienteEmail.value = c.Email||"";
    clienteTelefono.value = c.Telefono||c["Teléfono"]||"";
    clienteCanal.value = c.Canal||"";
    clienteSegmento.value = c.Segmento||"";
    clienteEstado.value = c.Estado||"";
  } else {
    formCliente.reset(); clienteID.value="";
  }
  modalCliente.classList.add("active");
}
function cerrarModalCliente(){ modalCliente.classList.remove("active"); }

formCliente.onsubmit = async (e)=>{
  e.preventDefault();
  const id = clienteID.value || undefined;
  const payload = {
    ...(id?{[KEY_NAME]:id}:{}),
    Nombre: clienteNombre.value.trim(),
    Email: (clienteEmail.value||"").trim().toLowerCase(),
    Telefono: (clienteTelefono.value||"").trim(),
    Canal: (clienteCanal.value||"").trim(),
    Segmento: (clienteSegmento.value||"").trim(),
    Estado: (clienteEstado.value||"").trim()
  };
  if(id) await appSheetCRUD("Clientes","Edit",[payload]);
  else   await appSheetCRUD("Clientes","Add",[payload]);
  cerrarModalCliente(); location.reload();
};

async function eliminarCliente(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Clientes","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

cargarClientes();
</script>
</body>
</html>
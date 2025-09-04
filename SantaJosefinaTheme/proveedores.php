<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Proveedores</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Proveedores</h1>
  <button class="btn-primary" onclick="abrirForm()">+ Nuevo Proveedor</button>

  <table style="margin-top:16px;">
    <thead>
      <tr><th>Copropiedad</th><th>Nombre</th><th>RUT</th><th>Giro</th><th>Email</th><th>Teléfono</th><th>Acciones</th></tr>
    </thead>
    <tbody id="tablaProv"></tbody>
  </table>
</main>

<div id="modalProv" class="modal">
  <div class="modal-content">
    <h2 id="modalTitleProv">Nuevo Proveedor</h2>
    <form id="formProv">
      <input type="hidden" id="provID">
      <label>Copropiedad</label><select id="provCopro" required></select>
      <label>Nombre</label><input id="provNombre" required>
      <label>RUT</label><input id="provRUT">
      <label>Giro</label><input id="provGiro">
      <label>Email</label><input id="provEmail" type="email">
      <label>Teléfono</label><input id="provTelefono">
      <div style="text-align:right;margin-top:10px;">
        <button type="button" class="btn-outline" onclick="cerrarForm()">Cancelar</button>
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

let provs=[], copros=[], KEY_NAME="ID";

async function cargar(){
  [provs, copros] = await Promise.all([ fetchData("Proveedores"), fetchData("Copropiedades") ]);
  if(provs.length) KEY_NAME = getKeyName(provs[0]);

  const coproMap={}; copros.forEach(c=>coproMap[getKeyVal(c)]=c.Nombre);
  tablaProv.innerHTML = provs.map(p=>{
    const key=getKeyVal(p);
    return `<tr>
      <td>${coproMap[p.CopropiedadID]||"—"}</td>
      <td>${p.Nombre||""}</td>
      <td>${p.RUT||""}</td>
      <td>${p.Giro||""}</td>
      <td>${p.Email||""}</td>
      <td>${p.Telefono||""}</td>
      <td>
        <button class="btn-outline" onclick="abrirForm('${key}')">Editar</button>
        <button class="btn-primary" onclick="eliminar('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  provCopro.innerHTML = copros.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
}

function abrirForm(id){
  modalTitleProv.textContent = id ? "Editar Proveedor" : "Nuevo Proveedor";
  if(id){
    const p = provs.find(x=>String(getKeyVal(x))===String(id));
    if(!p){ alert("No encontrado"); return; }
    provID.value=id;
    provCopro.value=p.CopropiedadID;
    provNombre.value=p.Nombre||"";
    provRUT.value=p.RUT||"";
    provGiro.value=p.Giro||"";
    provEmail.value=p.Email||"";
    provTelefono.value=p.Telefono||"";
  }else{
    formProv.reset(); provID.value="";
  }
  modalProv.classList.add("active");
}
function cerrarForm(){ modalProv.classList.remove("active"); }

formProv.onsubmit = async (e)=>{
  e.preventDefault();
  const id = provID.value || undefined;
  const payload = {
    ...(id?{[KEY_NAME]:id}:{}),
    CopropiedadID: provCopro.value,
    Nombre: provNombre.value.trim(),
    RUT: provRUT.value.trim(),
    Giro: provGiro.value.trim(),
    Email: provEmail.value.trim(),
    Telefono: provTelefono.value.trim()
  };
  if(id) await appSheetCRUD("Proveedores","Edit",[payload]);
  else   await appSheetCRUD("Proveedores","Add",[payload]);
  cerrarForm(); location.reload();
};

async function eliminar(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Proveedores","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

cargar();
</script>
</body>
</html>
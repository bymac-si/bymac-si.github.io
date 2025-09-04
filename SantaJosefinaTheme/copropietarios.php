<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Copropietarios</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Copropietarios</h1>
  <button class="btn-primary" onclick="abrirForm()">+ Nuevo Copropietario</button>

  <table style="margin-top:16px;">
    <thead>
      <tr><th>Copropiedad</th><th>Nombre</th><th>RUT</th><th>Email</th><th>Teléfono</th><th>Acciones</th></tr>
    </thead>
    <tbody id="tablaCo"></tbody>
  </table>
</main>

<div id="modalCo" class="modal">
  <div class="modal-content">
    <h2 id="modalTitle">Nuevo Copropietario</h2>
    <form id="formCo">
      <input type="hidden" id="coID">
      <label>Copropiedad</label><select id="coCopro" required></select>
      <label>Nombre</label><input id="coNombre" required>
      <label>RUT</label><input id="coRUT">
      <label>Email</label><input id="coEmail" type="email">
      <label>Teléfono</label><input id="coTelefono">
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

let copros=[], cops=[], KEY_NAME="ID";

async function cargar(){
  [copros, cops] = await Promise.all([ fetchData("Copropiedades"), fetchData("Copropietarios") ]);
  if(cops.length) KEY_NAME = getKeyName(cops[0]);

  const coproMap={}; copros.forEach(c=>coproMap[getKeyVal(c)] = c.Nombre);
  tablaCo.innerHTML = cops.map(r=>{
    const key=getKeyVal(r);
    return `<tr>
      <td>${coproMap[r.CopropiedadID]||"—"}</td>
      <td>${r.Nombre||""}</td>
      <td>${r.RUT||""}</td>
      <td>${r.Email||""}</td>
      <td>${r.Telefono||""}</td>
      <td>
        <button class="btn-outline" onclick="abrirForm('${key}')">Editar</button>
        <button class="btn-primary" onclick="eliminar('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  coCopro.innerHTML = copros.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
}

function abrirForm(id){
  modalTitle.textContent = id ? "Editar Copropietario" : "Nuevo Copropietario";
  if(id){
    const r = cops.find(x=>String(getKeyVal(x))===String(id));
    if(!r){ alert("No encontrado"); return; }
    coID.value=id;
    coCopro.value=r.CopropiedadID;
    coNombre.value=r.Nombre||"";
    coRUT.value=r.RUT||"";
    coEmail.value=r.Email||"";
    coTelefono.value=r.Telefono||"";
  }else{ formCo.reset(); coID.value=""; }
  modalCo.classList.add("active");
}
function cerrarForm(){ modalCo.classList.remove("active"); }

formCo.onsubmit = async (e)=>{
  e.preventDefault();
  const id = coID.value || undefined;
  const payload = {
    ...(id?{[KEY_NAME]:id}:{}),
    CopropiedadID: coCopro.value,
    Nombre: coNombre.value.trim(),
    RUT: coRUT.value.trim(),
    Email: coEmail.value.trim(),
    Telefono: coTelefono.value.trim()
  };
  if(id) await appSheetCRUD("Copropietarios","Edit",[payload]);
  else   await appSheetCRUD("Copropietarios","Add",[payload]);
  cerrarForm(); location.reload();
};

async function eliminar(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Copropietarios","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

cargar();
</script>
</body>
</html>
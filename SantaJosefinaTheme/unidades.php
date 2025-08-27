<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Unidades</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body>
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Unidades</h1>
  <button class="btn-primary" onclick="abrirForm()">+ Nueva Unidad</button>

  <table style="margin-top:16px;">
    <thead>
      <tr><th>Copropiedad</th><th>N°</th><th>Propietario</th><th>Alicuota (%)</th><th>Acciones</th></tr>
    </thead>
    <tbody id="tablaU"></tbody>
  </table>
</main>

<div id="modalU" class="modal">
  <div class="modal-content">
    <h2 id="modalTitle">Nueva Unidad</h2>
    <form id="formU">
      <input type="hidden" id="uID">
      <label>Copropiedad</label><select id="uCopro" required></select>
      <label>Número</label><input id="uNumero" required>
      <label>Propietario</label><select id="uPropietario" required></select>
      <label>Alicuota (%)</label><input type="number" id="uAlicuota" min="0" step="0.01">
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

let copros=[], units=[], cops=[], KEY_NAME="ID";

async function cargar(){
  [copros, units, cops] = await Promise.all([
    fetchData("Copropiedades"),
    fetchData("Unidades"),
    fetchData("Copropietarios")
  ]);
  if(units.length) KEY_NAME = getKeyName(units[0]);

  const coproMap={}, copropMap={};
  copros.forEach(c=>coproMap[getKeyVal(c)] = c.Nombre);
  cops.forEach(c=>copropMap[getKeyVal(c)] = c.Nombre);

  tablaU.innerHTML = units.map(u=>{
    const key=getKeyVal(u);
    return `<tr>
      <td>${coproMap[u.CopropiedadID]||"—"}</td>
      <td>${u.Numero||""}</td>
      <td>${copropMap[u.PropietarioID]||"—"}</td>
      <td>${u.Alicuota||0}</td>
      <td>
        <button class="btn-outline" onclick="abrirForm('${key}')">Editar</button>
        <button class="btn-primary" onclick="eliminar('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  uCopro.innerHTML = copros.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
  uPropietario.innerHTML = cops.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
}

function abrirForm(id){
  modalTitle.textContent = id ? "Editar Unidad" : "Nueva Unidad";
  if(id){
    const u = units.find(x=>String(getKeyVal(x))===String(id));
    if(!u){ alert("No encontrada"); return; }
    uID.value=id;
    uCopro.value=u.CopropiedadID;
    uNumero.value=u.Numero||"";
    uPropietario.value=u.PropietarioID;
    uAlicuota.value=u.Alicuota||0;
  }else{ formU.reset(); uID.value=""; }
  modalU.classList.add("active");
}
function cerrarForm(){ modalU.classList.remove("active"); }

formU.onsubmit = async (e)=>{
  e.preventDefault();
  const id = uID.value || undefined;
  const payload = {
    ...(id?{[KEY_NAME]:id}:{}),
    CopropiedadID: uCopro.value,
    Numero: uNumero.value.trim(),
    PropietarioID: uPropietario.value,
    Alicuota: parseFloat(uAlicuota.value)||0
  };
  if(id) await appSheetCRUD("Unidades","Edit",[payload]);
  else   await appSheetCRUD("Unidades","Add",[payload]);
  cerrarForm(); location.reload();
};

async function eliminar(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Unidades","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

cargar();
</script>
</body>
</html>
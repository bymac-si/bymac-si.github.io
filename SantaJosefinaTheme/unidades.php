<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Unidades</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Unidades</h1>
  <button class="btn-primary" onclick="abrirForm()">Nueva Unidad</button>

  <table style="margin-top:16px;">
    <thead>
      <tr>
        <th>Copropiedad</th>
        <th>N°</th>
        <th>Propietario</th>
        <th>Alicuota (%)</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody id="tablaU"></tbody>
  </table>
</main>

<div id="modalU" class="modal">
  <div class="modal-content">
    <h2 id="modalTitle">Nueva Unidad</h2>
    <form id="formU">
      <input type="hidden" id="uID">
      <label>Copropiedad</label>
      <select id="uCopro" required></select>
      <label>Número</label>
      <input id="uNumero" required>
      <label>Propietario</label>
      <select id="uPropietario" required></select>
      <label>Alicuota (%)</label>
      <!-- 🔹 Permitimos 3 decimales -->
      <input type="number" id="uAlicuota" min="0" step="0.001">
      <div style="text-align:right;margin-top:10px;">
        <button type="button" class="btn-primary" onclick="cerrarForm()">Cancelar</button>
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

  // 🔹 Mostrar siempre 3 decimales en la tabla
  tablaU.innerHTML = units.map(u=>{
    const key=getKeyVal(u);
    return `<tr>
      <td>${coproMap[u.CopropiedadID]||"—"}</td>
      <td>${u.Numero||""}</td>
      <td>${copropMap[u.PropietarioID]||"—"}</td>
      <td>${(parseFloat(u.Alicuota)||0).toFixed(3)}</td>
      <td>
        <button class="btn-primary" onclick="abrirForm('${key}')">Editar</button>
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
    uAlicuota.value=(parseFloat(u.Alicuota)||0).toFixed(3);
  }else{
    formU.reset();
    uID.value="";
  }
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
    // 🔹 Guardar siempre con 3 decimales
    Alicuota: parseFloat(parseFloat(uAlicuota.value).toFixed(3)) || 0
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
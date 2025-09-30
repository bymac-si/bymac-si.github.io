<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRM - Gastos</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">
<div id="header"></div>

<main style="padding:40px;">
  <h1 class="page-title">Gastos Comunes</h1>
  <button class="btn-primary" onclick="abrirForm()">Nuevo Gasto</button>

  <table style="margin-top:16px;">
    <thead>
      <tr><th>Copropiedad</th><th>Proveedor</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th>Documento</th><th>Obs.</th><th>Acciones</th></tr>
    </thead>
    <tbody id="tablaG"></tbody>
  </table>
</main>

<div id="modalG" class="modal">
  <div class="modal-content">
    <h2 id="modalTitle">Nuevo Gasto</h2>
    <form id="formG">
      <input type="hidden" id="gID">
      <label>Copropiedad</label><select id="gCopro" required></select>
      <label>Proveedor</label><select id="gProv" required></select>
      <label>Tipo de Gasto</label><input id="gTipo" required>
      <label>Monto</label><input type="number" id="gMonto" required>
      <label>Fecha</label><input type="date" id="gFecha" required>
      <label>Documento</label><input id="gDocumento">
      <label>Observaciones</label><textarea id="gObs" rows="3"></textarea>
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

let gastos=[], copros=[], provs=[], KEY_NAME="ID";

function fmtFecha(iso){ return iso? new Date(iso).toLocaleDateString("es-CL"): ""; }

async function cargar(){
  [gastos, copros, provs] = await Promise.all([
    fetchData("Gastos"),
    fetchData("Copropiedades"),
    fetchData("Proveedores")
  ]);
  if(gastos.length) KEY_NAME = getKeyName(gastos[0]);

  const coproMap={}, provMap={};
  copros.forEach(c=>coproMap[getKeyVal(c)]=c.Nombre);
  provs.forEach(p=>provMap[getKeyVal(p)]=p.Nombre);

  tablaG.innerHTML = gastos.map(g=>{
    const key=getKeyVal(g);
    return `<tr>
      <td>${coproMap[g.CopropiedadID]||"—"}</td>
      <td>${provMap[g.ProveedorID]||"—"}</td>
      <td>${g.TipoGasto||""}</td>
      <td>${formatoPrecio(g.Monto)}</td>
      <td>${fmtFecha(g.Fecha)}</td>
      <td>${g.Documento||""}</td>
      <td>${g.Observaciones||""}</td>
      <td>
        <button class="btn-primary" onclick="abrirForm('${key}')">Editar</button>
        <button class="btn-primary" onclick="eliminar('${key}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  gCopro.innerHTML = copros.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
  gProv.innerHTML = provs.map(p=>`<option value="${getKeyVal(p)}">${p.Nombre}</option>`).join("");
}

function abrirForm(id){
  modalTitle.textContent = id ? "Editar Gasto" : "Nuevo Gasto";
  if(id){
    const g = gastos.find(x=>String(getKeyVal(x))===String(id));
    if(!g){ alert("No encontrado"); return; }
    gID.value=id;
    gCopro.value=g.CopropiedadID;
    gProv.value=g.ProveedorID;
    gTipo.value=g.TipoGasto||"";
    gMonto.value=g.Monto||0;
    gFecha.value=g.Fecha||"";
    gDocumento.value=g.Documento||"";
    gObs.value=g.Observaciones||"";
  } else { formG.reset(); gID.value=""; }
  modalG.classList.add("active");
}
function cerrarForm(){ modalG.classList.remove("active"); }

formG.onsubmit = async (e)=>{
  e.preventDefault();
  const id = gID.value || undefined;
  const payload = {
    ...(id?{[KEY_NAME]:id}:{}),
    CopropiedadID: gCopro.value,
    ProveedorID: gProv.value,
    TipoGasto: gTipo.value.trim(),
    Monto: parseFloat(gMonto.value)||0,
    Fecha: gFecha.value,
    Documento: gDocumento.value.trim(),
    Observaciones: gObs.value.trim()
  };
  if(id) await appSheetCRUD("Gastos","Edit",[payload]);
  else   await appSheetCRUD("Gastos","Add",[payload]);
  cerrarForm(); location.reload();
};

async function eliminar(id){
  if(!confirm("¿Eliminar?")) return;
  await appSheetCRUD("Gastos","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

cargar();
</script>
</body>
</html>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CRM Inmobiliario - Marketing</title>
<link rel="stylesheet" href="assets/css/styles.css">
<script src="assets/js/app.js"></script>
<script>
  requireAuth();
</script>
  <script>
  document.addEventListener("DOMContentLoaded", async ()=>{
    // Cargar Header
    const headerResp = await fetch("header.html");
    document.getElementById("header").innerHTML = await headerResp.text();

    // Cargar Footer
    const footerResp = await fetch("footer.html");
    document.getElementById("footer").innerHTML = await footerResp.text();
  });
</script>
</head>
<body style="max-width:1200px; margin: 0 auto;">

<!-- NAV -->
<div id="header"></div>


<!-- CONTENIDO -->
<main style="padding:40px;">
  <h1 style="font-size:28px; font-weight:600; color:#1A2B48; margin-bottom:20px;">
    Estrategias de Marketing
  </h1>

  <button onclick="abrirFormMarketing()" class="btn-primary" style="margin-bottom:20px;">
    + Nueva Campaña
  </button>

  <table>
    <thead>
      <tr>
        <th>Canal</th>
        <th>Clientes Captados</th>
        <th>Presupuesto</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody id="tablaMarketing"></tbody>
  </table>
</main>

<!-- MODAL -->
<div id="modalMarketing" class="modal">
  <div class="modal-content">
    <h2 id="modalTitleMarketing">Nueva Campaña</h2>
    <form id="formMarketing">
      <input type="hidden" id="marketingID">
      <label for="marketingCanal">Canal (Ej: Redes Sociales)</label>
      <input type="text" id="marketingCanal" placeholder="Canal (Ej: Redes Sociales)" required>
      <label for="marketingClientes">Clientes Captados</label>
      <input type="number" id="marketingClientes" placeholder="Clientes Captados">
      <label for="marketingPresupuesto">Presupuesto ($)</label>
      <input type="number" id="marketingPresupuesto" placeholder="Presupuesto ($)">
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
        <button type="button" onclick="cerrarModalMarketing()" class="btn-outline">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<script>
requireAuth();

function formatoCLP(v){ return "$" + new Intl.NumberFormat("es-CL").format(Number(v||0)); }

let marketingGlobal=[];
let KEY_NAME="ID";

async function cargarMarketing(){
  marketingGlobal = await fetchData("Marketing");
  if (marketingGlobal.length) KEY_NAME = getKeyName(marketingGlobal[0]);

  const tbody = document.getElementById("tablaMarketing");
  tbody.innerHTML = marketingGlobal.map(m=>{
    const key = getKeyVal(m);
    const canal = m.Canal ?? "";
    const clientes = m["Clientes Captados"] ?? m.Clientes ?? 0;
    const presupuesto = formatoCLP(m.Presupuesto);
    return `
      <tr>
        <td>${canal}</td>
        <td>${clientes}</td>
        <td>${presupuesto}</td>
        <td>
          <button type="button" class="btn-outline btn-edit" data-id="${key}">Editar</button>
          <button type="button" class="btn-primary" onclick="eliminarMarketing('${key}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join("");

  // Delegación
  tbody.onclick = (e)=>{
    const btn = e.target.closest(".btn-edit");
    if(!btn) return;
    abrirFormMarketing(btn.dataset.id);
  };
}

// Modal
const modal = document.getElementById("modalMarketing");
const form  = document.getElementById("formMarketing");

function abrirFormMarketing(id){
  document.getElementById("modalTitleMarketing").textContent = id ? "Editar Campaña" : "Nueva Campaña";
  if(id){
    const m = marketingGlobal.find(x => String(getKeyVal(x)) === String(id));
    if(!m){ alert("No se encontró la campaña"); return; }
    document.getElementById("marketingID").value = id;
    document.getElementById("marketingCanal").value = m.Canal ?? "";
    document.getElementById("marketingClientes").value = m["Clientes Captados"] ?? m.Clientes ?? 0;
    document.getElementById("marketingPresupuesto").value = m.Presupuesto ?? 0;
  } else {
    form.reset();
    document.getElementById("marketingID").value = "";
  }
  modal.classList.add("active");
}
function cerrarModalMarketing(){ modal.classList.remove("active"); }

form.onsubmit = async (e)=>{
  e.preventDefault();
  const id = document.getElementById("marketingID").value || undefined;

  // Enviamos ambas variantes para el campo de clientes por si el nombre difiere
  const clientesVal = parseInt(document.getElementById("marketingClientes").value || 0, 10);
  const payload = {
    ...(id ? { [KEY_NAME]: id } : {}),
    Canal: document.getElementById("marketingCanal").value.trim(),
    "Clientes Captados": clientesVal,
    Clientes: clientesVal,
    Presupuesto: parseInt(document.getElementById("marketingPresupuesto").value || 0, 10)
  };

  try{
    if(id) await appSheetCRUD("Marketing","Edit",[payload]);
    else   await appSheetCRUD("Marketing","Add",[payload]);
    cerrarModalMarketing();
    location.reload();
  }catch(err){ alert("Error: " + (err.message || err)); }
};

async function eliminarMarketing(id){
  if(!confirm("¿Eliminar esta campaña?")) return;
  await appSheetCRUD("Marketing","Delete",[{[KEY_NAME]:id}]);
  location.reload();
}

cargarMarketing();
</script>
<div id="footer"></div>
</body>
</html>
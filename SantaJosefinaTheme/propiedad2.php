<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CRM Inmobiliario - Propiedades</title>
<link rel="stylesheet" href="css/styles.css">
<script src="js/app.js"></script>
</head>
<body>

<!-- NAV -->
<header>
  <a href="index.html" style="font-weight:700;">Santa Josefina SpA</a>
  <a href="dashboard.html">Dashboard</a>
  <a href="clientes.html">Clientes</a>
  <a href="propiedades.html" class="font-bold">Propiedades</a>
  <a href="visitas.html">Visitas</a>
  <a href="marketing.html">Marketing</a>
  <a href="index.html#contacto" class="btn-outline">Habla con un especialista</a>
</header>

<!-- CONTENIDO -->
<main style="padding:40px;">
  <h1 style="font-size:28px; font-weight:600; color:#1A2B48; margin-bottom:20px;">
    Gestión de Propiedades
  </h1>

  <button onclick="abrirFormPropiedad()" class="btn-primary" style="margin-bottom:20px;">
    + Nueva Propiedad
  </button>

  <table>
    <thead>
      <tr>
        <th>Dirección</th>
        <th>Tipo</th>
        <th>Precio</th>
        <th>Estado</th>
        <th>Imagen</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody id="tablaPropiedades"></tbody>
  </table>
</main>

<!-- MODAL -->
<div id="modalPropiedad" class="modal">
  <div class="modal-content">
    <h2 id="modalTitlePropiedad">Nueva Propiedad</h2>
    <form id="formPropiedad">
      <input type="hidden" id="propiedadID">
      <input type="text" id="propiedadDireccion" placeholder="Dirección" required>
      <input type="text" id="propiedadTipo" placeholder="Tipo (Casa, Depto, etc.)">
      <input type="number" id="propiedadPrecio" placeholder="Precio">
      <input type="text" id="propiedadEstado" placeholder="Estado (Disponible, Vendida)">
      <input type="text" id="propiedadImagen" placeholder="URL Imagen (AppSheet)">
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" onclick="cerrarModalPropiedad()" class="btn-outline">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<script>
// Función para formatear precios en pesos chilenos
function formatoPrecio(valor){
  if(!valor) return "$0";
  return "$" + new Intl.NumberFormat("es-CL").format(valor);
}

let propiedadesGlobal=[];

async function cargarPropiedades(){
  propiedadesGlobal = await fetchData("Propiedades");
  document.getElementById("tablaPropiedades").innerHTML = propiedadesGlobal.map(p=>`
    <tr>
      <td>${p.Direccion}</td>
      <td>${p.Tipo}</td>
      <td>${formatoPrecio(p.Precio)}</td>
      <td>${p.Estado}</td>
      <td><img src="${p.Imagen}" alt="Foto" style="width:80px; border-radius:4px;"></td>
      <td>
        <button onclick="abrirFormPropiedad('${p.ID}')" class="btn-outline">Editar</button>
        <button onclick="eliminarPropiedad('${p.ID}')" class="btn-primary">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

const modalPropiedad = document.getElementById("modalPropiedad");
const formPropiedad = document.getElementById("formPropiedad");

function abrirFormPropiedad(id){
  document.getElementById("modalTitlePropiedad").textContent = id?"Editar Propiedad":"Nueva Propiedad";
  if(id){
    const p = propiedadesGlobal.find(x=>x.ID===id);
    document.getElementById("propiedadID").value = p.ID;
    document.getElementById("propiedadDireccion").value = p.Direccion;
    document.getElementById("propiedadTipo").value = p.Tipo;
    document.getElementById("propiedadPrecio").value = p.Precio;
    document.getElementById("propiedadEstado").value = p.Estado;
    document.getElementById("propiedadImagen").value = p.Imagen;
  } else formPropiedad.reset();
  modalPropiedad.classList.add("active");
}

function cerrarModalPropiedad(){ modalPropiedad.classList.remove("active"); }

formPropiedad.onsubmit = async function(e){
  e.preventDefault();
  const id = document.getElementById("propiedadID").value;
  const data = {
    ID: id || undefined,
    Direccion: document.getElementById("propiedadDireccion").value,
    Tipo: document.getElementById("propiedadTipo").value,
    Precio: document.getElementById("propiedadPrecio").value,
    Estado: document.getElementById("propiedadEstado").value,
    Imagen: document.getElementById("propiedadImagen").value
  };
  try {
    if(id) await appSheetCRUD("Propiedades","Edit",[data]);
    else await appSheetCRUD("Propiedades","Add",[data]);
    cerrarModalPropiedad();
    location.reload();
  } catch(err){ alert("Error: "+err.message); }
}

async function eliminarPropiedad(id){
  if(!confirm("¿Eliminar esta propiedad?")) return;
  await appSheetCRUD("Propiedades","Delete",[{"ID":id}]);
  location.reload();
}

cargarPropiedades();
</script>
</body>
</html>
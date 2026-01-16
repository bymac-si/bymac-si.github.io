// ===== Extracted from propiedad2.html =====

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
        <button onclick="abrirFormPropiedad('${p.ID}')" class="btn-primary">Editar</button>
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

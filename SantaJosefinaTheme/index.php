<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Santa Josefina SpA - Gestión Inmobiliaria</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
</head>
<body>

<!-- NAV -->
<header class="main-header">
  <div class="navbar">
    <!-- Logo -->
    <a href="index.php" class="logo">
      <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/logo_santajosefina.png" alt="Logo Santa Josefina" style="width: 140px; height: auto;">
    </a>

    <!-- Links -->
    <nav class="nav-links">
      <a href="#servicios">Servicios</a>
      <a href="#copropiedad">Copropiedades</a>
      <a href="#contacto">Contacto</a>
      <a href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/dashboard.php" class="btn-outline">Acceso Corporativo</a>
    </nav>
  </div>
</header>

<!-- HERO -->
<section class="hero">
  <div>
    <h2 style="color:#B46A55; font-size:16px; margin-bottom:10px;">Gestión Inmobiliaria Integral</h2>
    <h1 style="font-size:42px; margin-bottom:20px;">Nuestra misión es conectar personas y propiedades</h1>
    <p style="color:#555; margin-bottom:20px;">
      Venta, arriendo y administración de propiedades en todo Chile.<br>
      Soluciones innovadoras para inversionistas, familias y comunidades.
    </p>
    <a href="#contacto" class="btn-primary">Habla con un especialista</a>
  </div>
  <div>
    <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/conecta2.png" alt="Inmobiliaria Santa Josefina">
  </div>
</section>

<!-- PROPIEDADES -->
<section id="propiedades">
  <h2>Propiedades Disponibles</h2>
  <div id="listaPropiedades"></div>
</section>

<!-- SERVICIOS -->
<section id="servicios" style="background:#fafafa;">
  <h2>Nuestros Servicios</h2>
  <ul style="max-width:800px; text-align:left; line-height:1.8; color:#444;">
    <li>Compra y venta de propiedades residenciales y comerciales.</li>
    <li>Arriendos y gestión integral para inversionistas.</li>
    <li>Asesoría legal y financiera en transacciones inmobiliarias.</li>
    <li>Promoción y marketing digital de propiedades.</li>
  </ul>
</section>

<!-- COPROPIEDAD -->
<section id="copropiedad">
  <h2>Administración de Copropiedades</h2>
  <p style="max-width:800px; color:#444;">
    Con la entrada en vigencia de la <strong>Ley N°21.442 de Copropiedad Inmobiliaria</strong>, 
    ofrecemos un servicio de administración profesional de condominios y edificios, asegurando transparencia, eficiencia y cumplimiento normativo.
    <br>Estamos certificados e inscritos en el Registro Nacional de Administradores de Copropiedades del Minvu.
  </p>
  <ul style="max-width:800px; text-align:left; line-height:1.8; color:#444; margin-top:15px;">
    <li>Gestión financiera y contable con reportes claros a la comunidad.</li>
    <li>Mantención preventiva y correctiva de áreas comunes.</li>
    <li>Implementación de protocolos de seguridad y convivencia.</li>
    <li>Asesoría legal en conflictos de copropiedad.</li>
    <li>Plataforma digital para comunicación con residentes.</li>
  </ul>
</section>

<!-- CONTACTO -->
<section id="contacto" style="background:#fafafa;">
  <h2>Contacto</h2>
  <form id="formContacto">
    <input id="contactoNombre" type="text" placeholder="Nombre completo" required>
    <input id="contactoEmail" type="email" placeholder="Correo electrónico" required>
    <input id="contactoTelefono" type="tel" placeholder="Teléfono">
    <textarea id="contactoMensaje" placeholder="Escribe tu consulta..." rows="4" required></textarea>
    <button type="submit" class="btn-primary">Enviar</button>
  </form>
  <p id="msgConfirmacion" style="display:none; color:green; margin-top:15px;">
    ¡Gracias! Tu mensaje ha sido enviado.
  </p>
</section>
<!-- Modal Detalle Propiedad -->
<div id="modalPropiedad" class="modal">
  <div class="modal-content">
    <span onclick="cerrarModal()" style="float:right;cursor:pointer;">&times;</span>
    <h2 id="detalleTitulo"></h2>
    <img id="detalleImagen" src="" alt="Imagen propiedad" style="width:100%;max-height:250px;object-fit:cover;border-radius:6px;margin-bottom:10px;">
    <p><b>Tipo:</b> <span id="detalleTipo"></span></p>
    <p><b>Comuna:</b> <span id="detalleComuna"></span></p>
    <p><b>Región:</b> <span id="detalleRegion"></span></p>
    <p><b>Precio:</b> <span id="detallePrecio"></span></p>
    <p><b>Metros Cuadrados Construidos:</b> <span id="detalleMetrosConstruidos"></span></p>
    <p><b>Metros Cuadrados Totales:</b> <span id="detalleMetrosTotales"></span></p>
    <p><b>Dormitorios:</b> <span id="detalleDormitorios"></span></p>
    <p><b>Baños:</b> <span id="detalleBanos"></span></p>
    <div style="margin-top:15px;text-align:right;">
      <button class="btn-outline" onclick="cerrarModal()">Cerrar</button>
    </div>
  </div>
</div>
<!-- FOOTER -->
<footer>
  <p>&copy; 2025 Santa Josefina SpA - Gestión Inmobiliaria Integral</p>
</footer>

<script>
// Formatea fecha como DD-MM-YYYY
function fechaHoyTexto(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

let propiedadesGlobal = [];

async function cargarPropiedadesLanding(){
  propiedadesGlobal = await fetchData("Propiedades");
  const disponibles = propiedadesGlobal.filter(p=>p.Estado==="Disponible");

  document.getElementById("listaPropiedades").innerHTML = disponibles.map((p,i)=>`
    <div>
      <img src="${p.ImagenURL}" alt="Propiedad" style="width:100%; height:180px; object-fit:cover;">
      <div style="padding:15px;">
        <h3 style="font-size:18px; margin-bottom:5px;">${p.Titulo}</h3>
        <p style="color:#777;">${p.Tipo}</p>
        <p style="color:#777;font-size:0.75em">${p.Comuna}</p>
        <p style="color:#777;font-size:0.75em">${p.Region}</p>
        <p style="font-weight:bold; color:#B46A55; margin:10px 0;">
          ${"$"+new Intl.NumberFormat("es-CL").format(p.Precio)}
        </p><br>
        <a href="javascript:abrirModal(${i})" class="btn-outline">Ver detalle</a>
        <a href="#contacto" class="btn-outline">Solicita más información</a>
<br><br>
      </div>
    </div>
  `).join("");
}

// Abrir modal con detalle de la propiedad seleccionada
function abrirModal(index){
  const p = propiedadesGlobal[index];
  document.getElementById("detalleTitulo").textContent = p.Titulo || "Propiedad";
  document.getElementById("detalleImagen").src = p.ImagenURL || "";
  document.getElementById("detalleTipo").textContent = p.Tipo || "";
  document.getElementById("detalleComuna").textContent = p.Comuna || "";
  document.getElementById("detalleRegion").textContent = p.Region || "";
  document.getElementById("detallePrecio").textContent = "$"+new Intl.NumberFormat("es-CL").format(p.Precio || 0);
  document.getElementById("detalleMetrosConstruidos").textContent = p.MetrosConstruidos || "—";
  document.getElementById("detalleMetrosTotales").textContent = p.MetrosTotales || "—";
  document.getElementById("detalleDormitorios").textContent = p.Dormitorios || "—";
  document.getElementById("detalleBanos").textContent = p.Banos || "—";

  document.getElementById("modalPropiedad").classList.add("active");
}

// Cerrar modal
function cerrarModal(){
  document.getElementById("modalPropiedad").classList.remove("active");
}

cargarPropiedadesLanding();

// Contacto
const formContacto=document.getElementById("formContacto");
formContacto.onsubmit=async(e)=>{
  e.preventDefault();
  const payload={
    Nombre:   document.getElementById("contactoNombre").value.trim(),
    Email:    document.getElementById("contactoEmail").value.trim(),
    Telefono: document.getElementById("contactoTelefono").value.trim(),
    Mensaje:  document.getElementById("contactoMensaje").value.trim(),
    Fecha:    fechaHoyTexto(),
    Estado:   "Nuevo",
    Notas:    ""
  };
  try{
    console.log("Payload enviado a AppSheet:", payload);
    await appSheetCRUD("Contactos","Add",[payload]);
    formContacto.reset();
    document.getElementById("msgConfirmacion").style.display="block";
  }catch(err){
    alert("Error al guardar: "+(err.message||err));
    console.error(err);
  }
};
</script>
</body>
</html>
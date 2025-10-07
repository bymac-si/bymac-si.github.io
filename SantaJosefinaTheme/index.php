<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Santa Josefina SpA - Gestión Inmobiliaria Integral</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Bootstrap -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>

  <!-- Theme -->
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>

  <style>
    :root{
      --brand:#1A2B48;
      --accent:#E74E35;
      --muted:#5B5B5B;
      --line:#e5e7eb;
      --max:1200px;
      --shadow:0 10px 30px rgba(0,0,0,.15);
    }
    html,body{margin:0;padding:0}
    body{
      font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
      color:var(--brand);
      background:#fff;
      max-width:1200px;
      margin:0 auto;
    }
    a{text-decoration:none}
    img{max-width:100%; height:auto; display:block}
    .container-narrow{max-width:var(--max); padding:0 20px; margin:0 auto}

    li{
      list-style-type: square;
      font-weight: 900;
      text-align: left;
    }

    /* HEADER */
    .main-header{position:fixed; inset-inline:0; top:0; z-index:30; background:rgba(255, 255, 255, 0.5); transition:background .25s, box-shadow .25s; height: 150px;}
    .main-header.scrolled{background:rgba(255,255,255,.5); backdrop-filter: saturate(160%) blur(6px); box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .navbar.container-fluid{max-width:var(--max); margin:0 auto; padding:10px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px}
    .nav-links a{margin-left:16px; color:var(--brand); font-weight:600}
    .btn-primary{background:var(--accent); border-color:var(--accent); padding:.6rem 1rem; border-radius:999px; font-weight:700}
    .btn-primary:hover{filter:brightness(.95)}

    /* HERO */
    .hero{
      position:relative; min-height:78vh; display:grid; place-items:center; padding:100px 0 60px;
      background:url("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/administracion-hero.png") center/cover no-repeat;
      isolation:isolate;
    }
    .hero::after{content:""; position:absolute; inset:0; z-index:-1;}
    .hero-wrap{color:#fff; text-shadow:2px 4px 8px rgba(0,0,0,.55);}
    .hero-kicker{color:#fff; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:6px}
    .hero-title{font-weight:900; line-height:.95; font-size: clamp(36px, 6vw, 64px); max-width:1200px; margin:0 0 14px}
    .hero-cta{display:flex; gap:12px; flex-wrap:wrap}

    /* BLOQUE CÍRCULOS + TEXTO */
    .features{padding:48px 0 20px}
    .features-grid{display:grid; gap:60px; grid-template-columns:repeat(12,1); align-items:start}
    .circles{grid-column:1 / span 7; display:flex; gap:60px; flex-wrap:wrap; align-items:center}
    .circle{width:min(240px, 45vw); aspect-ratio:1/1; border-radius:999px; overflow:hidden; border:15px solid #fff; }
    .circle img{width:100%; height:100%; object-fit:cover}
    .features-copy{grid-column:8 / -1}
    .kicker{font-size:14px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin:0 0 8px}
    .h2{font-size: clamp(26px, 3.2vw, 40px); margin:0 0 12px; line-height:1.15}
    .list{display:grid; gap:16px; margin:18px 0 0}
    .item b{display:block; margin-bottom:6px}

    /* PROPIEDADES (GRID) */
    #propiedades{padding:50px 0}
    #propiedades h2{font-weight:800; margin:0 0 18px}
    #listaPropiedades{display:grid; grid-template-columns:repeat(2,minmax(360px,1fr)); gap:30px}
    #listaPropiedades > div{border:0px solid var(--line); border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,.06)}
    #listaPropiedades .card-body{padding:14px}
   

    /* SERVICIOS + CONTACTO */
    #servicios{padding:44px 0; background:#fafafa}
    .services{display:grid; gap:28px; grid-template-columns:1.1fr .9fr; align-items:start}
    .contact{
      display:grid; 
      gap:10px; 
      align-content:start; 
      font-size:16px;
      padding:18px; 
      border:1px solid #eee; 
      border-radius:12px; 
      box-shadow:0 6px 20px rgba(0,0,0,.06);
    }
    .contact a{font-weight:700;}
    .contact .hint{color:var(--muted); font-size:14px;}

    /* COPROPIEDAD */
    #copropiedad{padding:50px 0}
    #copropiedad h2{font-weight:800; margin-bottom:10px}

    /* CONTACTO FORM */
    #contacto{padding:44px 0; background:#fafafa}
    #formContacto{display:grid; gap:10px; max-width:640px}
    #formContacto input,#formContacto textarea{border:1px solid var(--line); border-radius:10px; padding:10px}

    /* MODAL (custom) */
    .modal{display:none; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; align-items:center; justify-content:center}
    .modal.active{display:flex}
    .modal-content{background:#fff; width:min(700px,92vw); border-radius:12px; padding:16px; box-shadow:var(--shadow)}
    .modal-content .btn-primary{float:right}

    /* FOOTER */
    footer{border-top:1px solid #eee; padding:24px 0 40px; color:#fff; font-size:14px}

    /* === Responsive === */
    @media (max-width: 980px) {
      body { padding:0; margin:0; max-width:100%; }
      .container-narrow { padding: 0 12px; }

      /* NAV: ocultar links de escritorio (ya usas d-none d-md-block) */
      .nav-links { display:none !important; }

      /* HERO: pila y separación uniforme */
      .hero { padding:100px 20px 60px; text-align:center; background-position:center; background-size:cover; }
      .hero-wrap { display:flex; flex-direction:column; align-items:center; gap:20px; }
      .hero-cta { width:100%; display:flex; flex-direction:column; align-items:center; gap:20px; }
      .hero-cta .btn { width:80%; max-width:420px; }

      /* FEATURES: pila y 20px entre bloques e ítems */
      .features-grid { display:flex; flex-direction:column; gap:20px; }
      .features .circles, .features { position:static !important; margin:0 auto; }
      .features-copy { margin-bottom: 500px; position: relative;top: -400px; margin: 0 auto; }
      .circles { display:flex; flex-direction:column; align-items:center; gap:20px; }
      .circle { width:90%; max-width:320px; border-width:8px; margin-top: 120px; margin-left: auto; margin-right: auto;}
      .list { display:grid; gap:20px; }

      /* PROPIEDADES: 1 columna */
      #listaPropiedades { grid-template-columns:1fr !important; gap:20px;margin: 0 auto; width: 95%; }
      #listaPropiedades .btn-primary{margin: 0 auto;}

      /* SERVICIOS + CONTACTO */
      .services { display:flex; flex-direction:column; gap:20px; }
      .contact { width:100%; box-shadow:none; border:1px solid #ddd; }

      /* COPROPIEDAD */
      #copropiedad ul { padding-left:20px; }

      /* FORMULARIO CONTACTO: botón al 80% */
      #formContacto { width:90%; margin:0 auto; }
      #formContacto input, #formContacto textarea { width:100%; font-size:16px; }
      #formContacto .btn { width:80%; max-width:420px; margin:0 auto; display:block; }

      /* Botón del bloque contacto (aside) también al 80% */
      #contacto .btn { width:80% !important; max-width:420px; margin:0 auto; display:block; }

      /* MODAL */
      .modal-content { width:92vw; max-height:90vh; overflow-y:auto; }

      /* FOOTER */
      footer { text-align:center; padding:20px 10px; font-size:13px; }
      
      /* Offcanvas: estética de lista */
      .offcanvas .list-group-item{ border:0; padding:12px 0; font-weight:600; color:var(--brand); }
      .offcanvas .btn.btn-primary{ border-radius:999px; font-weight:700; }
    }
  </style>
</head>
<body>

<!-- NAV -->
<header class="main-header" id="mainHeader">
  <div class="navbar container-fluid">
    <!-- Logo -->
    <a class="navbar-brand" href="index.php" aria-label="Inicio">
      <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/logo_santajosefina.png" alt="Santa Josefina" style="width: 140px; height: auto;">
    </a>

    <!-- Botón hamburguesa (solo móvil) -->
    <button
      class="btn d-md-none"
      type="button"
      aria-label="Abrir menú"
      data-bs-toggle="offcanvas"
      data-bs-target="#mobileMenu"
      aria-controls="mobileMenu"
      style="display:flex;align-items:center;gap:8px;border:1px solid #ddd;border-radius:10px;padding:8px 12px;background:#fff;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span style="font-weight:600;color:var(--brand);">Menú</span>
    </button>

    <!-- Links escritorio -->
    <nav class="nav-links d-none d-md-block">
      <a href="#servicios">Servicios</a>
      <a href="#copropiedad">Copropiedades</a>
      <a href="#contacto">Contacto</a>
      <a href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/dashboard.php" class="btn btn-primary text-white">Acceso Corporativo</a>
    </nav>
  </div>
</header>

<!-- Menú móvil (Offcanvas Bootstrap) -->
<div class="offcanvas offcanvas-end" tabindex="-1" id="mobileMenu" aria-labelledby="mobileMenuLabel" style="width:80vw;max-width:360px;">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title" id="mobileMenuLabel" style="display:flex;align-items:center;gap:10px;">
      <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/logo_santajosefina.png" alt="Santa Josefina" style="height:28px;width:auto;">
      <span style="color:var(--brand);font-weight:800;">Santa Josefina</span>
    </h5>
    <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Cerrar"></button>
  </div>
  <div class="offcanvas-body">
    <nav class="list-group list-group-flush" style="gap:8px;display:grid;">
      <a class="list-group-item list-group-item-action" href="#servicios">Servicios</a>
      <a class="list-group-item list-group-item-action" href="#copropiedad">Copropiedades</a>
      <a class="list-group-item list-group-item-action" href="#contacto">Contacto</a>
      <a class="btn btn-primary" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/dashboard.php">Acceso Corporativo</a>
    </nav>
  </div>
</div>

<!-- HERO -->
<section class="hero">
  <div class="container-narrow hero-wrap" style="margin-top:60px">
    <div class="hero-kicker">Gestión Inmobiliaria Integral</div>
    <h1 class="hero-title">SU PROPIEDAD EN LAS MEJORES MANOS</h1>
    <p class="mb-3" style="max-width:60ch">Venta, arriendo y administración de propiedades en todo Chile. Soluciones para inversionistas, familias y comunidades.</p>
    <div class="hero-cta">
      <a href="#contacto" class="btn btn-primary">Habla con un especialista</a>
      <a href="#propiedades" class="btn btn-primary">Ver Propiedades</a>
    </div>
  </div>
</section>

<!-- CÍRCULOS + TEXTO -->
<section class="features container-narrow">
  <div class="features-grid">
    <div class="circles" aria-hidden="true">
      <figure class="circle" style="position: relative; top:-170px;">
        <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/circ-1.jpg" alt="Paisaje urbano">
      </figure>
      <figure class="circle" style="position: relative; top:-250px;">
        <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/circ-2.jpg" alt="Edificio y cúpula">
      </figure>
      <figure class="circle" style="position: relative; top:-330px;">
        <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/circ-3.jpg" alt="Parque empresarial">
      </figure>
    </div>
    <div class="features-copy" style="position: relative; top:-220px;">
      <p class="kicker">lo que nos define</p>
      <h2 class="h2">Transparencia • Proyección • Disponibilidad</h2>
      <div class="list">
        <div class="item">
          <b>TRANSPARENCIA</b>
          <p>Gestión transparente en la administración y ejecución de los gastos comunes.</p>
        </div>
        <div class="item">
          <b>PROYECCIÓN</b>
          <p>Estimamos presupuestos para proyectar el gasto común en períodos semestrales, anuales o bianuales.</p>
        </div>
        <div class="item">
          <b>DISPONIBILIDAD</b>
          <p>Equipo experto en la Ley 21.442, con tiempo dedicado para su comunidad.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PROPIEDADES -->
<section id="propiedades" class="container-narrow" style="position: relative; top:-200px; margin-bottom:-100px;">
  <h2>Propiedades Disponibles</h2>
  <div id="listaPropiedades"></div>
</section>

<!-- SERVICIOS + CONTACTO TARJETA -->
<section id="servicios">
  <div class="container-narrow services">
    <div>
      <h2>Servicios Especializados</h2>
      <p class="text-muted">Santa Josefina SpA se especializa en la Administración de Edificios y Condominios Horizontales acogidos a la Ley 21.442 de Copropiedad Inmobiliaria, brindando a su comunidad apoyo y ventajas diferenciales.</p>
      <ul class="text-muted">
        <li>Compra y venta de propiedades residenciales y comerciales.</li>
        <li>Arriendos y gestión integral para inversionistas.</li>
        <li>Asesoría legal y financiera en transacciones.</li>
        <li>Promoción y marketing digital de propiedades.</li>
      </ul>
    </div>
     <aside id="contacto" class="contact">
      <strong>Hablemos hoy</strong>
      <a href="tel:+56998647190">+56 9 9864 7190</a>
      <a href="mailto:marcos.castro@santajosefinaspa.cl">marcos.castro@santajosefinaspa.cl</a>
      <a href="https://www.santajosefinaspa.cl" target="_blank" rel="noopener">www.santajosefinaspa.cl</a>
      <span class="hint">Respuesta en horario hábil</span>
      <a class="btn btn-primary" style="width: 50%; margin: 0 auto;" href="mailto:marcos.castro@santajosefinaspa.cl?subject=Consulta%20Landing%20Santa%20Josefina">Solicitar propuesta</a>
    </aside>
  </div>
</section>

<!-- COPROPIEDAD -->
<section id="copropiedad" class="container-narrow">
  <h2>Administración de Copropiedades</h2>
  <p class="text-muted" style="max-width:800px">
    Con la entrada en vigencia de la <strong>Ley N°21.442 de Copropiedad Inmobiliaria</strong>, ofrecemos administración profesional de condominios y edificios, asegurando transparencia, eficiencia y cumplimiento normativo. Inscritos en el Registro Nacional de Administradores del Minvu.
  </p>
  <ul class="text-muted" style="max-width:800px">
    <li>Gestión financiera y contable con reportes claros a la comunidad.</li>
    <li>Mantención preventiva y correctiva de áreas comunes.</li>
    <li>Protocolos de seguridad y convivencia.</li>
    <li>Asesoría legal en conflictos de copropiedad.</li>
    <li>Plataforma digital para comunicación con residentes.</li>
  </ul>
</section>

<!-- CONTACTO FORM -->
<section class="container-narrow" style="padding:44px 0">
  <h2>Contáctenos</h2>
  <form id="formContacto">
    <input id="contactoNombre" type="text" placeholder="Nombre completo" required>
    <input id="contactoEmail" type="email" placeholder="Correo electrónico" required>
    <input id="contactoTelefono" type="tel" placeholder="Teléfono">
    <textarea id="contactoMensaje" placeholder="Escribe tu consulta..." rows="4" required></textarea>
    <button type="submit" class="btn btn-primary">Enviar</button>
  </form>
  <p id="msgConfirmacion" style="display:none; color:green; margin-top:15px;">¡Gracias! Tu mensaje ha sido enviado.</p>
</section>

<!-- Modal Detalle Propiedad -->
<div id="modalPropiedad" class="modal" aria-hidden="true">
  <div class="modal-content">
    <button class="btn btn-primary" style="width:50%; margin:0 auto;" onclick="cerrarModal()">Cerrar</button>
    <h1 id="detalleTitulo" style="font-size:24px; font-weight:bold; margin-top:6px;"></h1>
    <img id="detalleImagen" src="" alt="Imagen propiedad" style="width:100%;max-height:250px;object-fit:cover;border-radius:6px;margin-bottom:10px;">
    <p><b>Tipo:</b> <span id="detalleTipo"></span></p>
    <p><b>Comuna:</b> <span id="detalleComuna"></span></p>
    <p><b>Región:</b> <span id="detalleRegion"></span></p>
    <p><b>Precio:</b> <span id="detallePrecio"></span></p>
    <div class="card shadow-sm mb-3">
      <div class="card-header bg-warning text-dark fw-bold">Detalles de la Propiedad</div>
      <div class="card-body p-0">
        <table class="table table-bordered mb-0">
          <tbody>
            <tr>
              <th style="width:75%;"><img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/plan.svg" alt="" style="width:20px;vertical-align:middle;margin-right:6px;">Metros Cuadrados Construidos</th>
              <td id="detalleMetrosConstruidos" style="text-align:center;"></td>
            </tr>
            <tr>
              <th><img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/area.svg" alt="" style="width:20px;vertical-align:middle;margin-right:6px;">Metros Cuadrados Totales</th>
              <td id="detalleMetrosTotales" style="text-align:center;"></td>
            </tr>
            <tr>
              <th><img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/bed.svg" alt="" style="width:20px;vertical-align:middle;margin-right:6px;">Dormitorios</th>
              <td id="detalleDormitorios" style="text-align:center;"></td>
            </tr>
            <tr>
              <th><img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/bathroom.svg" alt="" style="width:20px;vertical-align:middle;margin-right:6px;">Baños</th>
              <td id="detalleBanos" style="text-align:center;"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<footer>
  <div class="container-narrow">
    © <span id="y">2025</span> Santa Josefina SpA · Administración de Edificios y Condominios
  </div>
</footer>

<script>
  // Header translúcido al hacer scroll
  const h = document.getElementById('mainHeader');
  const onScroll = ()=> h.classList.toggle('scrolled', window.scrollY>8);
  document.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // Año dinámico
  document.getElementById('y').textContent = new Date().getFullYear();

  // Fecha (para contacto)
  function fechaHoyTexto(){
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  let propiedadesGlobal = [];

  async function cargarPropiedadesLanding(){
    try{
      propiedadesGlobal = await fetchData("Propiedades");
    }catch(e){ propiedadesGlobal = []; }
    const disponibles = propiedadesGlobal.filter(p=> (p.Estado||"") === "Disponible");

    document.getElementById("listaPropiedades").innerHTML = disponibles.map((p,i)=>`
      <div>
        <img src="${p.ImagenURL||''}" alt="Propiedad" style="width:100%; height:180px; object-fit:cover;">
        <div class="card-body">
          <h3 style="font-size:18px; margin-bottom:5px;">${p.Titulo||'Propiedad'}</h3>
          <p class="text-muted small">${p.Tipo||''} · ${p.Comuna||''} · ${p.Region||''}</p>
          <p class="fw-bold" style="color:#B46A55; margin:8px 0;">
            ${"$"+new Intl.NumberFormat("es-CL").format(p.Precio||0)}
          </p>
          <p class="d-flex gap-2">
            <a href="javascript:abrirModal(${i})" class="btn btn-primary">Ver detalle</a>
            <a href="#contacto" class="btn btn-primary">Solicitar info</a>
          </p>
        </div>
      </div>
    `).join("");
  }

  // Modal detalle
  function abrirModal(index){
    const p = propiedadesGlobal[index] || {};
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
  function cerrarModal(){ document.getElementById("modalPropiedad").classList.remove("active"); }

  cargarPropiedadesLanding();

  // Contacto -> AppSheet
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
      await appSheetCRUD("Contactos","Add",[payload]);
      formContacto.reset();
      document.getElementById("msgConfirmacion").style.display="block";
    }catch(err){
      alert("Error al guardar: "+(err.message||err));
      console.error(err);
    }
  };

  // Cerrar menú móvil al seleccionar una opción
  document.addEventListener('DOMContentLoaded', function(){
    const off = document.getElementById('mobileMenu');
    if (!off) return;
    off.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click', ()=>{
        const inst = bootstrap.Offcanvas.getInstance(off);
        if(inst) inst.hide();
      });
    });
  });
</script>
</body>
</html>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CRM Inmobiliario - Dashboard</title>
<link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
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
<body>

<!-- NAV -->
<div id="header"></div>

<!-- CONTENIDO -->
<main style="padding:40px;">
  <h1 style="font-size:28px; font-weight:600; color:#1A2B48; margin-bottom:20px;">
    Panel de Control
  </h1>

  <!-- KPIs -->
  <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px; margin-bottom:40px;">
    <div style="background:white; padding:20px; border-radius:5px; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
      <h2 style="font-size:16px; color:#555;">Total Clientes</h2>
      <p id="kpiClientes" style="font-size:28px; font-weight:bold; color:#1A2B48;">0</p>
    </div>
    <div style="background:white; padding:20px; border-radius:5px; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
      <h2 style="font-size:16px; color:#555;">Propiedades Disponibles</h2>
      <p id="kpiPropiedades" style="font-size:28px; font-weight:bold; color:#1A2B48;">0</p>
    </div>
    <div style="background:white; padding:20px; border-radius:5px; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
      <h2 style="font-size:16px; color:#555;">Visitas Hoy</h2>
      <p id="kpiVisitas" style="font-size:28px; font-weight:bold; color:#1A2B48;">0</p>
    </div>
  </div>

  <!-- Chart -->
  <div style="background:white; padding:20px; border-radius:5px; box-shadow:0 2px 5px rgba(0,0,0,0.05); max-width:700px;">
    <h2 style="font-size:18px; font-weight:600; margin-bottom:10px; color:#1A2B48;">Clientes captados por canal</h2>
    <div class="chart-container">
  <canvas id="graficoMarketing"></canvas>
</div>
  </div>
</main>

<script>
async function cargarDashboard(){
  // KPIs
  const clientes = await fetchData("Clientes");
  const propiedades = await fetchData("Propiedades");
  const visitas = await fetchData("Visitas");
  const hoy = new Date().toISOString().split("T")[0];

  document.getElementById("kpiClientes").textContent = clientes.length;
  document.getElementById("kpiPropiedades").textContent = propiedades.length;
  document.getElementById("kpiVisitas").textContent = visitas.length;

  // Marketing Chart
  const marketing = await fetchData("Marketing");
  const etiquetas = marketing.map(m=>m.Canal);
  const captados = marketing.map(m=>m["Clientes Captados"]);

  new Chart(document.getElementById("graficoMarketing"),{
    type:"bar",
    data:{labels:etiquetas,datasets:[{label:"Clientes Captados",data:captados,backgroundColor:"#B46A55"}]},
    options:{responsive:true,maintainAspectRatio:false}
  });
}

cargarDashboard();
</script>
<div id="footer"></div>

</body>
</html>
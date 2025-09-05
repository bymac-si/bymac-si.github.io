<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CRM Inmobiliario - Dashboard</title>
<link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-doughnutlabel-rebourne"></script>
<script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
<script>
  requireAuth();
</script>
<script>
  document.addEventListener("DOMContentLoaded", async ()=>{
    const headerResp = await fetch("header.html");
    document.getElementById("header").innerHTML = await headerResp.text();
    const footerResp = await fetch("footer.html");
    document.getElementById("footer").innerHTML = await footerResp.text();
  });
</script>
<style>
.kpi-card{
  background:#ffefc2; padding:20px; border-radius:5px;
  text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);
}
.kpi-card h2{font-size:16px; color:#555;}
.kpi-card p{font-size:28px; font-weight:bold; color:#1A2B48;}
.card h2{font-size:18px; font-weight:600; margin-bottom:10px; color:#1A2B48;}
.gauge-container{
  display:inline-block; width:250px; height:250px; margin:20px;
  text-align:center;
}
.gauge-detail{
  font-size:14px; color:#555; margin-top:4px;
}
</style>
</head>
<body style="max-width:1200px; margin: 0 auto;">

<div id="header"></div>

<main style="padding:40px;" class="container-fluid">
  <h1 style="font-size:28px; font-weight:600; color:#1A2B48; margin-bottom:20px;">
    Panel de Control
  </h1>

  <!-- KPIs -->
  <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px; margin-bottom:40px;">
    <div class="kpi-card" style="background-color:#ddcc99;"><h2>Total Clientes</h2><p id="kpiClientes">0</p></div>
    <div class="kpi-card" style="background-color:#ffcc99;"><h2>Propiedades Disponibles</h2><p id="kpiPropiedades">0</p></div>
    <div class="kpi-card" style="background-color:#eecc77;"><h2>Visitas Agendadas</h2><p id="kpiVisitas">0</p></div>
    <div class="kpi-card" style="background-color:#ddbb77;"><h2>Tareas Pendientes</h2><p id="kpiTareasPendientes">0</p></div>
  </div>

  <!-- Gráficos -->
  <div class="row g-4">
    <div class="col-md-6">
      <div class="card p-3">
        <h2>Embudo de Ventas</h2>
        <canvas id="graficoEmbudo"></canvas>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card p-3">
        <h2>Clientes captados por canal</h2>
        <canvas id="graficoMarketing"></canvas>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card p-3">
        <h2>Tareas por Estado</h2>
        <canvas id="graficoTareasEstado"></canvas>
      </div>
    </div>
    <div class="col-md-12">
      <div class="card p-3">
        <h2>Cumplimiento de Tareas por Agente</h2>
        <!-- Gauge Global -->
        <div style="text-align:center; margin-bottom:30px;">
          <div class="gauge-container">
            <canvas id="gaugeGlobal"></canvas>
            <p><b>Global</b></p>
            <p id="detalleGlobal" class="gauge-detail"></p>
          </div>
        </div>
        <!-- Gauges por usuario -->
        <div id="gaugesUsuarios" style="display:flex;flex-wrap:wrap;justify-content:center;"></div>
		  <p>
			  
		  </p>
		  <p>
			  
		  </p>
      </div>
    </div>
  </div>
</main>

<div id="footer"></div>

<script>
// Normaliza el estado
function normalizarEstado(e){
  if(!e) return "";
  return e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}

// Color dinámico según % cumplimiento
function getGaugeColor(pct){
  if(pct >= 70) return "#66cc66"; // Verde
  if(pct >= 40) return "#ffcc00"; // Amarillo
  return "#ff6666"; // Rojo
}

async function cargarDashboard(){
  const clientes = await fetchData("Clientes");
  const propiedades = await fetchData("Propiedades");
  const visitas = await fetchData("Visitas");
  const tareas = await fetchData("Tareas");
  const marketing = await fetchData("Marketing");
  const agentes = await fetchData("Agentes");

  const agenteMap = {};
  agentes.forEach(a => agenteMap[a.ID] = a.Nombre);

  // KPIs
  document.getElementById("kpiClientes").textContent = clientes.length;
  document.getElementById("kpiPropiedades").textContent = propiedades.length;
  document.getElementById("kpiVisitas").textContent = visitas.length;
  document.getElementById("kpiTareasPendientes").textContent = tareas.filter(t=>normalizarEstado(t.Estado)!=="completada").length;

  // Embudo
  const etapas = ["Prospecto","En Negociación","Reservado","Vendido"];
  const conteo = etapas.map(et => clientes.filter(c=>c.Estado===et).length);
  new Chart(document.getElementById("graficoEmbudo"),{
    type:"bar",
    data:{labels:etapas,datasets:[{data:conteo,backgroundColor:["#ffcc00","#ff9933","#66ccff","#66cc66"]}]},
    options:{indexAxis:"y",plugins:{legend:{display:false}}}
  });

  // Marketing
  new Chart(document.getElementById("graficoMarketing"),{
    type:"bar",
    data:{labels:marketing.map(m=>m.Canal),
          datasets:[{data:marketing.map(m=>m["Clientes Captados"]),backgroundColor:"#B46A55"}]},
    options:{responsive:true,plugins:{legend:{display:false}}}
  });

  // Tareas por estado
  const estados = ["pendiente","en progreso","completada"];
  const etiquetasEstados = ["Pendiente","En Progreso","Completada"];
  const conteoTareas = estados.map(est => tareas.filter(t => normalizarEstado(t.Estado) === est).length);
  new Chart(document.getElementById("graficoTareasEstado"),{
    type:"pie",
    data:{labels:etiquetasEstados,datasets:[{data:conteoTareas,backgroundColor:["#ffcc66","#66ccff","#66cc66"]}]}
  });

  // ===== Cumplimiento Global =====
  const totalGlobal = tareas.length;
  const doneGlobal = tareas.filter(t=>normalizarEstado(t.Estado)==="completada").length;
  const pctGlobal = totalGlobal ? Math.round((doneGlobal/totalGlobal)*100) : 0;
  new Chart(document.getElementById("gaugeGlobal"),{
    type:"doughnut",
    data:{datasets:[{data:[pctGlobal,100-pctGlobal],backgroundColor:[getGaugeColor(pctGlobal),"#e0e0e0"],borderWidth:0}]},
    options:{
      rotation:-90,
      circumference:180,
      cutout:"70%",
      plugins:{legend:{display:false},doughnutLabel:{labels:[{text:pctGlobal+"%",font:{size:24}}]}}
    }
  });
  document.getElementById("detalleGlobal").textContent = `${doneGlobal}/${totalGlobal} tareas`;

  // ===== Cumplimiento por usuario =====
  const usuarios = [...new Set(tareas.map(t=>t.AgenteID))];
  const gaugesDiv = document.getElementById("gaugesUsuarios");
  gaugesDiv.innerHTML = "";
  usuarios.forEach(u=>{
    const total = tareas.filter(t=>t.AgenteID===u).length;
    const done = tareas.filter(t=>t.AgenteID===u && normalizarEstado(t.Estado)==="completada").length;
    const pct = total ? Math.round((done/total)*100) : 0;

    const div = document.createElement("div");
    div.className="gauge-container";
    div.innerHTML=`
      <canvas id="gauge_${u}"></canvas>
      <p style="font-weight:bold;">${agenteMap[u]||"Sin asignar"}</p>
      <p class="gauge-detail">${done}/${total} tareas</p>
    `;
    gaugesDiv.appendChild(div);

    new Chart(document.getElementById(`gauge_${u}`),{
      type:"doughnut",
      data:{datasets:[{data:[pct,100-pct],backgroundColor:[getGaugeColor(pct),"#e0e0e0"],borderWidth:0}]},
      options:{
        rotation:-90,
        circumference:180,
        cutout:"70%",
        plugins:{legend:{display:false},doughnutLabel:{labels:[{text:pct+"%",font:{size:24}}]}}
      }
    });
  });
}

cargarDashboard();
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>

</body>
</html>
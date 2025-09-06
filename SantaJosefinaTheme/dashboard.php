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
<script>requireAuth();</script>
<script>
  document.addEventListener("DOMContentLoaded", async ()=>{
    document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
    document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();
    cargarDashboard();
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
.gauge-detail{font-size:14px; color:#555; margin-top:4px;}
/* Spinner estilo card */
.spinner-backdrop{
  position:fixed; inset:0; background:rgba(255,255,255,0.85);
  display:flex; align-items:center; justify-content:center; z-index:9999;
}
.spinner-card{
  background:#fff; padding:18px 22px; border:1px solid #e5e7eb; border-radius:8px;
  box-shadow:0 6px 18px rgba(0,0,0,.08); text-align:center; min-width:260px;
  color:#1A2B48; font-weight:600;
}
.spinner{
  width:28px; height:28px; border-radius:50%;
  border:3px solid #eee; border-top-color:#B46A55;
  margin:0 auto 10px auto; animation:spin 0.9s linear infinite;
}
@keyframes spin{ to{ transform:rotate(360deg); } }
.hidden{ display:none !important; }
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
    <div class="col-md-6"><div class="card p-3"><h2>Embudo de Ventas</h2><canvas id="graficoEmbudo"></canvas></div></div>
    <div class="col-md-6"><div class="card p-3"><h2>Clientes captados por canal</h2><canvas id="graficoMarketing"></canvas></div></div>
    <div class="col-md-6"><div class="card p-3"><h2>Tareas por Estado</h2><canvas id="graficoTareasEstado"></canvas></div></div>
    <div class="col-md-12">
      <div class="card p-3">
        <h2>Cumplimiento de Tareas por Agente</h2>
        <div style="text-align:center; margin-bottom:30px;">
          <div class="gauge-container">
            <canvas id="gaugeGlobal"></canvas>
            <p><b>Global</b></p>
            <p id="detalleGlobal" class="gauge-detail"></p>
          </div>
        </div>
        <div id="gaugesUsuarios" style="display:flex;flex-wrap:wrap;justify-content:center;"></div>
      </div>
    </div>
  </div>
</main>

<!-- SPINNER -->
<div id="pageSpinner" class="spinner-backdrop hidden" aria-hidden="true">
  <div class="spinner-card">
    <div class="spinner"></div>
    <div id="spinnerText">Cargando Dashboard...</div>
  </div>
</div>

<div id="footer"></div>

<script>
function normalizarEstado(e){
  if(!e) return "";
  return e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}
function getGaugeColor(pct){
  if(pct >= 70) return "#66cc66";
  if(pct >= 40) return "#ffcc00";
  return "#ff6666";
}
function showSpinner(msg){
  const sp=document.getElementById('pageSpinner');
  const txt=document.getElementById('spinnerText');
  if(msg) txt.textContent=msg;
  sp.classList.remove('hidden');
}
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }

async function cargarDashboard(){
  try{
    showSpinner("Cargando Dashboard...");
    const [clientes, propiedades, visitas, tareas, marketing, agentes] = await Promise.all([
      fetchData("Clientes"),
      fetchData("Propiedades"),
      fetchData("Visitas"),
      fetchData("Tareas"),
      fetchData("Marketing"),
      fetchData("Agentes")
    ]);

    const agenteMap = {}; agentes.forEach(a => agenteMap[a.ID] = a.Nombre);

    // KPIs
    kpiClientes.textContent = clientes.length;
    kpiPropiedades.textContent = propiedades.length;
    kpiVisitas.textContent = visitas.length;
    kpiTareasPendientes.textContent = tareas.filter(t=>normalizarEstado(t.Estado)!=="completada").length;

    // Embudo
    const etapas = ["Prospecto","En Negociación","Reservado","Vendido"];
    const conteo = etapas.map(et => clientes.filter(c=>c.Estado===et).length);
    new Chart(graficoEmbudo,{
      type:"bar",
      data:{labels:etapas,datasets:[{data:conteo,backgroundColor:["#ffcc00","#ff9933","#66ccff","#66cc66"]}]},
      options:{indexAxis:"y",plugins:{legend:{display:false}}}
    });

    // Marketing
    new Chart(graficoMarketing,{
      type:"bar",
      data:{labels:marketing.map(m=>m.Canal),
            datasets:[{data:marketing.map(m=>m["Clientes Captados"]),backgroundColor:["#ffcc00","#ff9933","#66ccff","#66cc66","#B46A55"]}]},
      options:{responsive:true,plugins:{legend:{display:false}}}
    });

    // Tareas por estado
    const estados = ["pendiente","en progreso","completada"];
    const etiquetasEstados = ["Pendiente","En Progreso","Completada"];
    const conteoTareas = estados.map(est => tareas.filter(t => normalizarEstado(t.Estado) === est).length);
    new Chart(graficoTareasEstado,{
      type:"pie",
      data:{labels:etiquetasEstados,datasets:[{data:conteoTareas,backgroundColor:["#ffcc66","#66ccff","#66cc66"]}]}
    });

    // Cumplimiento Global
    const totalGlobal = tareas.length;
    const doneGlobal = tareas.filter(t=>normalizarEstado(t.Estado)==="completada").length;
    const pctGlobal = totalGlobal ? Math.round((doneGlobal/totalGlobal)*100) : 0;
    new Chart(gaugeGlobal,{
      type:"doughnut",
      data:{datasets:[{data:[pctGlobal,100-pctGlobal],backgroundColor:[getGaugeColor(pctGlobal),"#e0e0e0"],borderWidth:0}]},
      options:{
        rotation:-90,circumference:180,cutout:"70%",
        plugins:{legend:{display:false},doughnutLabel:{labels:[{text:pctGlobal+"%",font:{size:24}}]}}
      }
    });
    detalleGlobal.textContent = `${doneGlobal}/${totalGlobal} tareas`;

    // Gauges por usuario
    const usuarios = [...new Set(tareas.map(t=>t.AgenteID))];
    gaugesUsuarios.innerHTML = "";
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
      gaugesUsuarios.appendChild(div);

      new Chart(document.getElementById(`gauge_${u}`),{
        type:"doughnut",
        data:{datasets:[{data:[pct,100-pct],backgroundColor:[getGaugeColor(pct),"#e0e0e0"],borderWidth:0}]},
        options:{
          rotation:-90,circumference:180,cutout:"70%",
          plugins:{legend:{display:false},doughnutLabel:{labels:[{text:pct+"%",font:{size:24}}]}}
        }
      });
    });

  }catch(err){
    alert("Error al cargar dashboard: " + (err.message||err));
  }finally{ hideSpinner(); }
}
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CRM Inmobiliario - Dashboard</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-doughnutlabel-rebourne"></script>
<script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
<script>requireAuth();</script>
<script>
  document.addEventListener("DOMContentLoaded", async ()=>{
    document.getElementById("header").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/header.html")).text();
    document.getElementById("footer").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/footer.html")).text();
    cargarDashboard();
  });
</script>
<style>
.kpi-card{
  background:#ffefc2; padding:20px; border-radius:5px;
  text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);
}
.kpi-card h2{font-size:20px; color:#555;}
.kpi-card p{font-size:48px; font-weight:bold; color:#1A2B48;}
.card h2{font-size:18px; font-weight:600; margin-bottom:10px; color:#1A2B48;}
.gauge-container{ display:inline-block; width:250px; height:250px; margin:20px; text-align:center; }
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
.badge-agent{
  display:inline-block; padding:2px 8px; border-radius:12px; color:#fff; font-size:12px;
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
  <div id="kpiContainer" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px; margin-bottom:40px;">
    <div class="kpi-card"><h2>Total Clientes</h2><p id="kpiClientes">0</p></div>
    <div class="kpi-card"><h2>Propiedades Disponibles</h2><p id="kpiPropiedades">0</p></div>
    <div class="kpi-card"><h2>Visitas Agendadas</h2><p id="kpiVisitas">0</p></div>
    <div class="kpi-card"><h2>Tareas Pendientes</h2><p id="kpiTareasPendientes">0</p></div>
  </div>

  <!-- Tabla de Visitas Futuras -->
  <div class="card p-3" style="margin-bottom:40px;">
    <h2>Visitas Próximas</h2>
    <table style="width:100%; margin-top:12px; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px;">Cliente</th>
          <th style="text-align:left; padding:8px;">Propiedad</th>
          <th style="text-align:left; padding:8px;">Fecha</th>
          <th style="text-align:left; padding:8px;">Agente</th>
        </tr>
      </thead>
      <tbody id="tablaVisitasFuturas"></tbody>
    </table>
  </div>

  <!-- Gráficos -->
  <div class="row g-4">

    <div class="col-6"><div class="card p-3"><h2>Embudo de Ventas</h2><canvas id="graficoEmbudo"></canvas></div></div>
    <div class="col-6"><div class="card p-3"><h2>Clientes captados por canal</h2><canvas id="graficoMarketing"></canvas></div></div>
  </div>
  <div class="row g-4" style="margin:20px -10px;">
    <div class="col-6"><div class="card p-3"><h2>Tareas por Estado</h2><canvas id="graficoTareasEstado"></canvas></div></div>
    <div class="col-6"><div class="card p-3"><h2>Tareas Pendientes por Agente</h2><canvas id="graficoTareasAgente"></canvas></div></div>
  </div>

  <!-- Tabla de Tareas Pendientes -->
  <div class="card p-3" style="margin:40px 0;">
    <h2>Tareas Pendientes</h2>
    <table style="width:100%; margin-top:12px; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px;">Título</th>
          <th style="text-align:left; padding:8px;">Agente</th>
          <th style="text-align:left; padding:8px;">Estado</th>
          <th style="text-align:left; padding:8px;">Fecha Límite</th>
        </tr>
      </thead>
      <tbody id="tablaTareasPendientes"></tbody>
    </table>
  </div>

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
      <div id="gaugesUsuarios" style="display:flex;flex-wrap:wrap;justify-content:center; padding: 0 0 60px 0;"></div>
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
function formatearFechaCL(fechaISO){
  if(!fechaISO) return "";
  const d=new Date(fechaISO);
  return d.toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"});
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

    const clienteMap={}; clientes.forEach(c=>clienteMap[c.ID]=c.Nombre);
    const propMap={}; propiedades.forEach(p=>propMap[p.ID]=p.Direccion);
    const agenteMap={}; agentes.forEach(a=>agenteMap[a.ID]=a.Nombre);

    // === Paleta de colores unificada ===
    const baseColors = ["#ffcc00","#ff9933","#66cc66","#66ccff","#B46A55"];

    // === KPIs dinámicos con la misma paleta ===
    const kpiCards = document.querySelectorAll("#kpiContainer .kpi-card");
    kpiCards.forEach((card, i)=>{
      card.style.backgroundColor = baseColors[i % baseColors.length];
    });

    // === Colores fijos por agente ===
    const colorAgente={};
    agentes.forEach((a,i)=>{ colorAgente[a.ID]=baseColors[i%baseColors.length]; });

    // === KPIs valores ===
    kpiClientes.textContent = clientes.length;
    kpiPropiedades.textContent = propiedades.length;

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const visitasFuturas = visitas.filter(v=>{
      const f=new Date(v.Fecha || v["Fecha Visita"]);
      return !isNaN(f) && f>=hoy;
    }).sort((a,b)=> new Date(a.Fecha||a["Fecha Visita"]) - new Date(b.Fecha||b["Fecha Visita"]));
    kpiVisitas.textContent = visitasFuturas.length;
    kpiTareasPendientes.textContent = tareas.filter(t=>normalizarEstado(t["Estado"])!=="completada").length;

    // === Tabla Visitas Futuras ===
    const tbody = document.getElementById("tablaVisitasFuturas");
    tbody.innerHTML = visitasFuturas.length
      ? visitasFuturas.map(v=>{
          const fecha = formatearFechaCL(v.Fecha || v["Fecha Visita"]);
          return `<tr>
            <td style="padding:6px;">${clienteMap[v.Cliente]||"—"}</td>
            <td style="padding:6px;">${propMap[v.Propiedad]||"—"}</td>
            <td style="padding:6px;">${fecha}</td>
            <td style="padding:6px;">${agenteMap[v.Agente]||v.Agente||"—"}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="4" style="text-align:center; color:#888; padding:10px;">No hay visitas próximas</td></tr>`;

    // === Embudo ===
    const etapas = ["Prospecto","En Negociación","Reservado","Vendido"];
    const conteo = etapas.map(et => clientes.filter(c=>c["Estado"]===et).length);
    new Chart(graficoEmbudo,{
      type:"bar",
      data:{labels:etapas,datasets:[{data:conteo,backgroundColor:baseColors.slice(0,etapas.length)}]},
      options:{indexAxis:"y",plugins:{legend:{display:false}}}
    });

    // === Marketing ===
    new Chart(graficoMarketing,{
      type:"bar",
      data:{
        labels:marketing.map(m=>m["Canal"]),
        datasets:[{
          data:marketing.map(m=>m["Clientes Captados"] || m["Clientes"] || 0),
          backgroundColor:baseColors
        }]
      },
      options:{responsive:true,plugins:{legend:{display:false}}}
    });

    // === Tareas por estado ===
    const estados = ["pendiente","en progreso","completada"];
    const etiquetasEstados = ["Pendiente","En Progreso","Completada"];
    const conteoTareas = estados.map(est => tareas.filter(t => normalizarEstado(t["Estado"]) === est).length);
    new Chart(graficoTareasEstado,{
      type:"pie",
      data:{labels:etiquetasEstados,datasets:[{data:conteoTareas,backgroundColor:baseColors.slice(0,3)}]}
    });

    // === Tareas PENDIENTES por agente ===
    const pendientes = tareas.filter(t=>normalizarEstado(t["Estado"])!=="completada");
    const agentesUnicos = [...new Set(pendientes.map(t=>t.AgenteID))];
    const etiquetasAgentes = agentesUnicos.map(a=>agenteMap[a]||"Sin asignar");
    const conteoAgentes = agentesUnicos.map(a=>pendientes.filter(t=>t.AgenteID===a).length);
    const coloresAgentes = agentesUnicos.map(a=>colorAgente[a]||"#ccc");
    new Chart(graficoTareasAgente,{
      type:"pie",
      data:{labels:etiquetasAgentes,datasets:[{data:conteoAgentes,backgroundColor:coloresAgentes}]}
    });

    // === Tabla Tareas Pendientes ===
    const tbodyTar = document.getElementById("tablaTareasPendientes");
    tbodyTar.innerHTML = pendientes.length
      ? pendientes.map(t=>{
          const color = colorAgente[t.AgenteID]||"#999";
          return `<tr>
            <td style="padding:6px;">${t["Título"]||"—"}</td>
            <td style="padding:6px;"><span class="badge-agent" style="background:${color};">${agenteMap[t.AgenteID]||"Sin asignar"}</span></td>
            <td style="padding:6px;">${t["Estado"]||"Pendiente"}</td>
            <td style="padding:6px;">${formatearFechaCL(t.FechaLimite||t["Fecha Límite"])}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="4" style="text-align:center; color:#888; padding:10px;">No hay tareas pendientes</td></tr>`;

    // === Cumplimiento Global ===
    const totalGlobal = tareas.length;
    const doneGlobal = tareas.filter(t=>normalizarEstado(t["Estado"])==="completada").length;
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

    // === Gauges por usuario ===
    const usuarios = [...new Set(tareas.map(t=>t.AgenteID))];
    gaugesUsuarios.innerHTML = "";
    usuarios.forEach(u=>{
      const total = tareas.filter(t=>t.AgenteID===u).length;
      const done = tareas.filter(t=>t.AgenteID===u && normalizarEstado(t["Estado"])==="completada").length;
      const pct = total ? Math.round((done/total)*100) : 0;

      const div = document.createElement("div");
      div.className="gauge-container";
      div.innerHTML=`
        <canvas id="gauge_${u}"></canvas>
        <p style="font-weight:bold; color:${colorAgente[u]||"#333"};">${agenteMap[u]||"Sin asignar"}</p>
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
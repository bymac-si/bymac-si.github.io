<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato Administración de Condominios</title>
  <link rel="stylesheet" href="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/css/styles.css">
  <script src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/js/app.js"></script>
  <script>requireAuth();</script>
</head>
<body>
<div id="header" class="no-print"></div>

<main class="container">
  <h2 class="page-title no-print">Contrato de Administración de Condominios</h2>

  <!-- Controles -->
  <div class="card no-print">
    <div class="row">
      <div>
        <label class="label">Copropiedad</label>
        <select id="selCopro" style="height: 37px; font-size: 14px;"></select>
      </div>
      <div>
        <label class="label">Comuna</label>
        <input id="inpComuna" readonly style="width: 90%;font-size: 14px;">
      </div>
      <div>
        <label class="label">Factor Comuna (TablaTarifas)</label>
        <input id="inpFactor" class="mono" readonly style="width: 90%;font-size: 14px;">
      </div>
      <div>
        <label class="label">N° Unidades</label>
        <input id="inpUnidades" class="mono" readonly style="width: 90%;font-size: 14px;">
      </div>
      <div>
        <label class="label">UTM (CLP)</label>
        <input id="inpUTM" class="mono" placeholder="Ej: 67.000" inputmode="decimal" style="width: 98%;font-size: 14px;">
      </div>
    </div>
    <div class="btns">
      <button class="btn-primary" onclick="window.location.reload()">Actualizar</button>
      <button class="btn-primary" onclick="imprimir()">Imprimir Contrato</button>
    </div>
  </div>

  <!-- Resumen de cálculo -->
  <div class="grid no-print">
    <div class="card">
      <h2 class="section-title">Resumen</h2>
      <p><b>Copropiedad:</b> <span id="cxCopro">—</span></p>
      <p><b>Dirección:</b> <span id="cxDir">—</span></p>
      <p><b>RUT:</b> <span id="cxRUT">—</span></p>
      <p><b>Comuna:</b> <span id="cxComuna">—</span> <span class="badge">Factor: <span id="cxFactor">—</span></span></p>
      <p><b>N° Unidades:</b> <span id="cxUnidades">—</span></p>
      <p><b>UTM:</b> <span id="cxUTM">—</span></p>
    </div>
    <div class="card">
      <h2 class="section-title">Cálculo de Honorarios</h2>
      <p class="small muted">Fórmula aplicada:</p>
      <p class="mono" id="outFormula">—</p>
      <table>
        <tr><th>Neto (CLP)</th>   <td id="outMontoNeto" class="mono">—</td></tr>
        <tr><th>IVA 19%</th>      <td id="outIVA"       class="mono">—</td></tr>
        <tr><th>Total a pagar</th><td id="outTotal"     class="mono">—</td></tr>
      </table>
    </div>
  </div>

  <!-- Contrato -->
  <div class="contrato print-only logo-print print-section" id="areaContrato">
    <div style="font-size:0.8em;">
      <img src="https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/assets/img/logo_santajosefina.png" alt="Logo Santa Josefina" style="width: 140px; position: relative; top: -50px;" class="logo-print">
      <div>
        <div class="small muted logo-print" style="position:relative; top:-75px;">Administración de Edificios y Condominios</div>
      </div><br>
      <div style="position:relative; top:-75px;">
      <h3 class="page-title" style="text-align:center;line-height: 1.5em;">Contrato de Administración de Condominios</h3>
    
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0 18px;">

      <p>En Santiago a <span id="c_fecha_hoy" style="font-weight: bold;">[Fecha]</span>, entre: <b>
        <span id="c_razon">[Nombre de la Comunidad]</span></b>, RUT <span id="c_rut" style="font-weight: bold;">[RUT]</span>, con domicilio en <span id="c_dir" style="font-weight: bold;">[Dirección]</span>, 
        comuna de <span id="c_comuna" style="font-weight: bold;">[Comuna]</span> (en adelante, la “Comunidad”); y <b>Santa Josefina SpA</b>, RUT 77.233.573-3, con domicilio en Santiago, (en adelante, el “Administrador”), 
        se celebra el presente <b>Contrato de Administración de Condominio</b>, sujeto a las siguientes cláusulas:</p>

      <h3 class="stitle">Primera: Objeto</h3>
      <p>La Comunidad contrata al Administrador para la administración integral del condominio <span id="c_razon_2" style="font-weight: bold;">[Nombre de la Comunidad]</span>, ubicado en <span id="c_dir_2" style="font-weight: bold;">[Dirección]</span>, conformado por <span id="c_unidades" style="font-weight: bold;">[Nº Unidades]</span> unidades.</p>

      <h3 class="stitle">Segunda: Honorarios</h3>
      <p>Los honorarios mensuales del Administrador se calcularán conforme a la siguiente regla:</p>
      <ul>
        <li><b>Si el condominio tiene 20 unidades o menos:</b> <span class="mono">FactorComuna × 1,75 × UTM</span>.</li>
        <li><b>Si el condominio tiene más de 20 unidades:</b> <span class="mono">(NºUnidades – 20) × FactorComuna × 1,80 × UTM × 0,013</span>.</li>
      </ul>
      <p>Para este contrato, la comuna es <b><span id="c_comuna_2">[Comuna]</span></b>, con factor <b><span id="c_factor">[Factor]</span></b>, y UTM vigente de <b><span id="c_utm">[UTM]</span></b>.</p>
      <table style="margin:10px 0 6px; font-size:0.65em;">
        <tr><th style="width:180px;">Neto (CLP)</th>       <td id="c_monto_neto" class="mono" style="text-align:right;">[Neto]</td></tr>
        <tr><th>IVA 19%</th>                               <td id="c_monto_iva"  class="mono" style="text-align:right;">[IVA]</td></tr>
        <tr><th>Total a pagar</th>                         <td id="c_monto_tot"  class="mono" style="text-align:right;">[Total]</td></tr>
      </table>

      <h3 class="stitle">Tercera: Obligaciones del Administrador</h3>
      <p>El Administrador realizará la gestión operativa, financiera y administrativa del condominio, de acuerdo con la <b>Ley N°21.442</b> y su reglamento, incluyendo, entre otras, la elaboración de presupuestos, recaudación de gastos comunes, pago a proveedores, mantención preventiva y correctiva, y rendición periódica a la comunidad.</p>

      <h3 class="stitle">Cuarta: Plazo</h3>
      <p>El presente contrato tendrá una duración de <b>12 meses</b>, renovable automáticamente por iguales períodos, salvo aviso en contrario con 30 días de anticipación.</p>

      <h3 class="stitle">Quinta: Terminación</h3>
      <p>Cualquiera de las partes podrá poner término por incumplimiento grave de la otra, mediando comunicación por escrito y otorgando un plazo de 10 días para subsanar.</p>

      <h3 class="stitle">Sexta: Domicilio</h3>
      <p>Para todos los efectos legales, las partes fijan su domicilio en la ciudad de Santiago.</p>
      <br><br><br><br><br><br>
      <div class="firma-grid">
        <div class="firma-box">
          <div class="firma-line"></div>
          <div><b>Representante Comunidad</b></div>
          <div class="small muted" id="c_razon_firma">[Nombre de la Comunidad]</div>
        </div>
        <div class="firma-box" style="text-align: right;position:relative; top:-35px;">
          <div class="firma-line"></div>
          <div><b>Santa Josefina SpA</b></div>
          <div class="small muted">RUT 77.233.573-3</div>
        </div>
      </div>
      </div>
    </div>
  </div>
</main>

<!-- SPINNER -->
<div id="pageSpinner" class="spinner-backdrop hidden" aria-hidden="true">
  <div class="spinner-card">
    <div class="spinner"></div>
    <div id="spinnerText">Cargando datos...</div>
  </div>
</div>

<div id="footer" class="no-print"></div>

<script>
document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("https://santajosefinaspa.cl/wp-content/themes/SantaJosefinaTheme/footer.html")).text();

  // Escribir la fecha con formato "dd de mmmm de yyyy"
  const nodoFecha = document.getElementById("c_fecha_hoy");
  if(nodoFecha) nodoFecha.textContent = fechaHoyTexto();

  await cargarDatos();
});

// Fecha "dd de mmmm de yyyy" (mes en español)
function fechaHoyTexto(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const mmmm = meses[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} de ${mmmm} de ${yyyy}`;
}

function showSpinner(msg){
  const sp=document.getElementById('pageSpinner');
  const txt=document.getElementById('spinnerText');
  if(msg) txt.textContent=msg;
  sp.classList.remove('hidden');
}
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }
function formatoCLP(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }

let COPROS=[], UNIDADES=[], TARIFAS=[];
let coproSel=null, factor=0, nUnidades=0, utmCLP=0;

async function cargarDatos(){
  try{
    showSpinner("Cargando tablas...");
    [COPROS, UNIDADES, TARIFAS] = await Promise.all([
      fetchData("Copropiedades"),
      fetchData("Unidades"),
      fetchData("TablaTarifas")
    ]);

    const sel = document.getElementById("selCopro");
    sel.innerHTML = COPROS.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
    sel.onchange = onSelectCopro;

    if(COPROS.length){
      sel.value = getKeyVal(COPROS[0]);
      await onSelectCopro();
    }
    document.getElementById("inpUTM").addEventListener("input", calcular);
  }catch(err){
    alert("Error al cargar datos: "+(err.message||err));
    console.error(err);
  }finally{
    hideSpinner();
  }
}

async function onSelectCopro(){
  const id = document.getElementById("selCopro").value;
  coproSel = COPROS.find(c=> String(getKeyVal(c))===String(id));
  if(!coproSel) return;

  document.getElementById("cxCopro").textContent = coproSel.Nombre||"—";
  document.getElementById("cxDir").textContent   = coproSel.Direccion||"—";
  document.getElementById("cxRUT").textContent   = coproSel.RUT||"—";
  document.getElementById("cxComuna").textContent= coproSel.Comuna||"—";
  document.getElementById("c_razon").textContent   = coproSel.Nombre||"[Nombre de la Comunidad]";
  document.getElementById("c_razon_2").textContent = coproSel.Nombre||"[Nombre de la Comunidad]";
  document.getElementById("c_razon_firma").textContent = coproSel.Nombre||"[Nombre de la Comunidad]";
  document.getElementById("c_rut").textContent     = coproSel.RUT||"[RUT]";
  document.getElementById("c_dir").textContent     = coproSel.Direccion||"[Dirección]";
  document.getElementById("c_dir_2").textContent   = coproSel.Direccion||"[Dirección]";
  document.getElementById("c_comuna").textContent  = coproSel.Comuna||"[Comuna]";
  document.getElementById("c_comuna_2").textContent= coproSel.Comuna||"[Comuna]";

  document.getElementById("inpComuna").value = coproSel.Comuna||"";

  const tarifa = TARIFAS.find(t => (t.Comuna||"").toLowerCase().trim() === (coproSel.Comuna||"").toLowerCase().trim());
  factor = tarifa ? Number(tarifa.Factor||0) : 0;
  document.getElementById("inpFactor").value = factor || "";
  document.getElementById("cxFactor").textContent = factor || "—";
  document.getElementById("c_factor").textContent = factor || "[Factor]";

  const coproID = getKeyVal(coproSel);
  nUnidades = UNIDADES.filter(u=> String(u.CopropiedadID)===String(coproID)).length;
  document.getElementById("inpUnidades").value = nUnidades;
  document.getElementById("cxUnidades").textContent = nUnidades || "—";
  document.getElementById("c_unidades").textContent = nUnidades || "[Nº Unidades]";

  calcular();
}

/* Fórmulas:
   - Si nUnidades <= 20: Neto = Factor × 1,75 × UTM
   - Si nUnidades  > 20: Neto = (nUnidades – 20) × Factor × 1,80 × UTM × 0,013
   - IVA = 19% del Neto
   - Total = Neto + IVA
*/
function calcular(){
  utmCLP = parseFloat((document.getElementById("inpUTM").value||"").toString().replaceAll(".","").replace(",", ".")) || 0;

  document.getElementById("cxUTM").textContent = utmCLP>0 ? formatoCLP(utmCLP) : "—";
  document.getElementById("c_utm").textContent = utmCLP>0 ? formatoCLP(utmCLP) : "[UTM]";

  let neto = 0, iva = 0, total = 0, desc = "—";

  if(factor>0 && utmCLP>0 && nUnidades>=0){
    if(nUnidades <= 20){
      neto = factor * 1.75 * utmCLP;
      desc = `FactorComuna × 1,75 × UTM`;
    } else {
      const extra = nUnidades - 20;
      neto = extra * factor * 1.80 * utmCLP * 0.013;
      desc = `(${nUnidades} - 20) × FactorComuna × 1,80 × UTM × 0,013`;
    }
  }
  neto = Math.round(neto);
  iva  = Math.round(neto * 0.19);
  total= Math.round(neto + iva);

  document.getElementById("outFormula").textContent = desc;
  document.getElementById("outMontoNeto").textContent = formatoCLP(neto);
  document.getElementById("outIVA").textContent       = formatoCLP(iva);
  document.getElementById("outTotal").textContent     = formatoCLP(total);

  document.getElementById("c_monto_neto").textContent = formatoCLP(neto);
  document.getElementById("c_monto_iva").textContent  = formatoCLP(iva);
  document.getElementById("c_monto_tot").textContent  = formatoCLP(total);
}

function imprimir(){ window.print(); }
</script>
</body>
</html>
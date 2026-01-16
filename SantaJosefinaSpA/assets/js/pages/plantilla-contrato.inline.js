// ===== Extracted from plantilla-contrato.html =====

requireAuth();

let COPROS=[], TARIFAS=[]; // TARIFAS no se usa aquí, se deja por homogeneidad
let coproSel=null;

function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.classList.remove('hidden'); }
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }
function formatoCLP(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }

async function cargarDatos(){
  try{
    showSpinner("Cargando tablas...");
    [COPROS] = await Promise.all([
      fetchData("Copropiedades")
    ]);
    const sel = document.getElementById("selCopro");
    sel.innerHTML = COPROS.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
    sel.onchange = onSelectCopro;
    if(COPROS.length){ sel.value = getKeyVal(COPROS[0]); await onSelectCopro(); }
    document.getElementById("inpPrecio").addEventListener("input", calcular);
    document.getElementById("selPct").addEventListener("change", calcular);
  }catch(err){ alert("Error al cargar datos: "+(err.message||err)); console.error(err); }
  finally{ hideSpinner(); }
}

document.addEventListener("DOMContentLoaded", cargarDatos);

async function onSelectCopro(){
  const id = document.getElementById("selCopro").value;
  coproSel = COPROS.find(c=> String(getKeyVal(c))===String(id));
  if(!coproSel) return;
  document.getElementById("cxCopro").textContent = coproSel.Nombre||"—";
  document.getElementById("cxDir").textContent   = (coproSel.Direccion||"—");
  document.getElementById("cxComuna").textContent= (coproSel.Comuna||"—");
  document.getElementById("inpDir").value = (coproSel.Direccion||"");
  document.getElementById("inpComuna").value = (coproSel.Comuna||"");
  document.getElementById("c_dir").textContent = (coproSel.Direccion||"[Dirección]");
  document.getElementById("c_comuna").textContent = (coproSel.Comuna||"[Comuna]");
  calcular();
}

function parseCLP(raw){ return parseFloat((raw||"").toString().replaceAll(".","").replace(",","."))||0; }

function calcular(){
  const precio = parseCLP(document.getElementById("inpPrecio").value);
  const pct = parseFloat(document.getElementById("selPct").value||"0");

  document.getElementById("cxPrecio").textContent = precio? formatoCLP(precio): "—";
  document.getElementById("cxPct").textContent = pct? (pct.toString().replace(".",",")+"%") : "—";
  document.getElementById("c_pct").textContent = pct? (pct.toString().replace(".",","")) : "[Pct]";

  let neto = Math.round(precio * (pct/100));
  let iva  = Math.round(neto * 0.19);
  let total= Math.round(neto + iva);

  document.getElementById("outMontoNeto").textContent = formatoCLP(neto);
  document.getElementById("outIVA").textContent       = formatoCLP(iva);
  document.getElementById("outTotal").textContent     = formatoCLP(total);

  document.getElementById("c_monto_neto").textContent = formatoCLP(neto);
  document.getElementById("c_monto_iva").textContent  = formatoCLP(iva);
  document.getElementById("c_monto_tot").textContent  = formatoCLP(total);
}

function imprimir(){ window.print(); }

requireAuth();

let COPROS2=[];
let coproSel2=null;

function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.classList.remove('hidden'); }
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }
function formatoCLP(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }

async function cargarDatos2(){
  try{
    showSpinner("Cargando tablas...");
    [COPROS2] = await Promise.all([
      fetchData("Copropiedades")
    ]);
    const sel = document.getElementById("selCopro2");
    sel.innerHTML = COPROS2.map(c=>`<option value="${getKeyVal(c)}">${c.Nombre}</option>`).join("");
    sel.onchange = onSelectCopro2;
    if(COPROS2.length){ sel.value = getKeyVal(COPROS2[0]); await onSelectCopro2(); }
    document.getElementById("inpCanon").addEventListener("input", calcular2);
    document.getElementById("selPct2").addEventListener("change", calcular2);
  }catch(err){ alert("Error al cargar datos: "+(err.message||err)); console.error(err); }
  finally{ hideSpinner(); }
}

document.addEventListener("DOMContentLoaded", cargarDatos2);

async function onSelectCopro2(){
  const id = document.getElementById("selCopro2").value;
  coproSel2 = COPROS2.find(c=> String(getKeyVal(c))===String(id));
  if(!coproSel2) return;
  document.getElementById("cxCopro2").textContent = coproSel2.Nombre||"—";
  document.getElementById("cxDir2").textContent   = (coproSel2.Direccion||"—");
  document.getElementById("cxComuna2").textContent= (coproSel2.Comuna||"—");
  document.getElementById("inpDir2").value = (coproSel2.Direccion||"");
  document.getElementById("inpComuna2").value = (coproSel2.Comuna||"");
  document.getElementById("c2_dir").textContent = (coproSel2.Direccion||"[Dirección]");
  document.getElementById("c2_comuna").textContent = (coproSel2.Comuna||"[Comuna]");
  calcular2();
}

function parseCLP(raw){ return parseFloat((raw||"").toString().replaceAll(".","").replace(",","."))||0; }

function calcular2(){
  const canon = parseCLP(document.getElementById("inpCanon").value);
  const pct = parseFloat(document.getElementById("selPct2").value||"0");

  document.getElementById("cxCanon").textContent = canon? formatoCLP(canon): "—";
  document.getElementById("cxPct2").textContent = pct? (pct.toString().replace(".",",")+"%") : "—";
  document.getElementById("c2_pct").textContent = pct? (pct.toString().replace(".",","")) : "[Pct]";

  let neto = Math.round(canon * (pct/100));
  let iva  = Math.round(neto * 0.19);
  let total= Math.round(neto + iva);

  document.getElementById("outMontoNeto2").textContent = formatoCLP(neto);
  document.getElementById("outIVA2").textContent       = formatoCLP(iva);
  document.getElementById("outTotal2").textContent     = formatoCLP(total);

  document.getElementById("c2_monto_neto").textContent = formatoCLP(neto);
  document.getElementById("c2_monto_iva").textContent  = formatoCLP(iva);
  document.getElementById("c2_monto_tot").textContent  = formatoCLP(total);
}

function imprimir(){ window.print(); }

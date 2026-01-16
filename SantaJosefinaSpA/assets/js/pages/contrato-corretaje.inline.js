// ===== Extracted from contrato-corretaje.html =====

function showSpinner(msg){ const sp=document.getElementById('pageSpinner'); const txt=document.getElementById('spinnerText'); if(msg) txt.textContent=msg; sp.classList.remove('hidden'); }
function hideSpinner(){ document.getElementById('pageSpinner').classList.add('hidden'); }
function formatoCLP(v){ return "$"+new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }
function deNum(str){ return parseFloat((str||"").toString().replaceAll(".","").replace(",", "."))||0; }

let CLIENTES=[], PROPS=[], clienteSel=null, propSel=null;

document.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("header").innerHTML = await (await fetch("header.html")).text();
  document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text();
  await cargarDatos();
});

async function cargarDatos(){
  try{
    showSpinner("Cargando tablas...");
    [CLIENTES, PROPS] = await Promise.all([ fetchData("Clientes"), fetchData("Propiedades") ]);
    selCliente.innerHTML   = CLIENTES.map(c=>`<option value="${c.ID}">${c.Nombre}</option>`).join("");
    selPropiedad.innerHTML = PROPS.map(p=>`<option value="${p.ID}">${p.Titulo||p.Direccion||("Propiedad "+p.ID)}</option>`).join("");

    selCliente.onchange  = onSelectCliente;
    selPropiedad.onchange= onSelectPropiedad;
    inpPrecio.oninput    = recalcular;
    selComision.onchange = recalcular;

    if(CLIENTES.length){ selCliente.value = CLIENTES[0].ID; onSelectCliente(); }
    if(PROPS.length){ selPropiedad.value = PROPS[0].ID; onSelectPropiedad(); }
  }catch(e){ alert("Error al cargar datos: "+(e.message||e)); }
  finally{ hideSpinner(); }
}

function onSelectCliente(){
  const id = selCliente.value;
  clienteSel = CLIENTES.find(x=>String(x.ID)===String(id));
  cxCliente.textContent = clienteSel?.Nombre||"—";
  cxEmail.textContent   = clienteSel?.Email||"";
  cxFono.textContent    = clienteSel?.Telefono||clienteSel?.["Teléfono"]||"";
  c_nombre.textContent  = clienteSel?.Nombre||"[Nombre Cliente]";
  c_rut.textContent     = clienteSel?.RUT||"[RUT]";
  c_mail.textContent    = clienteSel?.Email||"[Email]";
  c_fono.textContent    = clienteSel?.Telefono||clienteSel?.["Teléfono"]||"[Teléfono]";
  c_nombre_firma.textContent = clienteSel?.Nombre||"[Nombre Cliente]";
}

function onSelectPropiedad(){
  const id = selPropiedad.value;
  propSel = PROPS.find(x=>String(x.ID)===String(id));
  const precio = Number(propSel?.Precio||0);
  inpPrecio.value       = precio? new Intl.NumberFormat("es-CL").format(precio):"";
  cxPrecio.textContent  = precio? formatoCLP(precio):"—";
  cxTitulo.textContent  = propSel?.Titulo||propSel?.Direccion||"—";
  cxDireccion.textContent = propSel?.Direccion||"—";
  cxComuna.textContent  = propSel?.Comuna||"—";
  cxRegion.textContent  = propSel?.Region||"—";
  c_titulo.textContent  = propSel?.Titulo||propSel?.Direccion||"[Título]";
  c_dir.textContent     = propSel?.Direccion||"[Dirección]";
  c_comuna.textContent  = propSel?.Comuna||"[Comuna]";
  c_region.textContent  = propSel?.Region||"[Región]";
  recalcular();
}

function recalcular(){
  const base = deNum(inpPrecio.value);
  const pct  = parseFloat(selComision.value||"0");
  const pctTxt = (pct*100).toFixed(1).replace(".0","")+" %";
  cxComision.textContent = pctTxt;
  c_pct.textContent      = pctTxt;

  const neto  = Math.round(base * pct);
  const iva   = Math.round(neto * 0.19);
  const total = neto + iva;

  outNeto.textContent  = formatoCLP(neto);
  outIVA.textContent   = formatoCLP(iva);
  outTotal.textContent = formatoCLP(total);
  c_neto.textContent   = formatoCLP(neto);
  c_iva.textContent    = formatoCLP(iva);
  c_total.textContent  = formatoCLP(total);
}

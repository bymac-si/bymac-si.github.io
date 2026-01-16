// ===== Extracted from cotizacion-admin-condominio.html =====

// Configuración de la fórmula
    const CONFIG_CALCULO = {
        BASE_UTM_MULTIPLIER: 2.15, // Base 2.15 UTM
        UMBRAL_UNIDADES: 20,      // Hasta 20 unidades es precio base
        EXTRA_PCT: 0.013,         // 1.3% extra por cada unidad adicional
        IVA: 1.19                 // 19% IVA
    };

    /**
     * Función Global de Cálculo de Honorarios
     * Disponible en toda la página como window.calcularMontos
     */
    window.calcularMontos = function(unidades, factor, utm) {
        // 1. Validaciones de seguridad
        if (!factor || factor <= 0 || !utm || utm <= 0) {
            return { neto: 0, iva: 0, total: 0 };
        }

        const { BASE_UTM_MULTIPLIER, UMBRAL_UNIDADES, EXTRA_PCT, IVA } = CONFIG_CALCULO;

        // 2. Calcular base monetaria (F1 en Excel)
        const baseDinero = utm * BASE_UTM_MULTIPLIER;
        let netoTeorico = 0;

        // 3. Aplicar lógica de negocio
        if (unidades < UMBRAL_UNIDADES) {
            // Caso Pequeño (<20): Base * Factor
            netoTeorico = baseDinero * factor;
        } else {
            // Caso Estándar (>=20): (Base + Extra) * Factor
            const unidadesExtra = unidades - UMBRAL_UNIDADES;
            const valorExtra = baseDinero * EXTRA_PCT; 
            const sumaBase = baseDinero + (unidadesExtra * valorExtra);
            
            netoTeorico = sumaBase * factor;
        }

        // 4. Redondeo financiero (al 1.000 más cercano)
        const neto = Math.round(netoTeorico / 1000) * 1000;

        // 5. Cálculo final con IVA
        const total = Math.round(neto * IVA);
        const iva = total - neto;

        return { neto, iva, total };
    };

    // Función mock por si no existe app.js externo con fetchData
    if (typeof window.fetchData === 'undefined') {
        window.fetchData = async function(tabla) { console.warn("Simulando carga de "+tabla); return []; };
    }

/* ===== Utilidades UI ===== */
function showSpinner(msg){ document.getElementById('pageSpinner').style.display='flex'; if(msg) document.getElementById('spinnerText').textContent=msg; }
function hideSpinner(){ document.getElementById('pageSpinner').style.display='none'; }
function clp(v){ return "$" + new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(v||0)); }
function norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim(); }
function cleanRut(r){ return (r||'').toString().replace(/[^0-9kK]/g,'').toUpperCase(); }
function formatRut(r){ const s=cleanRut(r); if(s.length<2) return r||''; const body=s.slice(0,-1), dv=s.slice(-1); return body.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+dv; }
function getKeyVal(obj){ return obj.ID || obj.id || obj.Id; }

/* Read / Boot / Fetch Logic */
function readIncoming(){
  let data=null; try{ data=JSON.parse(sessionStorage.getItem('cotizacionProspecto')||'null');}catch(e){}
  const qs=new URLSearchParams(location.search);
  return {
    prospectoId: (data?.prospectoId)||qs.get('prospectoId')||null,
    nombre: (data?.nombre)||qs.get('nombre')||'',
    comuna: (data?.comuna)||qs.get('comuna')||'',
    unidades: (data?.unidades)||Number(qs.get('unidades')||0),
    direccion: (data?.direccion)||qs.get('direccion')||'',
    rut: (data?.rut)||qs.get('rut')||'',
    factor: (data?.factor??(qs.get('factor')?Number(qs.get('factor')):null)),
    utm: (data?.utm??(qs.get('utm')?Number(qs.get('utm')):null)),
  };
}

let TARIFAS=[], PROSPECTOS=[], COPROS=[];
let origen='prospecto', entidadSel=null, factor=0, nUnidades=0, utmCLP=0;

function updatePrintResumen(neto, iva, total){ /* Compatibilidad */ }
window.updatePrintResume = updatePrintResumen; 
async function safeFetch(table){ try{ return await fetchData(table); }catch(e){ return []; } }

async function boot(){
  showSpinner('Cargando...');
  try{
    [TARIFAS, PROSPECTOS, COPROS] = await Promise.all([safeFetch('TablaTarifas'), safeFetch('ProspectosCopro'), safeFetch('Copropiedades')]);
    
    const selOrigen=document.getElementById('selOrigen');
    const selEntidad=document.getElementById('selEntidad');
    selOrigen.onchange=()=>{ origen=selOrigen.value; renderEntidadOptions(); onEntidadChange(); };
    selEntidad.onchange=()=>onEntidadChange();

    renderEntidadOptions();
    const it=readIncoming();
    if(it.prospectoId){
       const idx=[...selEntidad.options].findIndex(o=>String(o.value)===String(it.prospectoId));
       if(idx>=0) selEntidad.selectedIndex=idx;
    }
    onEntidadChange(it);

    document.getElementById('inpUTM').addEventListener('input', ()=>{
      const raw=(document.getElementById('inpUTM').value||'').replaceAll('.','').replace(',','.');
      utmCLP=parseFloat(raw)||0;
      document.getElementById('cxUTM').textContent=utmCLP>0?clp(utmCLP):'—';
      renderHonorarios();
    });
  }catch(e){ alert('Error: '+e.message); }finally{ hideSpinner(); }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  try{ document.getElementById('header').innerHTML = await (await fetch('header.html')).text(); }catch(e){}
  try{ document.getElementById('footer').innerHTML = await (await fetch('footer.html')).text(); }catch(e){}
  boot();
});

function renderEntidadOptions(){
  const sel=document.getElementById('selEntidad');
  let items=(origen==='prospecto'&&PROSPECTOS.length)?PROSPECTOS:COPROS;
  sel.innerHTML=items.map(x=>`<option value="${getKeyVal(x)}">${x.Nombre||x.RazonSocial||'—'}</option>`).join('');
}

function onEntidadChange(prefill){
  const sel=document.getElementById('selEntidad');
  const list=(origen==='prospecto'&&PROSPECTOS.length)?PROSPECTOS:COPROS;
  entidadSel=list.find(x=>String(getKeyVal(x))===String(sel.value))||null;

  const nombre = prefill?.nombre ?? entidadSel?.Nombre ?? entidadSel?.RazonSocial ?? '—';
  const comuna = prefill?.comuna ?? entidadSel?.Comuna ?? '—';
  const dir    = prefill?.direccion ?? entidadSel?.Direccion ?? entidadSel?.Dirección ?? '—';
  const rutRaw = prefill?.rut ?? entidadSel?.RUT ?? '—';
  const rutFmt = (rutRaw && rutRaw!=='—') ? formatRut(rutRaw) : '—';
  
  const rawUnidades = prefill?.unidades ?? entidadSel?.Unidades ?? entidadSel?.NUnidades ?? entidadSel?.CantidadUnidades;
  nUnidades = Number(rawUnidades || 0);

  let f=null;
  if(prefill?.factor!=null) f = Number(prefill.factor);
  if(f==null){
    const t = TARIFAS.find(tt => norm(tt.Comuna)===norm(comuna));
    f = t ? Number(t.Factor||0) : 0;
  }
  factor = f;
  if(prefill?.utm!=null){ utmCLP = Number(prefill.utm)||0; if(utmCLP>0) document.getElementById('inpUTM').value=utmCLP; }

  document.getElementById('inpComuna').value = comuna;
  document.getElementById('inpDireccion').value = dir;
  document.getElementById('inpRUT').value = rutFmt;
  document.getElementById('inpFactor').value = factor || '';
  
  const inpU = document.getElementById('inpUnidades');
  inpU.value = nUnidades || ''; 
  if(nUnidades > 0) {
      inpU.readOnly = true; inpU.style.backgroundColor = ''; inpU.style.border = ''; 
  } else {
      inpU.readOnly = false; inpU.style.backgroundColor = '#fffbeb'; inpU.style.border = '1px solid #aaa';
  }

  document.getElementById('cxNombre').textContent = nombre;
  document.getElementById('cxDir').textContent    = dir;
  document.getElementById('cxComuna').textContent = comuna;
  document.getElementById('cxFactor').textContent = factor || '—';
  document.getElementById('cxUnidades').textContent = nUnidades || '—';

  const printNameEl = document.getElementById('printNombre'); if(printNameEl) printNameEl.textContent = nombre;
  const coverSub = document.getElementById('coverSub'); if(coverSub) coverSub.textContent = nombre ? ('Condominio ' + nombre) : 'Condominio';
  
  renderHonorarios();
}

function renderHonorarios(){
  const tb = document.getElementById('tbodyHonorarios');
  const raw = (document.getElementById('inpUTM').value||'').replaceAll('.','').replace(',','.');
  if(raw) utmCLP = parseFloat(raw)||0;

  if(!(factor>0) || !(utmCLP>0) || !(nUnidades>=0)){
    tb.innerHTML = `<tr><td colspan="6" class="muted">Ingresa UTM...</td></tr>`;
    document.getElementById('cxUTM').textContent = utmCLP>0 ? clp(utmCLP) : '—';
    setPrintTable(0,0,0,nUnidades||0);
    return;
  }
  document.getElementById('cxUTM').textContent = clp(utmCLP);

  const escenarios = [
    { nombre:'Según datos', unidades:nUnidades },
    { nombre:'Simulación 20', unidades:20 },
    { nombre:'Simulación 40', unidades:40 }
  ];

  tb.innerHTML = escenarios.map(sc=>{
    // ¡AHORA SÍ! Llamada a la función integrada en el head
    const m = window.calcularMontos(sc.unidades, factor, utmCLP);
    
    const unit = sc.unidades>0 ? Math.round(m.total / sc.unidades) : 0;
    
    let formula = "";
    if(sc.unidades < 20) formula = `(2,6 × UTM) × Factor`;
    else formula = `[Base + Extra] × Factor`;

    return `<tr>
      <td>${sc.nombre}</td>
      <td class="mono" style="font-size:12px;">${formula}</td>
      <td class="mono" style="text-align:right;">${clp(m.neto)}</td>
      <td class="mono" style="text-align:right;">${clp(m.iva)}</td>
      <td class="mono" style="text-align:right;">${clp(m.total)}</td>
      <td class="mono" style="text-align:right;">${clp(unit)}</td>
    </tr>`;
  }).join('');

  // Actualizar tabla de impresión
  const m0 = window.calcularMontos(nUnidades, factor, utmCLP);
  setPrintTable(m0.neto, m0.iva, m0.total, nUnidades||0);
}

function setPrintTable(neto, iva, total, unidades){
  document.getElementById('p_unidades').textContent = unidades>0 ? unidades : '—';
  document.getElementById('p_neto').textContent = clp(neto);
  document.getElementById('p_total').textContent = clp(total);
  
  const unitTotal = (unidades>0) ? Math.round(total / unidades) : 0;
  const unitNeto  = (unidades>0) ? Math.round(neto  / unidades) : 0;
  const unitIva   = (unidades>0) ? Math.round(iva   / unidades) : 0;
  
  document.getElementById('p_unit').textContent = unitTotal>0 ? clp(unitTotal) : '—';
  document.getElementById('p_unit_neto').textContent = unitNeto>0 ? clp(unitNeto) : '—';
  document.getElementById('p_unit_iva').textContent  = unitIva>0 ? clp(unitIva) : '—';
  document.getElementById('p_unit_total').textContent = unitTotal>0 ? clp(unitTotal) : '—';
}

function actualizarUnidadesManual(val){ nUnidades=Number(val)||0; document.getElementById('cxUnidades').textContent=nUnidades||'—'; renderHonorarios(); }

/* ================== GENERACIÓN DE PDF ================== */
async function compartirPDF(tipo) {
    showSpinner('Generando PDF...');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    document.body.classList.add('generating-pdf');
    
    const element = document.body; 
    const nombreEntidad = entidadSel?.Nombre || entidadSel?.RazonSocial || 'Comunidad';
    const filename = `Propuesta_${nombreEntidad.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    const opt = {
        margin:       10, 
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] } 
    };

    try {
        if (isMobile && navigator.canShare) {
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            const file = new File([pdfBlob], filename, { type: "application/pdf" });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ title: 'Propuesta', text: `Propuesta para ${nombreEntidad}`, files: [file] });
            } else { throw new Error("No sharing support"); }
        } else {
            await html2pdf().set(opt).from(element).save();
            setTimeout(() => {
                alert(`✅ PDF Descargado.\n\nArchivo: "${filename}"`);
                if(tipo === 'whatsapp') window.open(`https://wa.me/`, '_blank');
                else window.location.href = `mailto:?subject=Propuesta ${nombreEntidad}`;
            }, 1000);
        }
    } catch (err) {
        if(isMobile) { alert("Descargando archivo..."); html2pdf().set(opt).from(element).save(); }
        else { console.error(err); alert("Error PDF: " + err.message); }
    } finally {
        document.body.classList.remove('generating-pdf');
        hideSpinner();
    }
}

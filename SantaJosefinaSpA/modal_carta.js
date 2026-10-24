/* modal_carta.js — Modal "Imprimir carta" para prospectos.html (usa ProspectosCopro ya cargados en PROS) */
(function(){
var PLANTILLAS=[{url:"carta_santa_josefina.html",nombre:"Carta de presentación comercial (Administración)"}];
var SEL=new Set(),t=null;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function nrm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function comunidades(){
 var a=(typeof PROS!=="undefined"&&PROS)?PROS:[];
 return a.filter(function(p){return p._tabla==="ProspectosCopro"});
}
var css=document.createElement("style");
css.textContent="#modalCarta .mc-wrap{display:flex;gap:16px;flex-wrap:wrap}#modalCarta .mc-izq{flex:1 1 280px;min-width:260px}#modalCarta .mc-der{flex:2 1 420px;min-width:300px}#mcLista{border:1px solid #d1d5db;border-radius:6px;max-height:330px;overflow-y:auto;margin-top:8px}#mcLista label{display:flex;gap:8px;align-items:flex-start;padding:7px 10px;border-bottom:1px solid #f1f5f9;cursor:pointer;font-size:13px}#mcLista label:hover{background:#f8fafc}#mcLista input{width:auto;margin-top:3px}#mcLista small{color:#64748b}#mcFrame{width:100%;height:480px;border:1px solid #d1d5db;border-radius:6px;background:#d9d6cf}#mcCuenta{font-size:12px;color:#64748b}";
document.head.appendChild(css);

var m=document.createElement("div");
m.id="modalCarta";m.className="modal";m.setAttribute("aria-hidden","true");
m.innerHTML='<div class="modal-content" style="max-width:1040px">'+
 '<h2 style="margin-top:0">Imprimir carta</h2>'+
 '<div class="mc-wrap"><div class="mc-izq">'+
  '<label class="label" for="mcPlantilla">Carta</label><select id="mcPlantilla"></select>'+
  '<label class="label" for="mcBuscar" style="margin-top:10px">Comunidades (ProspectosCopro)</label><input id="mcBuscar" placeholder="Buscar por nombre o comuna…">'+
  '<div id="mcLista"></div>'+
  '<div style="display:flex;gap:8px;margin-top:8px;align-items:center"><button type="button" class="btn-head btn-secundario" id="mcTodas">Marcar visibles</button><button type="button" class="btn-head btn-secundario" id="mcLimpiar">Limpiar</button><span id="mcCuenta"></span></div>'+
 '</div><div class="mc-der"><iframe id="mcFrame" title="Vista previa de la carta"></iframe>'+
 '<p class="muted" style="font-size:12px;margin:6px 0 0">Formato Carta (Letter), una hoja por comunidad. En el diálogo de impresión: escala 100 %, márgenes Ninguno, gráficos de fondo activado.</p></div></div>'+
 '<div style="text-align:right;margin-top:14px"><button type="button" class="btn-head btn-secundario" id="mcCerrar">Cerrar</button> <button type="button" class="btn-head btn-nuevo" id="mcImprimir"><i class="fa-solid fa-print"></i> Imprimir</button></div>'+
'</div>';

function $(id){return document.getElementById(id)}
function lista(){
 var q=nrm($("mcBuscar").value);
 var arr=comunidades().filter(function(p){return !q||nrm((p.Nombre||"")+" "+(p.Comuna||"")).indexOf(q)>-1})
  .sort(function(a,b){return nrm(a.Nombre)<nrm(b.Nombre)?-1:1});
 $("mcLista").innerHTML=arr.length?arr.map(function(p){
  return '<label><input type="checkbox" value="'+esc(p.ID)+'"'+(SEL.has(String(p.ID))?" checked":"")+'><span><b>'+esc(p.Nombre||"(sin nombre)")+'</b><br><small>'+esc(p.Direccion||"—")+' · '+esc(p.Comuna||"—")+'</small></span></label>';
 }).join(""):'<div class="muted" style="padding:12px">Sin comunidades.</div>';
 cuenta();
}
function cuenta(){$("mcCuenta").textContent=SEL.size+" seleccionada(s)"}
function preview(){
 var f=$("mcFrame");f.dataset.listo="0";
 if(!SEL.size){f.srcdoc='<p style="font:14px sans-serif;color:#44546a;padding:24px">Seleccione una o más comunidades para ver la carta.</p>';return}
 f.removeAttribute("srcdoc");
 f.src=$("mcPlantilla").value+"?embed=1&ids="+[...SEL].map(encodeURIComponent).join(",");
}
function diferido(){clearTimeout(t);t=setTimeout(preview,300)}

window.abrirCarta=function(id){
 SEL.clear();if(id!=null&&id!=="")SEL.add(String(id));
 $("mcBuscar").value="";lista();preview();
 m.classList.add("active");m.setAttribute("aria-hidden","false");
};
function cerrar(){m.classList.remove("active");m.setAttribute("aria-hidden","true")}

document.addEventListener("DOMContentLoaded",function(){
 document.body.appendChild(m);
 $("mcPlantilla").innerHTML=PLANTILLAS.map(function(p){return '<option value="'+esc(p.url)+'">'+esc(p.nombre)+'</option>'}).join("");
 $("mcPlantilla").onchange=preview;
 $("mcBuscar").oninput=lista;
 $("mcLista").onchange=function(e){
  var c=e.target;if(!c||c.type!=="checkbox")return;
  c.checked?SEL.add(c.value):SEL.delete(c.value);cuenta();diferido();
 };
 $("mcTodas").onclick=function(){[].forEach.call($("mcLista").querySelectorAll("input"),function(c){SEL.add(c.value);c.checked=true});cuenta();diferido()};
 $("mcLimpiar").onclick=function(){SEL.clear();lista();preview()};
 $("mcCerrar").onclick=cerrar;
 $("mcImprimir").onclick=function(){
  if(!SEL.size)return alert("Seleccione al menos una comunidad.");
  var f=$("mcFrame");
  if(f.dataset.listo!=="1")return alert("La carta aún se está cargando. Intente nuevamente en unos segundos.");
  f.contentWindow.focus();f.contentWindow.print();
 };
 window.addEventListener("message",function(e){
  if(e.origin!==location.origin||!e.data||e.data.tipo!=="carta-lista")return;
  $("mcFrame").dataset.listo="1";
 });
 var acc=document.querySelector(".header-actions"),nuevo=document.getElementById("btnNew");
 if(acc&&nuevo){
  var b=document.createElement("button");
  b.className="btn-head btn-secundario";b.title="Imprimir cartas";
  b.innerHTML='<i class="fa-solid fa-envelope-open-text"></i>';
  b.onclick=function(){window.abrirCarta()};
  acc.insertBefore(b,nuevo);
 }
});
})();

// AppSheet Config
const APP_ID="247b67e5-5b42-49a5-92a1-16c4357f5c7e";
const API_KEY="V2-bKT1n-onhYX-SHl8K-zPPx8-6QwfJ-pp9Pi-UIrcy-gcLGM";

async function appSheetCRUD(tabla, action, rows){
  const url=`https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tabla}/Action`;
  return await fetch(url,{
    method:"POST",
    headers:{
      "ApplicationAccessKey":API_KEY,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({Action:action,Properties:{},Rows:rows})
  }).then(r=>r.json());
}

async function fetchData(tabla){ return await appSheetCRUD(tabla,"Find",[]); }
function formatearFecha(f){ if(!f) return ""; const d=new Date(f); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; }
function formatoPrecio(valor){
  if(!valor) return "$0";
  return "$" + new Intl.NumberFormat("es-CL").format(valor);
}
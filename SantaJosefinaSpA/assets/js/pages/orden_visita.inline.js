// ===== Extracted from orden_visita.html =====

async function cargarOrden(){
  try{
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if(!id){ document.getElementById("contenidoOrden").innerHTML="<p>No se recibió ID de visita</p>"; return; }

    const [visitas, clientes, propiedades] = await Promise.all([
      fetchData("Visitas"),
      fetchData("Clientes"),
      fetchData("Propiedades")
    ]);

    const visita = visitas.find(v=>String(getKeyVal(v))===String(id));
    if(!visita){ document.getElementById("contenidoOrden").innerHTML="<p>Visita no encontrada</p>"; return; }

    const cliente = clientes.find(c=>String(getKeyVal(c))===String(visita.Cliente));
    const propiedad = propiedades.find(p=>String(getKeyVal(p))===String(visita.Propiedad));

    const fecha = visita.Fecha || visita["Fecha Visita"] || "";
    const fechaTexto = fecha ? new Date(fecha).toLocaleDateString("es-CL") : "—";

    document.getElementById("contenidoOrden").innerHTML = `
      <div class="campo"><b>Por esta orden Don(ña):</b> ${cliente?.Nombre||"—"}</div>
      <div class="campo"><b>Fecha:</b> ${fechaTexto}</div>
      <div class="campo"><b>Celular:</b> ${cliente?.Telefono||"—"}</div>
      <div class="campo"><b>Mail:</b> ${cliente?.Email||"—"}</div>

      <h3 style="margin-top:20px;">Visita la siguiente propiedad:</h3>
      <table>
        <tr><th>Dirección</th><th>Comuna</th><th>Región</th><th>Precio</th></tr>
        <tr>
          <td>${propiedad?.Direccion||"—"}</td>
          <td>${propiedad?.Comuna||"—"}</td>
          <td>${propiedad?.Region||"—"}</td>
          <td>${propiedad?.Precio ? "$"+new Intl.NumberFormat("es-CL").format(propiedad.Precio) : "—"}</td>
        </tr>
      </table>

      <h3 style="margin-top:20px;">Opción de Compra</h3>
      <p>☐ Crédito Hipotecario &nbsp;&nbsp; ☐ Contado</p>
    `;
  }catch(err){
    console.error(err);
    document.getElementById("contenidoOrden").innerHTML="<p>Error al generar la orden</p>";
  }finally{
    document.getElementById("pageSpinner").classList.add("hidden");
  }
}
cargarOrden();

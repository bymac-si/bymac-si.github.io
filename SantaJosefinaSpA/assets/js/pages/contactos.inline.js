// ===== Extracted from contactos.html =====

document.addEventListener("DOMContentLoaded", async () => {
        try { 
            document.getElementById("header").innerHTML = await (await fetch("header.html")).text(); 
            if (typeof initHeader === 'function') initHeader();
        } catch (e) {}
        try { 
            document.getElementById("footer").innerHTML = await (await fetch("footer.html")).text(); 
        } catch (e) {}
        
        await cargarBuzon();
      });

      async function cargarBuzon() {
        const spinner = document.getElementById("pageSpinner");
        spinner.style.display = "grid";
        
        try {
            // 1. Cargar DATOS desde ProspectosCorretaje
            const datos = await fetchData("ProspectosCorretaje").catch(() => []);
            
            // 2. FILTRAR: Solo Canal = 'Web Landing'
            // Usamos .includes() para ser más flexibles si escribiste "Web Landing " con espacio
            const leadsWeb = datos.filter(p => (p.Canal || "").includes("Web"));

            // 3. ORDENAR: Más recientes primero
            leadsWeb.sort((a, b) => new Date(b["Fecha Registro"]) - new Date(a["Fecha Registro"]));

            // 4. RENDERIZAR
            renderMensajes(leadsWeb);

        } catch (err) {
            console.error(err);
            alert("Error cargando el buzón.");
        } finally {
            spinner.style.display = "none";
        }
      }

      function renderMensajes(lista) {
          const contenedor = document.getElementById("listaMensajes");
          
          if (lista.length === 0) {
              contenedor.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #cbd5e1;">
                    <i class="fa-regular fa-envelope-open" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No hay mensajes nuevos desde la web.</p>
                </div>`;
              return;
          }

          contenedor.innerHTML = lista.map(lead => {
              // Estilo según estado
              const esNuevo = (lead.Estado === 'Nuevo');
              const claseCard = esNuevo ? 'card-nuevo' : 'card-procesado';
              const labelEstado = esNuevo 
                ? '<span style="color:#166534; font-weight:bold; font-size:11px;">★ NUEVO</span>' 
                : `<span style="color:#64748b; font-size:11px;">${lead.Estado}</span>`;

              return `
              <div class="message-card ${claseCard}">
                  <div class="msg-header">
                      <div>${labelEstado} • ID: ${lead.ID}</div>
                      <div>${formatearFecha(lead["Fecha Registro"])}</div>
                  </div>
                  
                  <div class="msg-name">${lead.Nombre || "Sin Nombre"}</div>
                  
                  <div class="msg-footer">
                      ${lead.Email ? `<a href="mailto:${lead.Email}" class="contact-pill"><i class="fa-regular fa-envelope"></i> ${lead.Email}</a>` : ''}
                      ${lead.Telefono ? `<a href="tel:${lead.Telefono}" class="contact-pill"><i class="fa-solid fa-phone"></i> ${lead.Telefono}</a>` : ''}
                  </div>

                  <div class="msg-body">
                      ${lead.Observaciones || "<span style='font-style:italic; color:#94a3b8;'>Sin mensaje adjunto.</span>"}
                  </div>

                  <div style="margin-top: 15px; text-align: right;">
                      <button onclick="irAGestion('${lead.ID}')" 
                        style="background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: #1a2b48; font-weight: 600; font-size: 13px;">
                          <i class="fa-solid fa-arrow-up-right-from-square"></i> Gestionar en CRM
                      </button>
                  </div>
              </div>
              `;
          }).join("");
      }

      /* Helpers */
      function formatearFecha(fecha) {
          if(!fecha) return "";
          const d = new Date(fecha);
          return d.toLocaleDateString("es-CL", { day: 'numeric', month: 'long', year: 'numeric' });
      }

      // Redirigir a prospectos.html pasando el ID por URL
      function irAGestion(id) {
          window.location.href = `prospectos.html?id=${id}`;
      }

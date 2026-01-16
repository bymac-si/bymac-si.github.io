// ===== Extracted from mobile_propiedades.html =====

let PROPIEDADES = [];
        let VIEW_DATA = [];
        let SELECTED_PROP = null;

        document.addEventListener("DOMContentLoaded", async () => {
            await cargarDatos();
        });

        async function cargarDatos() {
            try {
                const data = await fetchData("Propiedades").catch(()=>[]);
                PROPIEDADES = data || [];
                // Ordenar: Disponibles primero
                PROPIEDADES.sort((a,b) => (a.Estado === 'Disponible' ? -1 : 1));
                
                VIEW_DATA = PROPIEDADES;
                renderLista(VIEW_DATA);
            } catch(e) {
                document.getElementById("listaProps").innerHTML = "<div style='text-align:center; padding:30px;'>Error de conexión</div>";
            }
        }

        function renderLista(lista) {
            const container = document.getElementById("listaProps");
            
            if(lista.length === 0) {
                container.innerHTML = "<div style='text-align:center; padding:40px; color:#94a3b8;'>Sin resultados.</div>";
                return;
            }

            container.innerHTML = lista.map(p => {
                const img = p.ImagenURL || "assets/img/default_prop.jpg";
                const precioFmt = "$" + new Intl.NumberFormat("es-CL").format(p.Precio || 0);
                const badgeColor = p.Operacion === 'Arriendo' ? 'bg-Arriendo' : 'bg-Venta';
                
                return `
                <div class="prop-card" onclick="abrirOpciones('${p.ID}')">
                    <div class="prop-img-container">
                        <img src="${img}" class="prop-img" onerror="this.src='assets/img/default_prop.jpg'">
                        <div class="prop-badge ${badgeColor}">${p.Operacion || 'Venta'}</div>
                        ${p.Estado !== 'Disponible' ? `<div style="position:absolute; bottom:0; left:0; right:0; background:#ef4444; color:white; text-align:center; font-size:11px; font-weight:bold; padding:4px;">${p.Estado}</div>` : ''}
                    </div>
                    <div class="prop-body">
                        <div class="prop-price">${precioFmt}</div>
                        <div class="prop-title">${p.Titulo || "Sin título"}</div>
                        <div class="prop-address"><i class="fa-solid fa-location-dot"></i> ${p.Direccion || ""} • ${p.Comuna || ""}</div>
                        
                        <div class="prop-features">
                            <div class="feat-item"><i class="fa-solid fa-bed"></i> ${p.Dormitorios || 0}</div>
                            <div class="feat-item"><i class="fa-solid fa-bath"></i> ${p.Banos || 0}</div>
                            <div class="feat-item"><i class="fa-solid fa-ruler-combined"></i> ${p.MetrosConstruidos || 0} m²</div>
                        </div>
                    </div>
                </div>`;
            }).join("");
        }

        /* FILTROS */
        function filtrar(criterio, btn) {
            document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');

            if(criterio === 'Todos') {
                VIEW_DATA = PROPIEDADES;
            } else if(['Venta','Arriendo'].includes(criterio)) {
                VIEW_DATA = PROPIEDADES.filter(p => p.Operacion === criterio);
            } else {
                VIEW_DATA = PROPIEDADES.filter(p => p.Tipo === criterio);
            }
            renderLista(VIEW_DATA);
        }

        function filtrarTexto() {
            const q = document.getElementById("inpBuscar").value.toLowerCase();
            VIEW_DATA = PROPIEDADES.filter(p => 
                (p.Titulo||"").toLowerCase().includes(q) || 
                (p.Comuna||"").toLowerCase().includes(q) ||
                (p.Direccion||"").toLowerCase().includes(q)
            );
            renderLista(VIEW_DATA);
        }

        /* OPCIONES */
        function abrirOpciones(id) {
            SELECTED_PROP = PROPIEDADES.find(p => String(p.ID) === String(id));
            if(!SELECTED_PROP) return;

            document.getElementById("sheetTitle").innerText = SELECTED_PROP.Titulo;
            document.getElementById("sheetSubtitle").innerText = `ID: ${SELECTED_PROP.ID} • ${SELECTED_PROP.Estado}`;

            // Configurar WhatsApp Share
            const text = `Hola, te comparto esta propiedad: ${SELECTED_PROP.Titulo} en ${SELECTED_PROP.Comuna}. Precio: $${new Intl.NumberFormat("es-CL").format(SELECTED_PROP.Precio)}`;
            document.getElementById("btnShare").href = `https://wa.me/?text=${encodeURIComponent(text)}`;

            // Configurar Waze (si tiene dirección)
            const direccion = `${SELECTED_PROP.Direccion}, ${SELECTED_PROP.Comuna}`;
            document.getElementById("btnWaze").href = `https://waze.com/ul?q=${encodeURIComponent(direccion)}`;

            document.getElementById("sheetOverlay").classList.add("active");
        }

        function cerrarSheet() {
            document.getElementById("sheetOverlay").classList.remove("active");
        }

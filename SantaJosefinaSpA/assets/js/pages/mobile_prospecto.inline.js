// ===== Extracted from mobile_prospecto.html =====

let AGENTE_ACTUAL = "Sin Asignar";
      let PROSPECTOS_CACHE = [];
      let CURRENT_VIEW = "menu"; // menu, list, form

      document.addEventListener("DOMContentLoaded", () => {
        try {
          if (typeof getAuthUser === "function") {
            const u = getAuthUser();
            if (u && u.Nombre) AGENTE_ACTUAL = u.Nombre;
          }
        } catch (e) {}

        toggleForm("admin");
        switchView("menu"); // Iniciar en menú
      });

      /* === NAVEGACIÓN === */
      function switchView(viewName) {
        CURRENT_VIEW = viewName;

        document.getElementById("viewMenu").classList.add("hidden");
        document.getElementById("viewList").classList.add("hidden");
        document.getElementById("viewForm").classList.add("hidden");
        document.querySelector(".fab-save").classList.add("hidden"); // Ocultar boton flotante si no es form

        const title = document.getElementById("pageTitle");
        const btnBack = document.getElementById("btnBack");

        if (viewName === "menu") {
          document.getElementById("viewMenu").classList.remove("hidden");
          title.innerText = "Gestión Prospectos";
          btnBack.innerHTML = '<i class="fa-solid fa-home"></i>'; // Icono Home para volver al dashboard
        } else if (viewName === "list") {
          document.getElementById("viewList").classList.remove("hidden");
          title.innerText = "Mis Prospectos";
          btnBack.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
          cargarListaMobile();
        } else if (viewName === "form") {
          document.getElementById("viewForm").classList.remove("hidden");
          document.querySelector(".fab-save").classList.remove("hidden");
          title.innerText = "Nuevo Ingreso";
          btnBack.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
        }
      }

      function goBack() {
        if (CURRENT_VIEW === "menu") {
          window.location.href = "mobile_dashboard.html";
        } else {
          switchView("menu");
        }
      }

      /* === LÓGICA DE LISTADO === */
      async function cargarListaMobile() {
        document.getElementById("loader").style.display = "flex";
        try {
          const [admin, corr] = await Promise.all([
            fetchData("ProspectosCopro").catch(() => []),
            fetchData("ProspectosCorretaje").catch(() => []),
          ]);

          // Unir y ordenar por fecha más reciente (manejo seguro de fechas)
          let lista = [...admin, ...corr];
          lista.sort((a, b) => {
              const dateA = a["Fecha Registro"] ? new Date(a["Fecha Registro"]) : new Date(0);
              const dateB = b["Fecha Registro"] ? new Date(b["Fecha Registro"]) : new Date(0);
              return dateB - dateA;
          });

          PROSPECTOS_CACHE = lista;
          renderLista(lista);
        } catch (e) {
          console.error("Error cargando lista:", e);
          document.getElementById("listaContenido").innerHTML =
            '<div style="text-align:center; color: red;">Error cargando datos. Verifique conexión.</div>';
        } finally {
          document.getElementById("loader").style.display = "none";
        }
      }

      function renderLista(lista) {
          const container = document.getElementById('listaContenido');
          if(lista.length === 0) {
              container.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">No hay prospectos recientes.</div>';
              return;
          }

          container.innerHTML = lista.map(p => {
              // Estilo Estado
              let stClass = "st-Nuevo", bgClass = "bg-Nuevo";
              if((p.Estado||"").includes("Negociación")) { stClass="st-Negociacion"; bgClass="bg-Negociacion"; }
              if((p.Estado||"").includes("Ganado")) { stClass="st-Ganado"; bgClass="bg-Ganado"; }

              // Convertimos el objeto a string seguro para pasar al click
              // Usamos el ID para buscar en cache luego, es más seguro
              return `
              <div class="prospect-card ${stClass}" onclick="abrirOpciones('${p.ID}')">
                  <div class="pc-header">
                      <div class="pc-name">${p.Nombre}</div>
                      <div class="pc-badge ${bgClass}">${p.Estado || 'Nuevo'}</div>
                  </div>
                  <div class="pc-meta" style="margin-bottom:5px;">
                      <i class="fa-solid fa-building-user" style="color:#64748b"></i> ${p.Tipo || 'Admin'} 
                      <span style="color:#cbd5e1; margin:0 5px;">|</span> 
                      <span style="font-size:11px;">Toca para gestionar</span>
                  </div>
              </div>`;
          }).join("");
      }

      function filtrarLista() {
        const q = document.getElementById("searchList").value.toLowerCase();
        const filtered = PROSPECTOS_CACHE.filter((p) =>
          (p.Nombre || "").toLowerCase().includes(q)
        );
        renderLista(filtered);
      }

      /* === FUNCIONES DEL FORMULARIO (EXISTENTES) === */
      function toggleForm(mode) {
        const fAdmin = document.getElementById("fieldsAdmin");
        const fCorretaje = document.getElementById("fieldsCorretaje");
        const lblNombre = document.getElementById("lblNombre");

        if (mode === "admin") {
          fAdmin.classList.remove("hidden");
          fCorretaje.classList.add("hidden");
          lblNombre.textContent = "Nombre Condominio / Comunidad";
        } else {
          fAdmin.classList.add("hidden");
          fCorretaje.classList.remove("hidden");
          lblNombre.textContent = "Nombre Cliente";
        }
      }

      function obtenerGPS() {
        const btn = document.getElementById("btnGps");
        const inputLatLong = document.getElementById("latlong");
        if (!navigator.geolocation) return alert("GPS no soportado");

        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Obteniendo...';
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            inputLatLong.value = `${lat}, ${lng}`;
            btn.innerHTML =
              '<i class="fa-solid fa-check"></i> Ubicación Guardada';
            btn.classList.add("active");
          },
          () => {
            btn.innerHTML =
              '<i class="fa-solid fa-triangle-exclamation"></i> Error GPS';
            alert("Error GPS");
          },
          { enableHighAccuracy: true }
        );
      }

      async function intentarGeocodificar() {
        const dir = document.getElementById("direccion").value;
        const com = document.getElementById("comuna").value;
        const latLongField = document.getElementById("latlong");
        const msg = document.getElementById("msgGeo");

        if (document.getElementById("btnGps").classList.contains("active"))
          return;
        if (dir.length < 5) return;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              dir + ", " + com + ", Chile"
            )}`
          );
          const data = await res.json();
          if (data && data.length > 0) {
            latLongField.value = `${data[0].lat}, ${data[0].lon}`;
            msg.style.display = "block";
          } else {
            msg.style.display = "none";
          }
        } catch (e) {}
      }

      function calcularEstimacion() {
        const u = parseInt(document.getElementById("unidades").value) || 0;
        if (u === 0) return;
        let base = 250000;
        if (u > 20) base += (u - 20) * 2000;
        document.getElementById(
          "badgeEstimacion"
        ).textContent = `Est. Honorarios: $${new Intl.NumberFormat(
          "es-CL"
        ).format(base)}`;
      }

      /* === SUBMIT CORREGIDO (CREAR Y EDITAR) === */
      document.getElementById("formProspecto").onsubmit = async (e) => {
        e.preventDefault();
        
        // 1. Validaciones
        const nombre = document.getElementById("nombre").value.trim();
        if (nombre.length < 3) return alert("Nombre requerido");

        document.getElementById("loader").style.display = "flex";

        // 2. Detectar Modo (Nuevo o Edición)
        const editInput = document.getElementById('editId');
        const isEdit = editInput && editInput.value !== "";
        const actionType = isEdit ? "Edit" : "Add";

        // 3. Preparar Variables
        const operacion = document.querySelector('input[name="operacion"]:checked').value;
        const fechaHoy = new Date().toISOString().split("T")[0];
        let payload = {};
        let tablaDestino = "";

        // Estado: Si editamos, mantenemos el actual. Si es nuevo, es "Nuevo".
        const estadoFinal = (isEdit && typeof SELECTED_PROSPECT !== 'undefined') ? SELECTED_PROSPECT.Estado : "Nuevo";

        if (operacion === "Administracion") {
          tablaDestino = "ProspectosCopro";
          
          const idFinal = isEdit ? editInput.value : "PROS_" + Date.now();
          let coordenadas = document.getElementById("latlong").value || "0, 0";
          
          payload = {
            "ID": idFinal,
            "Nombre": nombre,
            "Comuna": document.getElementById("comuna").value,
            "Unidades": document.getElementById("unidades").value,
            "Direccion": document.getElementById("direccion").value,
            "RUT": document.getElementById("rut").value,
            "Contacto": nombre,
            "Estado": estadoFinal,
            "Telefono": document.getElementById("telefono").value,
            "LatLong": coordenadas,
            "Tipo": "Administracion",
            "Email": document.getElementById("email").value,
            "Observaciones": document.getElementById("obs").value,
            "Agente": AGENTE_ACTUAL,
            ...(!isEdit && { "Fecha Registro": fechaHoy })
          };
        } else {
          tablaDestino = "ProspectosCorretaje";
          const idFinal = isEdit ? editInput.value : "PCOR_" + Date.now();

          payload = {
            "ID": idFinal,
            "Estado": estadoFinal,
            "Nombre": nombre,
            "Telefono": document.getElementById("telefono").value,
            "Email": document.getElementById("email").value,
            "Tipo Operacion": operacion,
            "Tipo Propiedad": document.getElementById("tipoPropiedad").value,
            "Presupuesto": document.getElementById("presupuesto").value,
            "Observaciones": document.getElementById("obs").value,
            "Agente": AGENTE_ACTUAL,
            "Canal": "En Terreno",
            ...(!isEdit && { "Fecha Registro": fechaHoy })
          };
        }

        try {
          if (typeof appSheetCRUD === "function") {
            await appSheetCRUD(tablaDestino, actionType, [payload]);
          } else {
            console.warn("Modo offline/simulación");
            await new Promise(r => setTimeout(r, 1000));
          }
          
          showToast();
          
          // 4. Limpieza y Reseteo
          document.getElementById("formProspecto").reset();
          if(editInput) editInput.value = ""; // Limpiar ID de edición
          document.getElementById('pageTitle').innerText = "Gestión Prospectos"; // Restaurar título header

          const btnGps = document.getElementById("btnGps");
          if (btnGps) {
            btnGps.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Guardar mi ubicación actual';
            btnGps.classList.remove("active");
          }

          // 5. Actualizar lista en segundo plano y volver
          if(typeof cargarListaMobile === 'function') await cargarListaMobile();
          switchView("menu");

        } catch (err) {
          alert("Error al guardar: " + err.message);
        } finally {
          document.getElementById("loader").style.display = "none";
        }
      };

      function showToast() {
        const t = document.getElementById("toastSuccess");
        t.style.display = "flex";
        setTimeout(() => (t.style.display = "none"), 3000);
      }
      /* === LOGICA DE OPCIONES (ACTION SHEET) === */
      let SELECTED_PROSPECT = null;

      function abrirOpciones(id) {
          // Buscar prospecto en la memoria (cache)
          SELECTED_PROSPECT = PROSPECTOS_CACHE.find(p => String(p.ID) === String(id));
          if(!SELECTED_PROSPECT) return;

          // Llenar datos del menú
          document.getElementById('sheetName').innerText = SELECTED_PROSPECT.Nombre;
          document.getElementById('sheetInfo').innerText = `${SELECTED_PROSPECT.Tipo || 'N/A'} • ${SELECTED_PROSPECT.Estado || 'Nuevo'}`;

          // Configurar botones dinámicos
          const tel = SELECTED_PROSPECT.Telefono ? SELECTED_PROSPECT.Telefono.replace(/\D/g,'') : '';
          
          // WhatsApp
          const btnWsp = document.getElementById('btnSheetWhatsapp');
          if(tel) {
              btnWsp.href = `https://wa.me/${tel}?text=Hola ${SELECTED_PROSPECT.Nombre}, te contacto de Santa Josefina...`;
              btnWsp.style.opacity = "1";
              btnWsp.style.pointerEvents = "auto";
          } else {
              btnWsp.style.opacity = "0.3";
              btnWsp.style.pointerEvents = "none";
          }

          // Llamada
          const btnTel = document.getElementById('btnSheetTel');
          btnTel.href = tel ? `tel:${tel}` : "#";

          // Mostrar
          document.getElementById('actionSheetOverlay').classList.add('active');
      }

      function cerrarActionSheet() {
          document.getElementById('actionSheetOverlay').classList.remove('active');
      }

      /* --- ACCIONES --- */

      function irABitacora() {
          if(!SELECTED_PROSPECT) return;
          // Redirigir a mobile_bitacora.html pasando el ID
          window.location.href = `mobile_bitacora.html?id=${SELECTED_PROSPECT.ID}&nombre=${encodeURIComponent(SELECTED_PROSPECT.Nombre)}`;
      }

      function irACotizar() {
          if(!SELECTED_PROSPECT) return;
          if(SELECTED_PROSPECT.Tipo === 'Administracion') {
              // Redirigir a cotizador de admin
              window.location.href = `cotizacion-admin-condominio.html?prospectoId=${SELECTED_PROSPECT.ID}&unidades=${SELECTED_PROSPECT.Unidades || 0}&comuna=${SELECTED_PROSPECT.Comuna || ''}`;
          } else {
              alert("La cotización automática es para Administración de Edificios.");
          }
      }

      function verEnMapa() {
          if(!SELECTED_PROSPECT) return;
          const geo = SELECTED_PROSPECT.LatLong || SELECTED_PROSPECT.Coordenadas;
          if(geo) {
              window.open(`https://www.google.com/maps/search/?api=1&query=${geo}`, '_blank');
          } else {
              alert("Este prospecto no tiene coordenadas GPS guardadas.");
          }
      }

      function prepararEdicion() {
          if(!SELECTED_PROSPECT) return;
          cerrarActionSheet();
          
          // Cambiar a vista Formulario
          switchView('form');
          
          // Llenar formulario con datos existentes
          document.getElementById('pageTitle').innerText = "Editar Prospecto";
          
          // Llenar campos comunes
          document.getElementById('nombre').value = SELECTED_PROSPECT.Nombre;
          document.getElementById('telefono').value = SELECTED_PROSPECT.Telefono || "";
          document.getElementById('email').value = SELECTED_PROSPECT.Email || "";
          document.getElementById('obs').value = SELECTED_PROSPECT.Observaciones || "";
          document.getElementById('rut').value = SELECTED_PROSPECT.RUT || "";
          document.getElementById('direccion').value = SELECTED_PROSPECT.Direccion || "";
          document.getElementById('comuna').value = SELECTED_PROSPECT.Comuna || "";
          document.getElementById('unidades').value = SELECTED_PROSPECT.Unidades || "";
          document.getElementById('latlong').value = SELECTED_PROSPECT.LatLong || "";

          // Seleccionar tipo de negocio correcto
          const tipo = SELECTED_PROSPECT.Tipo === 'Administracion' ? 'Administracion' : (SELECTED_PROSPECT['Tipo Operacion'] || 'Venta');
          
          // Marcar el radio button correcto
          const radios = document.getElementsByName('operacion');
          for(let r of radios) {
              if(r.value === tipo || (tipo === 'Administracion' && r.value === 'Administracion')) {
                  r.checked = true;
                  // Disparar evento para mostrar/ocultar campos
                  toggleForm(r.value === 'Administracion' ? 'admin' : 'corretaje');
              }
          }

          // Cambiar el comportamiento del botón guardar para que sea "Editar" en vez de "Crear"
          let hiddenId = document.getElementById('editId');
          if(!hiddenId) {
              hiddenId = document.createElement('input');
              hiddenId.type = 'hidden';
              hiddenId.id = 'editId';
              document.getElementById('formProspecto').appendChild(hiddenId);
          }
          hiddenId.value = SELECTED_PROSPECT.ID;
      }

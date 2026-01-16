// ===== Extracted from mapa.html =====

let map,
        markersLayer,
        PROSPECTOS = [];
      const CHILE_BOUNDS = {
        minLat: -56.0,
        maxLat: -17.0,
        minLng: -76.0,
        maxLng: -66.0,
      };

      /* --- COLORES COHERENTES CON PROSPECTOS.HTML --- */
      function getColorByEstado(estRaw) {
        const est = (estRaw || "").toLowerCase();
        if (est.includes("ganado") || est.includes("cliente")) return "#15803d"; // Verde
        if (est.includes("negociación")) return "#c2410c"; // Naranja Oscuro
        if (est.includes("propuesta")) return "#7e22ce"; // Púrpura
        if (est.includes("volante")) return "#0ea5e9"; // Celeste
        if (est.includes("contactado")) return "#b45309"; // Ambar
        if (est.includes("perdido")) return "#b91c1c"; // Rojo
        return "#0369a1"; // Azul (Nuevo/Default)
      }

      document.addEventListener("DOMContentLoaded", initMap);

      async function initMap() {
        map = L.map("map").setView([-33.4489, -70.6693], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
        await cargarProspectos();
      }

      async function cargarProspectos() {
        try {
          // Cargar ambas tablas para tener todo en el mapa
          const [admin, corretaje] = await Promise.all([
            fetchData("ProspectosCopro").catch(() => []),
            fetchData("ProspectosCorretaje").catch(() => []),
          ]);
          // Unir y normalizar
          PROSPECTOS = [
            ...admin.map((p) => ({ ...p, _tabla: "ProspectosCopro" })),
            ...corretaje.map((p) => ({ ...p, _tabla: "ProspectosCorretaje" })),
          ];
          renderMarkers(PROSPECTOS);
        } catch (e) {
          console.error(e);
        } finally {
          document.getElementById("spinner").style.display = "none";
        }
      }

      function renderMarkers(lista) {
        markersLayer.clearLayers();
        let validos = 0;
        const bounds = [];

        lista.forEach((p) => {
          // Intentar obtener coordenadas de varias columnas posibles
          const raw = p.LatLong || p.Coordenadas || p.Ubicacion;
          const coords = parseCoords(raw);

          if (coords) {
            validos++;
            const color = getColorByEstado(p.Estado);

            const icon = L.divIcon({
              className: "custom-pin",
              html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
              popupAnchor: [0, -10],
            });

            const marker = L.marker([coords.lat, coords.lng], {
              icon: icon,
            }).bindPopup(crearPopup(p));

            markersLayer.addLayer(marker);
            bounds.push([coords.lat, coords.lng]);
          }
        });

        document.getElementById(
          "mapStats"
        ).innerText = `${validos} prospectos geolocalizados.`;
        if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
      }

      function parseCoords(str) {
        if (!str) return null;
        const [lat, lng] = str.split(",").map((s) => parseFloat(s.trim()));
        if (isNaN(lat) || isNaN(lng)) return null;
        // Filtro Chile básico
        if (
          lat < CHILE_BOUNDS.maxLat &&
          lat > CHILE_BOUNDS.minLat &&
          lng < CHILE_BOUNDS.maxLng &&
          lng > CHILE_BOUNDS.minLng
        )
          return { lat, lng };
        return null;
      }

      function crearPopup(p) {
        const color = getColorByEstado(p.Estado);
        return `
            <div class="popup-header" style="background:${color}">
                ${p.Nombre || "Sin Nombre"}
            </div>
            <div class="popup-body">
                <div class="popup-row"><i class="fa-solid fa-tag"></i> <b>${
                  p.Estado
                }</b></div>
                ${
                  p.Telefono
                    ? `<div class="popup-row"><i class="fa-solid fa-phone"></i> <a href="tel:${p.Telefono}">${p.Telefono}</a></div>`
                    : ""
                }
                ${
                  p.Email
                    ? `<div class="popup-row"><i class="fa-solid fa-envelope"></i> ${p.Email}</div>`
                    : ""
                }
                <div class="popup-row" style="color:#64748b; font-size:11px;">${
                  p.Direccion || ""
                }</div>
            </div>
            <div class="popup-footer">
                <button class="btn-popup" onclick="editar('${
                  p.ID
                }')" style="background:${color}">Gestionar</button>
            </div>
        `;
      }

      function filtrarMapa(est, btn) {
        document
          .querySelectorAll(".btn-filter")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (est === "Todos") renderMarkers(PROSPECTOS);
        else
          renderMarkers(
            PROSPECTOS.filter((p) => (p.Estado || "").includes(est))
          );
      }

      /* EDICIÓN RÁPIDA */
      window.editar = function (id) {
        const p = PROSPECTOS.find((x) => String(x.ID) === String(id));
        if (!p) return;
        document.getElementById("pID").value = p.ID;
        document.getElementById("pNombre").value = p.Nombre;
        document.getElementById("pEstado").value = p.Estado || "Nuevo";
        document.getElementById("modalProspecto").style.display = "flex";
      };

      document.getElementById("formEdicion").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("pID").value;
        const est = document.getElementById("pEstado").value;
        const p = PROSPECTOS.find((x) => String(x.ID) === String(id));

        const btn = e.target.querySelector("button[type='submit']");
        btn.innerText = "...";

        try {
          await appSheetCRUD(p._tabla, "Edit", [{ ID: id, Estado: est }]);
          document.getElementById("modalProspecto").style.display = "none";
          await cargarProspectos();
        } catch (e) {
          alert("Error: " + e.message);
        } finally {
          btn.innerText = "Guardar";
        }
      };

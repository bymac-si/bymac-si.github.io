// ===== Extracted from mobile_mapa.html =====

let map,
        markersLayer,
        PROSPECTOS = [];
      // Limites Chile para evitar errores de coordenadas 0,0 en África
      const CHILE = { minLat: -56, maxLat: -17, minLng: -76, maxLng: -66 };

      /* --- LÓGICA DE COLOR COMPARTIDA --- */
      function getColor(estRaw) {
        const e = (estRaw || "").toLowerCase();
        if (e.includes("ganado") || e.includes("cliente")) return "#15803d";
        if (e.includes("negociación")) return "#c2410c";
        if (e.includes("propuesta")) return "#7e22ce";
        if (e.includes("volante")) return "#0ea5e9";
        if (e.includes("contactado")) return "#b45309";
        if (e.includes("perdido")) return "#b91c1c";
        return "#0369a1";
      }

      document.addEventListener("DOMContentLoaded", async () => {
        // Mapa Limpio (Sin controles de zoom por defecto para ahorrar espacio, usamos gestos)
        map = L.map("map", { zoomControl: false }).setView(
          [-33.4489, -70.6693],
          10
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
          map
        );
        // Zoom abajo a la derecha
        L.control.zoom({ position: "bottomright" }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);
        await cargarDatos();
      });

      async function cargarDatos() {
        try {
          const [admin, corretaje] = await Promise.all([
            fetchData("ProspectosCopro").catch(() => []),
            fetchData("ProspectosCorretaje").catch(() => []),
          ]);
          PROSPECTOS = [...admin, ...corretaje];
          render(PROSPECTOS);
        } catch (e) {
          alert("Error de conexión");
        } finally {
          document.getElementById("loader").style.display = "none";
        }
      }

      function render(lista) {
        markersLayer.clearLayers();
        const bounds = [];
        let count = 0;

        lista.forEach((p) => {
          const raw = p.LatLong || p.Coordenadas;
          if (!raw) return;
          const [lat, lng] = raw.split(",").map(Number);

          // Validación Geográfica Simple
          if (
            lat < CHILE.maxLat &&
            lat > CHILE.minLat &&
            lng < CHILE.maxLng &&
            lng > CHILE.minLng
          ) {
            count++;
            const color = getColor(p.Estado);

            // Marcador Minimalista para Móvil
            const icon = L.divIcon({
              className: "mobile-pin",
              html: `<div style="background:${color}; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            const m = L.marker([lat, lng], { icon }).bindPopup(`
                    <div style="font-family:sans-serif;">
                        <strong style="color:#1e293b; font-size:15px;">${
                          p.Nombre
                        }</strong><br>
                        <span style="color:${color}; font-weight:bold; font-size:12px;">${
              p.Estado
            }</span><br>
                        <div style="margin-top:5px; color:#64748b; font-size:13px;">${
                          p.Direccion || "Sin dirección"
                        }</div>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            ${
                              p.Telefono
                                ? `<a href="tel:${p.Telefono}" style="flex:1; text-align:center; padding:8px; background:#f1f5f9; border-radius:6px; color:#334155; text-decoration:none;"><i class="fa-solid fa-phone"></i> Llamar</a>`
                                : ""
                            }
                            ${
                              p.LatLong
                                ? `<a href="https://maps.google.com/?q=${p.LatLong}" target="_blank" style="flex:1; text-align:center; padding:8px; background:#f1f5f9; border-radius:6px; color:#334155; text-decoration:none;"><i class="fa-solid fa-diamond-turn-right"></i> Ir</a>`
                                : ""
                            }
                        </div>
                    </div>
                `);
            markersLayer.addLayer(m);
            bounds.push([lat, lng]);
          }
        });

        document.getElementById("lblStats").innerText = `${count} prospectos`;
        if (bounds.length) map.fitBounds(bounds, { padding: [20, 20] });
      }

      function filtrar(est, btn) {
        document
          .querySelectorAll(".pill-filter")
          .forEach((el) => el.classList.remove("active"));
        btn.classList.add("active");

        if (est === "Todos") render(PROSPECTOS);
        else render(PROSPECTOS.filter((p) => (p.Estado || "").includes(est)));
      }

// ===== Extracted from landing_desktop.html =====

(function () {
        // Inicialización de EmailJS
        emailjs.init("7Il4AhmGHchP7qfxu");
      })();

// CONFIGURACIÓN NOTIFICACIONES
      const ADMIN_EMAIL = "marcos.castro@santajosefinaspa.cl";

      // 1. Efecto Scroll Header
      const h = document.getElementById("mainHeader");
      const onScroll = () =>
        h.classList.toggle("scrolled", window.scrollY > 10);
      document.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      // 2. Año actual
      document.getElementById("y").textContent = new Date().getFullYear();

      // 3. Cargar Propiedades
      let propiedadesGlobal = [];

      async function cargarPropiedadesLanding() {
        try {
          propiedadesGlobal =
            typeof fetchData === "function"
              ? await fetchData("Propiedades")
              : [];
        } catch (e) {
          console.error(e);
        }

        const disponibles = propiedadesGlobal
          .filter((p) => (p.Estado || "") === "Disponible")
          .slice(0, 6);

        const contenedor = document.getElementById("listaPropiedades");

        if (disponibles.length === 0) {
          contenedor.innerHTML =
            '<p style="text-align: center; width: 100%; color: #888;">No hay propiedades destacadas en este momento.</p>';
          return;
        }

        contenedor.innerHTML = disponibles
          .map(
            (p, i) => `
          <div>
            <div style="position:relative;">
                <img src="${
                  p.ImagenURL || "assets/img/default_prop.jpg"
                }" alt="Propiedad" style="width:100%; height:200px; object-fit:cover;">
                <span style="position:absolute; top:10px; right:10px; background:var(--accent); color:white; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold;">${
                  p.Operacion || "Venta"
                }</span>
            </div>
            <div class="card-body">
              <h3 style="font-size:18px; margin-bottom:5px; font-weight:700;">${
                p.Titulo || "Propiedad"
              }</h3>
              <p style="color:var(--muted); font-size:14px; margin-bottom:10px;">${
                p.Tipo || ""
              } en ${p.Comuna || ""}</p>
              <p style="font-weight:800; font-size:20px; color:var(--brand);">
                ${"$" + new Intl.NumberFormat("es-CL").format(p.Precio || 0)}
              </p>
              <div style="display:flex; gap:10px; margin-top:15px;">
                <button onclick="abrirModal(${i})" class="btn btn-primary btn-sm w-100">Ver detalles</button>
              </div>
            </div>
          </div>
        `
          )
          .join("");
      }

      // 4. Modal
      function abrirModal(index) {
        const p = propiedadesGlobal[index] || {};
        document.getElementById("detalleTitulo").textContent =
          p.Titulo || "Detalle Propiedad";
        document.getElementById("detalleImagen").src = p.ImagenURL || "";
        document.getElementById("detalleTipo").textContent = p.Tipo || "-";
        document.getElementById("detalleComuna").textContent = p.Comuna || "-";
        document.getElementById("detalleRegion").textContent = p.Region || "-";
        document.getElementById("detallePrecio").textContent =
          "$" + new Intl.NumberFormat("es-CL").format(p.Precio || 0);

        document.getElementById("detalleMetrosConstruidos").textContent =
          (p.MetrosConstruidos || "-") + " m²";
        document.getElementById("detalleMetrosTotales").textContent =
          (p.MetrosTotales || "-") + " m²";
        document.getElementById("detalleDormitorios").textContent =
          p.Dormitorios || "-";
        document.getElementById("detalleBanos").textContent = p.Banos || "-";

        document.getElementById("modalPropiedad").classList.add("active");
      }
      function cerrarModal() {
        document.getElementById("modalPropiedad").classList.remove("active");
      }

      cargarPropiedadesLanding();

      // 5. ENVÍO FORMULARIO -> CRM & EMAIL
      const formContacto = document.getElementById("formContacto");

      formContacto.onsubmit = async (e) => {
        e.preventDefault();

        const btn = document.getElementById("btnSubmitContacto");
        const originalText = btn.innerText;
        btn.innerText = "Enviando...";
        btn.disabled = true;

        const nuevoID = "WEB_" + Date.now();
        const fechaHoy = new Date().toISOString().split("T")[0];

        // Datos del prospecto
        const payload = {
          ID: nuevoID,
          Nombre: document.getElementById("contactoNombre").value.trim(),
          Email: document.getElementById("contactoEmail").value.trim(),
          Telefono: document.getElementById("contactoTelefono").value.trim(),
          Observaciones: document
            .getElementById("contactoMensaje")
            .value.trim(),
          "Fecha Registro": fechaHoy,
          Estado: "Nuevo",
          Canal: "Web Landing",
          "Tipo Operacion": "Consulta Web",
          Agente: "Asignar",
        };

        try {
          // A. Guardar en AppSheet (Tabla Corretaje)
          if (typeof appSheetCRUD === "function") {
            await appSheetCRUD("ProspectosCorretaje", "Add", [payload]);
          } else {
            console.warn("AppSheet CRUD no disponible.");
          }

          // B. Enviar notificación por correo
          await notificarNuevoLead(payload);

          // C. Feedback y Reset
          formContacto.reset();
          document.getElementById("msgConfirmacion").style.display = "block";
          setTimeout(() => {
            document.getElementById("msgConfirmacion").style.display = "none";
          }, 6000);
        } catch (err) {
          console.error(err);
          alert("Hubo un error al procesar la solicitud.");
        } finally {
          btn.innerText = originalText;
          btn.disabled = false;
        }
      };

      // Función específica para notificación de Leads Web
      async function notificarNuevoLead(data) {
        if (typeof emailjs === "undefined") return;

        const htmlBody = `
            <div style="font-family:sans-serif; padding:20px; border:2px solid #1A2B48; border-radius:10px;">
                <h2 style="color:#1A2B48;">🚀 Nuevo Prospecto Web</h2>
                <p>Un visitante ha completado el formulario de contacto:</p>
                <ul style="background:#f9fafb; padding:15px; border-radius:5px;">
                    <li><strong>Nombre:</strong> ${data.Nombre}</li>
                    <li><strong>Email:</strong> ${data.Email}</li>
                    <li><strong>Teléfono:</strong> ${data.Telefono}</li>
                    <li><strong>Fecha:</strong> ${data["Fecha Registro"]}</li>
                </ul>
                <p><strong>Mensaje:</strong></p>
                <blockquote style="border-left:4px solid #e74e35; padding-left:10px; color:#555;">
                    ${data.Observaciones}
                </blockquote>
                <p style="font-size:12px; color:#888;">Lead guardado en CRM (ProspectosCorretaje).</p>
            </div>
        `;

        // Envío usando Template genérico
        // Ajusta ServiceID y TemplateID según tu cuenta EmailJS
        return emailjs
          .send("service_p9hqkqn", "template_80q9psi", {
            to_email: ADMIN_EMAIL,
            subject: `[WEB] Nuevo Lead: ${data.Nombre}`,
            html_body: htmlBody,
            // Parámetros de respaldo por si el template usa {{variables}}
            nombre: data.Nombre,
            email: data.Email,
            mensaje: data.Observaciones,
          })
          .catch((e) => console.warn("Error enviando email:", e));
      }

      // 6. Cerrar menú móvil
      document.addEventListener("DOMContentLoaded", function () {
        const off = document.getElementById("mobileMenu");
        if (!off) return;
        off.querySelectorAll("a").forEach((a) => {
          a.addEventListener("click", () => {
            const inst = bootstrap.Offcanvas.getInstance(off);
            if (inst) inst.hide();
          });
        });
      });

// ===== Extracted from landing_mobile.html =====

(function () {
        if (typeof emailjs !== "undefined") emailjs.init("7Il4AhmGHchP7qfxu");
      })();

// Verificar sesión activa (Solo redirige si es AGENTE, no Residente)
      document.addEventListener("DOMContentLoaded", () => {
        if (typeof getAuthUser === "function") {
          const user = getAuthUser();
          // Si es un Agente (tiene sesión interna), va al dashboard
          if (user && user.Nombre && !window.location.href.includes("dashboard")) {
            window.location.href = "mobile_dashboard.html";
          }
        }
      });

      /* === LÓGICA DE MODALES === */
      function abrirModal(tipo) {
        if (tipo === "propiedades") {
          document.getElementById("modalPropiedades").classList.add("active");
          cargarPropiedades();
        } else if (tipo === "contacto") {
          document.getElementById("modalContacto").classList.add("active");
        }
      }

      function cerrarModal(tipo) {
        if (tipo === "propiedades") {
          document.getElementById("modalPropiedades").classList.remove("active");
        } else if (tipo === "contacto") {
          document.getElementById("modalContacto").classList.remove("active");
        }
      }

      /* === CARGAR PROPIEDADES === */
      let propiedadesCargadas = false;

      async function cargarPropiedades() {
        if (propiedadesCargadas) return;
        const contenedor = document.getElementById("contenedorPropiedades");

        try {
          const props = typeof fetchData === "function" ? await fetchData("Propiedades") : [];
          const disponibles = props.filter((p) => (p.Estado || "") === "Disponible");

          if (disponibles.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">No hay propiedades destacadas.</p>';
            return;
          }

          contenedor.innerHTML = disponibles.map((p) => {
              const precioFmt = "$" + new Intl.NumberFormat("es-CL").format(p.Precio || 0);
              const tagClass = p.Operacion === "Arriendo" ? "tag-arriendo" : "tag-venta";
              const imgUrl = p.ImagenURL || "assets/img/default_prop.jpg";
              const wspText = `Hola, me interesa: ${p.Titulo} (${precioFmt})`;

              return `
                    <div class="prop-card-mini">
                        <img src="${imgUrl}" class="prop-img" loading="lazy" onerror="this.src='assets/img/default_prop.jpg'">
                        <div class="prop-info">
                            <span class="prop-tag ${tagClass}">${p.Operacion || "Venta"}</span>
                            <div class="prop-price">${precioFmt}</div>
                            <div style="font-weight:600; font-size:14px; margin-top:2px;">${p.Titulo}</div>
                            <div class="prop-addr"><i class="fa-solid fa-location-dot"></i> ${p.Comuna || "Santiago"}</div>
                            <a href="https://wa.me/56998647190?text=${encodeURIComponent(wspText)}" target="_blank" class="btn-wsp-outline">
                                <i class="fa-brands fa-whatsapp"></i> Consultar
                            </a>
                        </div>
                    </div>`;
            }).join("");

          propiedadesCargadas = true;
        } catch (e) {
          console.error(e);
          contenedor.innerHTML = '<p style="text-align:center; color:red;">Error cargando datos.</p>';
        }
      }

      /* === FORMULARIO CONTACTO === */
      document.getElementById("formContactoMobile").onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btnSubmitM");
        const txtOriginal = btn.innerText;
        btn.innerText = "Enviando...";
        btn.disabled = true;

        const payload = {
          ID: "WEB_M_" + Date.now(),
          Nombre: document.getElementById("mNombre").value,
          Email: document.getElementById("mEmail").value,
          Telefono: document.getElementById("mTel").value,
          Observaciones: document.getElementById("mMensaje").value,
          "Fecha Registro": new Date().toISOString().split("T")[0],
          Estado: "Nuevo",
          Canal: "App Mobile",
          Agente: "Asignar",
        };

        try {
          if (typeof appSheetCRUD === "function") {
            await appSheetCRUD("ProspectosCorretaje", "Add", [payload]);
          }
          if (typeof emailjs !== "undefined") {
            await emailjs.send("service_p9hqkqn", "template_80q9psi", {
              to_email: "marcos.castro@santajosefinaspa.cl",
              subject: "[APP] Nuevo Mensaje: " + payload.Nombre,
              html_body: `Mensaje: ${payload.Observaciones} <br> Tel: ${payload.Telefono}`,
            });
          }
          alert("¡Mensaje enviado! Te contactaremos pronto.");
          document.getElementById("formContactoMobile").reset();
          cerrarModal("contacto");
        } catch (err) {
          alert("Error al enviar. Intenta por WhatsApp.");
        } finally {
          btn.innerText = txtOriginal;
          btn.disabled = false;
        }
      };

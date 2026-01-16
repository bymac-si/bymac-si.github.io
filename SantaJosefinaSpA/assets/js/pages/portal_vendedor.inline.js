// ===== Extracted from portal_vendedor.html =====

// Simulamos login simple (En producción usar localStorage real)
        // const USER_RUT = localStorage.getItem('cliente_rut'); 
        
        // MODO DEMO:
        const USER_RUT = "11111111-1"; 

        document.addEventListener("DOMContentLoaded", async () => {
            if(!USER_RUT) { alert("Debe iniciar sesión"); window.location.href="login_residente.html"; return; }
            await cargarDatosVendedor();
        });

        async function cargarDatosVendedor() {
            try {
                // 1. Buscar Propiedad del usuario
                const props = await fetchData("Propiedades");
                const miPropiedad = props.find(p => p["RUT Propietario"] === USER_RUT);

                if(!miPropiedad) {
                    document.getElementById("lblPropiedad").innerText = "No tienes propiedades activas.";
                    document.getElementById("listaFeedback").innerHTML = "";
                    return;
                }

                document.getElementById("lblPropiedad").innerText = miPropiedad.Direccion || miPropiedad.Titulo;
                document.getElementById("lblNombre").innerText = (miPropiedad["Propietario"] || "Cliente").split(" ")[0];

                // 2. Buscar Visitas realizadas a esa propiedad
                // Asumimos tabla 'Visitas' con columna 'PropiedadID' y 'Comentarios'
                const visitas = await fetchData("Visitas");
                const misVisitas = visitas.filter(v => v.PropiedadID === miPropiedad.ID && v.Estado === "Realizada");

                // KPIs
                document.getElementById("valVisitas").innerText = misVisitas.length;
                document.getElementById("valInteresados").innerText = misVisitas.filter(v => v.Interes === "Alto").length;

                // Render Feedback
                const contenedor = document.getElementById("listaFeedback");
                if(misVisitas.length === 0) {
                    contenedor.innerHTML = '<div class="empty-state"><i class="fa-regular fa-calendar-xmark" style="font-size:30px; margin-bottom:10px;"></i><br>Aún no hay visitas registradas.</div>';
                } else {
                    contenedor.innerHTML = misVisitas.map(v => `
                        <div class="feedback-card">
                            <div class="feedback-date"><i class="fa-regular fa-calendar"></i> ${v.Fecha}</div>
                            <div class="feedback-text">"${v.Comentarios || "Sin comentarios registrados."}"</div>
                            ${v.Interes === 'Alto' ? '<span style="font-size:10px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; margin-top:5px; display:inline-block;">Muy Interesado</span>' : ''}
                        </div>
                    `).join("");
                }

            } catch(e) {
                console.error(e);
            }
        }

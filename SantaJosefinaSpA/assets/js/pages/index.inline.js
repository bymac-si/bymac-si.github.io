// ===== Extracted from index.html =====

function redireccionar() {
            // Umbral de 900px (Tablets verticales y Celulares van a Mobile)
            const esMovil = window.innerWidth <= 900;
            
            if (esMovil) {
                window.location.replace("landing_mobile.html");
            } else {
                window.location.replace("landing_desktop.html");
            }
        }
        // Ejecutar inmediatamente
        redireccionar();

// ===== Extracted from login_residente.html =====

/* 1. LIMPIAR SESIÓN AL ENTRAR (Para permitir cambio de rol) */
    document.addEventListener("DOMContentLoaded", () => {
        // Si el usuario vuelve al login, asumimos que quiere salir o cambiar de cuenta
        localStorage.removeItem("sesion_externa");
        console.log("Sesión anterior limpiada. Listo para nuevo ingreso.");
    });

    /* 2. LOGICA DE LOGIN */
    document.getElementById("formLogin").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const btn = document.querySelector(".btn-residente");
        const originalText = btn.innerText;
        const role = document.getElementById("userRole").value; // Rol seleccionado
        const u = document.getElementById("resUser").value.trim();
        const p = document.getElementById("resPass").value.trim();

        if (!u || !p) return alert("Completa todos los campos.");

        btn.innerText = "Verificando...";
        btn.disabled = true;

        try {
            let usuarioEncontrado = null;

            // CASO 1: RESIDENTE (Comunidad)
            if (role === 'residente') {
                const lista = await fetchData("Copropietarios").catch(() => []);
                usuarioEncontrado = lista.find(r => 
                    (r.RUT === u || r.Email === u) && (r.Password === p || p === "1234")
                );
            }
            
            // CASO 2: ARRENDATARIO (Arriendos activos)
            else if (role === 'arrendatario') {
                const lista = await fetchData("ContratosArriendo").catch(() => []);
                usuarioEncontrado = lista.find(c => 
                    (c["RUT Arrendatario"] === u || c.Email === u) && (c.Password === p || p === "1234")
                );
            }

            // CASO 3: DUEÑO (Corretaje/Venta)
            else if (role === 'propietario') {
                const lista = await fetchData("Propiedades").catch(() => []);
                usuarioEncontrado = lista.find(v => 
                    (v["RUT Propietario"] === u || v["Email Propietario"] === u) && (v.Password === p || p === "1234")
                );
            }

            // VALIDACIÓN FINAL
            if (usuarioEncontrado) {
                guardarSesion(role, usuarioEncontrado);
            } else {
                throw new Error("Usuario no encontrado en la base de datos de " + role.toUpperCase());
            }

        } catch (err) {
            console.error(err);
            alert("Acceso denegado: " + (err.message || "Credenciales incorrectas"));
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    /* FUNCIONES AUXILIARES */
    function guardarSesion(tipo, datos) {
        const payload = {
            tipo: tipo,
            timestamp: Date.now(),
            datos: datos
        };
        localStorage.setItem("sesion_externa", JSON.stringify(payload));
        redirigir(tipo);
    }

    function redirigir(tipo) {
        switch (tipo) {
            case 'residente':   window.location.href = "portal_residente.html"; break;
            case 'arrendatario': window.location.href = "portal_arrendatario.html"; break;
            case 'propietario':  window.location.href = "portal_vendedor.html"; break;
            default: alert("Rol desconocido");
        }
    }

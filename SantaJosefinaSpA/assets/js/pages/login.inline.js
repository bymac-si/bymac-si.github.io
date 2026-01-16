// ===== Extracted from login.html =====

/* Lógica de Redirección Inteligente */
      function redirigirSegunDispositivo() {
          if (window.innerWidth < 900) {
              window.location.replace('mobile_dashboard.html');
          } else {
              window.location.replace('dashboard.html');
          }
      }

      // Verificar sesión al cargar
      document.addEventListener("DOMContentLoaded", () => {
          if (typeof getAuthUser === 'function') {
              const user = getAuthUser();
              if (user && user.Nombre) { // Verificación extra
                  redirigirSegunDispositivo();
              }
          }
      });

      const form = document.getElementById("loginForm");
      const errorDiv = document.getElementById("errorMsg");
      const spinner = document.getElementById("spinner");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        errorDiv.style.display = "none";
        spinner.style.display = "flex";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
          if (typeof loginWithAppSheet !== 'function') {
              throw new Error("Error de conexión: app.js no cargado.");
          }

          // 1. Intentar Login
          await loginWithAppSheet(email, password);
          
          // 2. Si es exitoso, redirigir según pantalla
          redirigirSegunDispositivo();

        } catch (err) {
          console.error(err);
          spinner.style.display = "none";
          errorDiv.textContent = err.message || "Credenciales incorrectas.";
          errorDiv.style.display = "block";
        }
      });

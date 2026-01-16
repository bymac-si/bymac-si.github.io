// ===== Extracted from header.html =====

function toggleMenu() {
    const nav = document.getElementById('navMenu');
    nav.classList.toggle('active');
  }
  
  // Cargar nombre usuario si existe
  document.addEventListener("DOMContentLoaded", () => {
      try {
          if(typeof getAuthUser === 'function') {
              const u = getAuthUser();
              if(u && u.Nombre) {
                  document.getElementById('headerUserName').innerText = u.Nombre.split(' ')[0];
                  document.getElementById('headerUserRole').innerText = u.Rol || "Admin";
              }
          }
      } catch(e){}
  });

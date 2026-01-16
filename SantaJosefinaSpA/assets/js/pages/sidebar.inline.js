// ===== Extracted from sidebar.html =====

const sidebar=document.getElementById("sidebar");
const toggleBtn=document.getElementById("sidebarToggle");
const mobileBtn=document.getElementById("mobileToggle");

// Botón interno (colapsar ancho en desktop)
toggleBtn.addEventListener("click", ()=> sidebar.classList.toggle("collapsed"));

// Botón móvil (mostrar/ocultar)
mobileBtn.addEventListener("click", ()=> sidebar.classList.toggle("active"));

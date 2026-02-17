const express = require('express');
const path = require('path');
const hbs = require('hbs');

const app = express();
const PORT = 3000;

/* ==========================
   Archivos estáticos
========================== */
app.use(express.static(path.join(__dirname, 'public')));

/* ==========================
   Motor de vistas
========================== */
app.set('view engine', 'hbs');

/* ==========================
   Parciales
========================== */
hbs.registerPartials(path.join(__dirname, 'views/partials'));

/* ==========================
   Helper personalizado
========================== */
hbs.registerHelper('priorityClass', function (priority) {
  if (priority === 'alta') {
    return 'priority-high';
  } else if (priority === 'media') {
    return 'priority-medium';
  } else {
    return 'priority-low';
  }
});

/* ==========================
   Rutas
========================== */

// Perfil
app.get('/perfil', (req, res) => {
  res.render('perfil', {
    nombre: 'Ana',
    profesion: 'Desarrolladora Web'
  });
});

// Dashboard
app.get('/dashboard', (req, res) => {

  const data = {
    user: {
      name: 'Carlos',
      isAdmin: true
    },

    projects: [
      {
        name: 'API Gateway',
        isCompleted: false,
        tasks: [
          { description: 'Diseñar endpoints', priority: 'alta' },
          { description: 'Implementar JWT', priority: 'alta' },
          { description: 'Crear documentación', priority: 'media' }
        ]
      },
      {
        name: 'Refactor del Frontend',
        isCompleted: true,
        tasks: [
          { description: 'Migrar a React 18', priority: 'baja' },
          { description: 'Actualizar dependencias', priority: 'baja' }
        ]
      },
      {
        name: 'Base de Datos',
        isCompleted: false,
        tasks: []
      }
    ]
  };

  res.render('dashboard', data);
});

/* ==========================
   Servidor
========================== */

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
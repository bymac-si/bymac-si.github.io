// Importar Express
const express = require('express');

// Crear la aplicación
const app = express();

// Definir puerto
const PORT = 3000;

// Definir ruta principal
app.get('/', (req, res) => {
  res.send('¡Hola Mundo con Express!');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
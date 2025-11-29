const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de datos en memoria (para demostración)
// En producción usarías MongoDB, PostgreSQL, etc.
const db = {
  users: {},
  links: {}
};

// Cargar datos del archivo si existe (simulando persistencia)
const fs = require('fs');
const dbFile = 'database.json';

if (fs.existsSync(dbFile)) {
  const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  Object.assign(db, data);
}

// Función para guardar datos
const saveDatabase = () => {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
};

// RUTAS DE USUARIOS

// Registro/Login
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;

  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username requerido' });
  }

  const sanitizedUsername = username.toLowerCase().trim();

  if (!db.users[sanitizedUsername]) {
    db.users[sanitizedUsername] = {
      username: sanitizedUsername,
      fullName: username,
      bio: '',
      avatar: '👤',
      totalViews: 0,
      created: new Date().toISOString()
    };
    saveDatabase();
  }

  const user = db.users[sanitizedUsername];
  res.json({
    success: true,
    user: {
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      avatar: user.avatar,
      totalViews: user.totalViews
    }
  });
});

// Obtener perfil de usuario
app.get('/api/users/:username', (req, res) => {
  const user = db.users[req.params.username.toLowerCase()];

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const userLinks = Object.values(db.links).filter(
    link => link.user === user.username && link.isPublic
  );

  res.json({
    user: {
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      avatar: user.avatar,
      totalViews: user.totalViews
    },
    links: userLinks,
    linkCount: userLinks.length
  });
});

// Actualizar perfil
app.put('/api/users/:username', (req, res) => {
  const { fullName, bio, avatar } = req.body;
  const user = db.users[req.params.username.toLowerCase()];

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (fullName) user.fullName = fullName;
  if (bio !== undefined) user.bio = bio;
  if (avatar) user.avatar = avatar;

  saveDatabase();

  res.json({
    success: true,
    user
  });
});

// RUTAS DE ENLACES

// Crear enlace
app.post('/api/links', (req, res) => {
  const { username, title, url, description, isPublic } = req.body;

  if (!username || !title || !url) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const link = {
    id: Date.now().toString(),
    user: username.toLowerCase(),
    title,
    url,
    description: description || '',
    isPublic: isPublic !== false,
    created: new Date().toISOString(),
    views: 0,
    clicks: 0
  };

  db.links[link.id] = link;
  saveDatabase();

  res.json({
    success: true,
    link
  });
});

// Obtener enlaces del usuario
app.get('/api/users/:username/links', (req, res) => {
  const userLinks = Object.values(db.links).filter(
    link => link.user === req.params.username.toLowerCase()
  );

  res.json({
    links: userLinks
  });
});

// Obtener un enlace específico
app.get('/api/links/:id', (req, res) => {
  const link = db.links[req.params.id];

  if (!link) {
    return res.status(404).json({ error: 'Enlace no encontrado' });
  }

  // Incrementar contador de vistas
  link.views++;
  saveDatabase();

  res.json(link);
});

// Actualizar enlace
app.put('/api/links/:id', (req, res) => {
  const link = db.links[req.params.id];

  if (!link) {
    return res.status(404).json({ error: 'Enlace no encontrado' });
  }

  const { title, url, description, isPublic } = req.body;

  if (title) link.title = title;
  if (url) link.url = url;
  if (description !== undefined) link.description = description;
  if (isPublic !== undefined) link.isPublic = isPublic;

  saveDatabase();

  res.json({
    success: true,
    link
  });
});

// Eliminar enlace
app.delete('/api/links/:id', (req, res) => {
  if (!db.links[req.params.id]) {
    return res.status(404).json({ error: 'Enlace no encontrado' });
  }

  delete db.links[req.params.id];
  saveDatabase();

  res.json({
    success: true,
    message: 'Enlace eliminado'
  });
});

// Registrar click en un enlace
app.post('/api/links/:id/click', (req, res) => {
  const link = db.links[req.params.id];

  if (!link) {
    return res.status(404).json({ error: 'Enlace no encontrado' });
  }

  link.clicks++;
  
  // Actualizar vistas totales del usuario
  const user = db.users[link.user];
  if (user) {
    user.totalViews++;
  }

  saveDatabase();

  res.json({
    success: true,
    clicks: link.clicks
  });
});

// Servir la aplicación frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de rutas para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`LinkVault servidor corriendo en puerto ${PORT}`);
  console.log(`Accede a http://localhost:${PORT}`);
});
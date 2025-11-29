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

// Página de preview del enlace
app.get('/preview/:id', (req, res) => {
  const link = db.links[req.params.id];

  if (!link) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enlace no encontrado</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          }
          h1 {
            color: #f44336;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
          a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Enlace no encontrado</h1>
          <p>Este enlace no existe o ha sido eliminado.</p>
          <a href="/">Volver a LinkVault</a>
        </div>
      </body>
      </html>
    `);
  }

  const user = db.users[link.user];
  const userName = user ? user.fullName : 'Usuario desconocido';

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${link.title} - LinkVault</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .container {
          background: white;
          border-radius: 15px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 500px;
          width: 100%;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo {
          font-size: 3em;
          margin-bottom: 15px;
        }

        .title {
          font-size: 1.8em;
          font-weight: 700;
          color: #333;
          margin-bottom: 10px;
        }

        .subtitle {
          color: #666;
          font-size: 1em;
        }

        .link-info {
          background: #f9f9f9;
          border-left: 4px solid #667eea;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }

        .link-title {
          font-size: 1.3em;
          font-weight: 600;
          color: #333;
          margin-bottom: 10px;
          word-break: break-word;
        }

        .link-url {
          background: white;
          padding: 12px;
          border-radius: 6px;
          color: #667eea;
          font-size: 0.9em;
          word-break: break-all;
          margin-bottom: 12px;
          border: 1px solid #e0e0e0;
          font-family: 'Courier New', monospace;
        }

        .link-description {
          color: #666;
          line-height: 1.5;
          font-size: 0.95em;
        }

        .user-info {
          background: #f0f0ff;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 25px;
          text-align: center;
          font-size: 0.9em;
          color: #667eea;
        }

        .user-info strong {
          color: #333;
        }

        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 25px;
          color: #856404;
          font-size: 0.9em;
        }

        .buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        button {
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-continue {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-continue:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-cancel {
          background: #e0e0e0;
          color: #333;
        }

        .btn-cancel:hover {
          background: #d0d0d0;
        }

        @media (max-width: 480px) {
          .container {
            padding: 25px;
          }

          .title {
            font-size: 1.5em;
          }

          .buttons {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔗</div>
          <div class="title">¿Seguro que quieres continuar?</div>
          <div class="subtitle">Estás a punto de abandonar LinkVault</div>
        </div>

        <div class="link-info">
          <div class="link-title">${link.title}</div>
          <div class="link-url">${link.url}</div>
          ${link.description ? `<div class="link-description">${link.description}</div>` : ''}
        </div>

        <div class="user-info">
          📌 Compartido por <strong>@${link.user}</strong>
        </div>

        <div class="warning">
          ⚠️ Asegúrate de confiar en este enlace antes de continuar. LinkVault no es responsable por el contenido externo.
        </div>

        <div class="buttons">
          <button class="btn-cancel" onclick="goBack()">Cancelar</button>
          <button class="btn-continue" onclick="continueToLink()">Continuar</button>
        </div>
      </div>

      <script>
        const linkId = '${req.params.id}';
        const linkUrl = '${link.url}';

        function goBack() {
          history.back();
        }

        function continueToLink() {
          // Registrar el click
          fetch('/api/links/' + linkId + '/click', { method: 'POST' });
          
          // Redirigir después de 300ms
          setTimeout(() => {
            window.location.href = linkUrl;
          }, 300);
        }

        // Permitir Enter para continuar
        document.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') continueToLink();
        });
      </script>
    </body>
    </html>
  `);
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
  console.log(`🚀 LinkVault servidor corriendo en puerto ${PORT}`);
  console.log(`📱 Accede a http://localhost:${PORT}`);
});

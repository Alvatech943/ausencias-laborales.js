// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const sequelize = require('./config/db');

// Modelos (aseguran que se carguen)
require('./models/Dependencia');
require('./models/Usuario');
require('./models/Solicitud');

// Rutas
const authRoutes = require('./routes/auth');
const solicitudesRoutes = require('./routes/solicitudes');
const adminRoutes = require('./routes/admin');
const dependenciasRoutes = require('./routes/dependencias');

function createApp() {
  const app = express();

  const origins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : '*';

  app.use(cors({ origin: origins, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/solicitudes', solicitudesRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dependencias', dependenciasRoutes);

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'ausentismo-backend' });
  });

  return app;
}

module.exports = { createApp, sequelize };

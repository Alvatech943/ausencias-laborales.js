require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sequelize = require('./config/db');

// Modelos
require('./models/Dependencia');
require('./models/Usuario');
require('./models/Solicitud');

// Rutas
const authRoutes = require('./routes/auth');
const solicitudesRoutes = require('./routes/solicitudes');
const adminRoutes = require('./routes/admin');

const app = express();

// 🔐 Middlewares globales
app.use(cors());
app.use(helmet());

// ⬅️ MUY IMPORTANTE: parsers con límite ANTES de las rutas (y SOLO una vez)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/admin', adminRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de Ausentismo Laboral funcionando' });
});

// (Opcional) logger de requests no-GET
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log('>>', req.method, req.originalUrl);
    console.log('Headers Content-Type:', req.headers['content-type']);
    // Ojo: si el body es grande esto puede ensuciar logs:
    // console.log('Body recibido:', req.body);
  }
  next();
});

// Conectar a MySQL y levantar
sequelize.sync()
  .then(() => {
    console.log('Base de datos conectada y sincronizada');
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
  })
  .catch(err => console.error('Error al conectar con la base de datos:', err));



// require('dotenv').config({ path: __dirname + '/.env' });
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const sequelize = require('./config/db');

// // Modelos
// require('./models/Dependencia');
// require('./models/Usuario');
// require('./models/Solicitud');


// // Rutas
// const authRoutes = require('./routes/auth');
// const solicitudesRoutes = require('./routes/solicitudes');

// // Debug variables de entorno
// console.log('--- Cargando variables de entorno ---');
// console.log('DB_NAME:', process.env.DB_NAME);
// console.log('DB_USER:', process.env.DB_USER);
// console.log('DB_PASS:', process.env.DB_PASS);
// console.log('DB_HOST:', process.env.DB_HOST);
// console.log('-------------------------------------');

// const app = express();

// // Middlewares
// app.use(cors());
// app.use(helmet());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Endpoints
// app.use('/api/auth', authRoutes);
// app.use('/api/solicitudes', solicitudesRoutes);
// app.use('/api/admin', require('./routes/admin'));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ limit: '10mb', extended: true }));

// // Ruta de prueba
// app.get('/', (req, res) => {
//   res.json({ message: 'API de Ausentismo Laboral funcionando' });
// });

// // Conectar a MySQL y sincronizar
// sequelize.sync()
//   .then(() => {
//     console.log('Base de datos conectada y sincronizada');
//     const PORT = process.env.PORT || 4000;
//     app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
//   })
//   .catch(err => console.error('Error al conectar con la base de datos:', err));

// app.use((req, res, next) => {
//   if (req.method !== 'GET') {
//     console.log('>>', req.method, req.originalUrl);
//     console.log('Headers Content-Type:', req.headers['content-type']);
//     console.log('Body recibido:', req.body);
//   }
//   next();
// });

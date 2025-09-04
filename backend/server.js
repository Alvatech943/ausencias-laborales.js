// backend/server.js
require('dotenv').config();
const { createApp, sequelize } = require('./app');

const app = createApp();

sequelize.sync().then(() => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Servidor local en puerto ${PORT}`));
}).catch(err => {
  console.error('Error al sincronizar DB:', err);
  process.exit(1);
});

// backend/api/index.js
const serverless = require('serverless-http');
const { createApp } = require('../app');

// Construye la app una vez por cold start
const app = createApp();

module.exports = serverless(app);

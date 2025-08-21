// backend/middleware/isAdmin.js
module.exports = function isAdmin(req, res, next) {
  // Espera que el middleware auth ya haya puesto req.user.usuario
  const list = (process.env.ADMIN_USERS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const me = (req.user?.usuario || '').toLowerCase();

  if (list.includes(me)) return next();

  return res.status(403).json({ error: 'Solo el superusuario puede hacer esto' });
};

function adminMiddleware(req, res, next) {
  if (req.userRole !== 'admin' || req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  }

  next();
}

module.exports = adminMiddleware;

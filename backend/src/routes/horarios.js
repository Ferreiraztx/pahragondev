const express = require('express');
const router = express.Router();
const { listar, atualizar } = require('../controllers/horarioController');
const requireAuth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

router.get('/', listar); // público — usado pela página de agendar também
router.put('/', requireAuth, requireAdmin, atualizar);

module.exports = router;
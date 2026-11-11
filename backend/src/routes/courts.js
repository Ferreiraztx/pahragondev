const express = require('express');
const router = express.Router();
const { listar, criar, editar, deletar } = require('../controllers/courtController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

router.get('/', listar);
router.post('/', auth, admin, criar);
router.put('/:id', auth, admin, editar);
router.delete('/:id', auth, admin, deletar);

module.exports = router;
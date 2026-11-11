const express = require('express')
const router = express.Router()
const { listar, criar, deletar, fluxoCaixa } = require('../controllers/tournamentController')
const auth = require('../middlewares/auth')
const admin = require('../middlewares/admin')

router.get('/', listar)
router.post('/', auth, admin, criar)
router.delete('/:id', auth, admin, deletar)
router.get('/caixa', auth, admin, fluxoCaixa)

module.exports = router
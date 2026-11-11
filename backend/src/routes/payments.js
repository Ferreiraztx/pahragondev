const express = require('express')
const router = express.Router()
const { criarPagamento, webhook, confirmarPagamento } = require('../controllers/paymentController')
const auth = require('../middlewares/auth')

router.post('/criar-preferencia', auth, criarPagamento)
router.post('/webhook', webhook)
router.post('/confirmar', auth, confirmarPagamento)

module.exports = router
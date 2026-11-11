const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/auth');

const { 
  criar, 
  minhasReservas, 
  cancelar, 
  horariosDisponiveis, 
  listarTodas, 
  buscarPorId, 
  criarBloqueio, 
  listarBloqueios, 
  deletarBloqueio,
  criarManual,
  atualizarManual,
  deletarManual,
  limparHistoricoCancelado,
  obterPrecoRaquete
} = require('../controllers/bookingController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

router.get('/disponiveis', horariosDisponiveis);
router.get('/minhas', auth, minhasReservas);
router.get('/todas', auth, admin, listarTodas);
router.post('/', auth, criar);
router.patch('/:id/cancelar', auth, cancelar);
router.get('/detalhes/:id', auth, buscarPorId);
router.post('/bloqueios', auth, admin, criarBloqueio);
router.get('/bloqueios', auth, admin, listarBloqueios);
router.delete('/bloqueios/:id', auth, admin, deletarBloqueio);
router.post('/manual', auth, admin, criarManual);
router.put('/manual/:id', auth, admin, atualizarManual);
router.delete('/manual/:id', auth, admin, deletarManual);
router.delete('/limpar-canceladas', requireAuth, admin, limparHistoricoCancelado);
router.get('/preco-raquete', obterPrecoRaquete);

module.exports = router;
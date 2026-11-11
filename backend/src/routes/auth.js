const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit'); // 💡 1. Importa o limitador

// 💡 2. Cria a regra de bloqueio (máximo 5 tentativas a cada 15 minutos)
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limite de 5 requisições por IP
  handler: (req, res) => {
    res.status(429).json({ 
      error: "Muitas tentativas de login vindas deste aparelho. Por favor, tente novamente após 15 minutos." 
    });
  },
  standardHeaders: true, 
  legacyHeaders: false,
});

// 💡 Adicionado o 'logout' aqui na desestruturação:
const { register, login, loginAdmin, loginGoogle, atualizarPerfil, obterPerfil, listarAtletas, logout, forgotPassword, resetPassword, alterarSenha, deleteAccount } = require('../controllers/authController');
const requireAuth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');
const { listar } = require('../controllers/courtController');

const limitadorAlteracaoSenha = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de alteração de senha. Tente novamente mais tarde.' }
});

router.post('/register', register);

// 💡 3. Aplica o limitador aqui na rota de login de usuários
router.post('/login', limitadorLogin, login);

// 💡 4. Aplica o limitador aqui também na rota de login do Admin
router.post('/admin/login', limitadorLogin, loginAdmin);

router.post('/google', loginGoogle);
router.put('/perfil', requireAuth, atualizarPerfil);
router.get('/perfil', requireAuth, obterPerfil);
router.get('/usuarios', requireAuth, requireAdmin, listarAtletas);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/alterar-senha', requireAuth, limitadorAlteracaoSenha, alterarSenha);
router.delete("/me/excluir-conta", requireAuth, deleteAccount);

module.exports = router;
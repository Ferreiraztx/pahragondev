const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const courtRoutes = require('./routes/courts');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const tournamentRoutes = require('./routes/tournaments');

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        connectSrc: ["'self'", "https://accounts.google.com", "*.railway.app"], // mude para a url real da sua api se necessário
        frameSrc: ["'self'", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"], // Permite fotos de perfil do Google
      },
    },
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173'
].map(url => url ? url.replace(/\/$/, '') : url) // Remove qualquer barra "/" que tenha ficado no final da string por engano
 .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Deixa explícito os métodos aceitos
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'], // Garante que os headers enviados pelo axios passem
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204 // Responde com sucesso imediatamente para o teste OPTIONS do navegador
}));

app.options(/(.*)/, cors());

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser())

app.use((req, res, next) => {
  const origin = req.get('origin');
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (mutating && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origem não autorizada.' });
  }
  next();
});

app.use('/auth', authRoutes);
app.use('/courts', courtRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payments', paymentRoutes);
app.use('/tournaments', tournamentRoutes);
app.use('/horarios', require('./routes/horarios'));

app.get('/', (req, res) => {
  res.json({ message: 'Pahragon Beach Tennis API 🎾' });
});

module.exports = app;
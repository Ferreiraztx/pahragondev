const { MercadoPagoConfig, Preference, Payment } = require('mercadopago')
const { PrismaClient } = require('@prisma/client')

// 🔄 Importa a função oficial do Resend direto do seu bookingController
const { enviarEmailConfirmacao } = require('./bookingController')

const prisma = new PrismaClient()

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
})

async function criarPagamento(req, res) {
  const { bookingId } = req.body
  
  // 💡 CORREÇÃO CRÍTICA: Captura o ID decodificado corretamente para evitar o erro 403
  const rawUserId = req.user?.id || req.userId;
  const userId = isNaN(Number(rawUserId)) ? rawUserId : Number(rawUserId);

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { court: true, user: true }
    })

    if (!booking) {
      return res.status(404).json({ error: 'Reserva não encontrada' })
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    // ==========================================================
    // TRAVA ANTI-DUPLO PAGAMENTO: Bloqueia se já estiver confirmado
    // ==========================================================
    if (booking.status === 'confirmado' || booking.status === 'pago') {
      return res.status(400).json({ 
        error: 'Esta reserva já foi paga e confirmada. Não é possível pagar novamente.' 
      })
    }

    // ==========================================================
    // VALIDAÇÃO COM FUSO HORÁRIO (UTC-3)
    // ==========================================================
    const agoraUTC = new Date()
    const agoraLocal = new Date(agoraUTC.getTime() - (3 * 60 * 60 * 1000))
    const horarioInicioReserva = new Date(booking.horaInicio)

    if (horarioInicioReserva <= agoraLocal) {
      return res.status(400).json({ 
        error: 'Não é possível realizar o pagamento de uma reserva que já passou ou está acontecendo agora.' 
      })
    }

    // 💡 MODIFICADO: Puxa o valor total exato já calculado no banco (Tempo Proporcional + Raquetes)
    const valor = Number(booking.valorTotal);

    // Configuração de expiração de 10 minutos
    const dataExpiracao = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const preference = new Preference(client)

    // 💡 Ajuste preventivo dos dados do comprador
    const nomeComprador = booking.user.nome || 'Cliente Pahragon';

    const result = await preference.create({
      body: {
        items: [
          {
            id: String(booking.id),
            title: `Reserva - ${booking.court.nome}`,
            description: `${new Date(booking.data).toLocaleDateString('pt-BR')}`,
            quantity: 1,
            unit_price: valor, // 💡 Agora enviando o preço cheio correto para o Mercado Pago
            currency_id: 'BRL'
          }
        ],
        payer: {
          name: nomeComprador,
          email: booking.user.email
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pagamento/processar?bookingId=${booking.id}`,
          failure: `${process.env.FRONTEND_URL}/pagamento/processar?bookingId=${booking.id}`,
          pending: `${process.env.FRONTEND_URL}/pagamento/processar?bookingId=${booking.id}`
        },
        external_reference: String(booking.id),
        payment_methods: {
          installments: 1
        },
        expires: true,
        expiration_date_to: dataExpiracao
      }
    })

    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: { gatewayId: result.id, valor, status: 'pendente' },
      create: {
        bookingId: booking.id,
        valor,
        metodo: 'mercadopago',
        status: 'pendente',
        gatewayId: result.id
      }
    })

    return res.json({
      initPoint: result.init_point,
      sandboxUrl: result.sandbox_init_point,
      preferenceId: result.id
    })
  } catch (err) {
    console.error('ERRO PAGAMENTO:', err)
    return res.status(500).json({ error: 'Erro ao criar pagamento' })
  }
}

// 💡 FUNÇÃO AUXILIAR INTERNA: Organiza e padroniza a formatação para o Resend
async function processarEnvioEmail(booking) {
  const dataApenasStr = new Date(booking.data).toLocaleDateString('pt-BR');
  const horaInic = new Date(booking.horaInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const horaTerm = new Date(booking.horaFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

  // Fallback para o e-mail de testes cadastrado no Sandbox do Resend
  const emailDestinatario = booking.user?.email || "mathxtzferreira@gmail.com";

  await enviarEmailConfirmacao(emailDestinatario, {
    nomeAtleta: booking.user?.nome || booking.user?.name || "Atleta",
    nomeQuadra: booking.court?.nome || "Quadra Pahragon",
    data: dataApenasStr,
    horaInicio: horaInic,
    horaFim: horaTerm
  });
}

async function webhook(req, res) {
  const { type, data } = req.body

  res.sendStatus(200);

  const paymentId = data?.id || (req.body.resource && req.body.resource.split('/').pop());

  if (type === 'payment' && paymentId) {
    try {
      const paymentClient = new Payment(client)
      const payment = await paymentClient.get({ id: String(paymentId) })

      const bookingId = Number(payment.external_reference)
      const status = payment.status
      const bookingOriginal = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true }
      })
      const amountMatches = bookingOriginal &&
        Number(payment.transaction_amount) === Number(bookingOriginal.valorTotal)
      const paymentMatches = bookingOriginal?.payment?.gatewayId === String(payment.id)

      if (status === 'approved' && amountMatches && paymentMatches) {
        const bookingAtualizado = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'confirmado' },
          include: { court: true, user: true }
        })

        await prisma.payment.update({
          where: { bookingId },
          data: { status: 'aprovado', metodo: payment.payment_type_id }
        })

        // 🚀 DISPARO OFICIAL VIA WEBHOOK DO MERCADO PAGO
        try {
          await processarEnvioEmail(bookingAtualizado)
        } catch (emailErr) {
          console.error('Erro ao enviar e-mail via webhook:', emailErr.message)
        }
      } else if (status === 'rejected') {
        await prisma.payment.update({
          where: { bookingId },
          data: { status: 'rejeitado' }
        })
      }
    } catch (err) {
      console.error('ERRO INTERNO PROCESSAMENTO WEBHOOK:', err)
    }
  }
}

async function confirmarPagamento(req, res) {
  const { bookingId } = req.body;

  const idSeguro = Number(bookingId);
  if (!idSeguro || isNaN(idSeguro)) {
    return res.status(400).json({ error: "ID de reserva inválido." });
  }

  try {
    // 1. Busca a reserva atual no banco
    let booking = await prisma.booking.findUnique({
      where: { id: idSeguro },
      include: { court: true, user: true, payment: true }
    });

    if (!booking) {
      return res.status(404).json({ error: "Reserva não encontrada." });
    }

    const userId = Number(req.userId);
    if (req.userRole !== 'admin' && booking.userId !== userId) {
      return res.status(403).json({ error: "Sem permissão." });
    }

    if (booking.status !== 'confirmado' && booking.payment?.gatewayId) {
      const paymentClient = new Payment(client);
      const gatewayPayment = await paymentClient.get({ id: String(booking.payment.gatewayId) });
      const referenceMatches = String(gatewayPayment.external_reference) === String(booking.id);
      const amountMatches = Number(gatewayPayment.transaction_amount) === Number(booking.valorTotal);

      if (gatewayPayment.status === 'approved' && referenceMatches && amountMatches) {
      booking = await prisma.booking.update({
        where: { id: idSeguro },
        data: { status: 'confirmado' },
        include: { court: true, user: true, payment: true }
      });
      
      await prisma.payment.upsert({
        where: { bookingId: idSeguro },
        update: { status: 'aprovado', valor: Number(booking.valorTotal), metodo: gatewayPayment.payment_type_id },
        create: { bookingId: idSeguro, gatewayId: String(gatewayPayment.id), valor: Number(booking.valorTotal), metodo: gatewayPayment.payment_type_id, status: 'aprovado' }
      });

        try {
          await processarEnvioEmail(booking);
        } catch (emailErr) {
          console.error('Erro ao enviar e-mail no fallback:', emailErr.message);
        }
      }
    }

    // 3. Resposta definitiva que o front-end vai ler
    if (booking.status === 'confirmado' || booking.status === 'pago') {
      return res.json({ pago: true, booking });
    }

    // Se cair aqui, a reserva continua estritamente pendente
    return res.json({ pago: false, booking });

  } catch (err) {
    console.error('ERRO CRÍTICO NA VERIFICAÇÃO DE PAGAMENTO:', err);
    return res.status(500).json({ error: 'Erro interno ao verificar pagamento' });
  }
}

module.exports = { criarPagamento, webhook, confirmarPagamento }
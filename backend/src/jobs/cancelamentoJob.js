const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

const MINUTOS_EXPIRACAO = 10;
const prisma = new PrismaClient();
const mercadoPago = process.env.MP_ACCESS_TOKEN
  ? new Payment(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }))
  : null;
const preferenciasMercadoPago = process.env.MP_ACCESS_TOKEN
  ? new Preference(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }))
  : null;

async function cancelarReservasExpiradas() {
  const limite = new Date(Date.now() - MINUTOS_EXPIRACAO * 60 * 1000);

  try {
    const expiradas = await prisma.booking.findMany({
      where: {
        status: 'pendente',
        createdAt: { lt: limite },
      },
      include: {
        payment: true
      },
    });

    let canceladas = 0;
    for (const booking of expiradas) {
      let aprovado = booking.payment?.status === 'aprovado';

      if (!aprovado && mercadoPago && booking.payment?.gatewayId) {
        try {
          const pagamento = await mercadoPago.get({ id: String(booking.payment.gatewayId) });
          const dataPagamento = pagamento.date_approved || pagamento.date_created;
          aprovado =
            pagamento.status === 'approved' &&
            String(pagamento.external_reference) === String(booking.id) &&
            Number(pagamento.transaction_amount) === Number(booking.valorTotal) &&
            dataPagamento &&
            new Date(dataPagamento).getTime() <= booking.createdAt.getTime() + MINUTOS_EXPIRACAO * 60 * 1000;

          if (aprovado) {
            await prisma.payment.update({
              where: { bookingId: booking.id },
              data: { status: 'aprovado', metodo: pagamento.payment_type_id }
            });
          }
        } catch (error) {
          console.error(`Erro ao verificar pagamento da reserva ${booking.id}:`, error.message);
        }
      }

      if (aprovado) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'confirmado' }
        });
      } else {
        if (preferenciasMercadoPago && booking.payment?.preferenceId) {
          try {
            await preferenciasMercadoPago.update({
              id: String(booking.payment.preferenceId),
              updatePreferenceRequest: {
                expires: true,
                expiration_date_to: new Date().toISOString()
              }
            });
          } catch (error) {
            console.error(`Erro ao expirar link da reserva ${booking.id}:`, error.message);
          }
        }

        if (booking.payment) {
          await prisma.payment.update({
            where: { bookingId: booking.id },
            data: { status: 'expirado' }
          });
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'cancelado' }
        });
        canceladas += 1;
      }
    }

    if (canceladas > 0) {
      console.log(`🧹 ${canceladas} reserva(s) pendente(s) expirada(s) cancelada(s) automaticamente.`);
    }
  } catch (err) {
    console.error('Erro ao cancelar reservas expiradas:', err);
  }
}

function iniciarJobCancelamento() {
  // Roda a cada 1 minuto
  cron.schedule('* * * * *', cancelarReservasExpiradas);
  console.log('⏰ Job de cancelamento automático de reservas iniciado.');
}

module.exports = { iniciarJobCancelamento, cancelarReservasExpiradas };
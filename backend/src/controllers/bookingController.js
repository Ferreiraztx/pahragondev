const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_PASS);
const crypto = require('crypto');

// 💡 Definição única e global do preço da raquete no backend (Evita discrepâncias entre atleta e balcão)
const PRECO_RAQUETE_FIXO = 10.00; 

async function obterPrecoRaquete(req, res) {
  try {
    return res.json({ preco: PRECO_RAQUETE_FIXO });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao obter preço da raquete." });
  }
}

async function validarFuncionamento(dataAgendamentoString, horaAgendamentoStr) {
  const [ano, mes, dia] = dataAgendamentoString.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia, 12)).getUTCDay();

  const horario = await prisma.horarioFuncionamento.findUnique({
    where: { diaSemana }
  });

  if (!horario || !horario.ativo) {
    return { liberado: false, motivo: 'A arena está fechada neste dia da semana.' };
  }

  if (horaAgendamentoStr < horario.horaAbertura || horaAgendamentoStr >= horario.horaFechamento) {
    return { liberado: false, motivo: `Fora do horário de funcionamento (${horario.horaAbertura} às ${horario.horaFechamento}).` };
  }

  return { liberado: true };
}

// Criar reserva (Módulo do Atleta integrado com Aluguel de Raquetes e cálculo automático)
async function criar(req, res) {
  const { courtId, data, horaInicio, horaFim, qtdRaquetes } = req.body;
  
  const rawUserId = req.user?.id || req.userId;
  const userId = isNaN(Number(rawUserId)) ? rawUserId : Number(rawUserId);

  try {
    const agoraBR = new Date(new Date().getTime() - (3 * 60 * 60 * 1000));
    const ano = agoraBR.getUTCFullYear();
    const mes = String(agoraBR.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(agoraBR.getUTCDate()).padStart(2, '0');
    const hojeString = `${ano}-${mes}-${dia}`;
    
    const horaAtualStr = `${String(agoraBR.getUTCHours()).padStart(2, '0')}:${String(agoraBR.getUTCMinutes()).padStart(2, '0')}`;

    const dataAgendamentoString = data.split('T')[0]; 
    const horaAgendamentoStr = horaInicio.split('T')[1].substring(0, 5); 

    if (dataAgendamentoString < hojeString) {
      return res.status(400).json({ error: 'Não é possível agendar em um dia que já passou.' });
    }

    if (dataAgendamentoString === hojeString && horaAgendamentoStr <= horaAtualStr) {
      return res.status(400).json({ error: 'Não é possível agendar em um horário que já passou hoje.' });
    }

    const dataAgendamento = new Date(req.body.data);
    const hoje = new Date();
    const hojeStringNormal = hoje.toISOString().split('T')[0];
    const [anoAgendamento, mesAgendamento, diaAgendamento] = dataAgendamentoString.split('-').map(Number);
    const dataBusca = new Date(Date.UTC(
      anoAgendamento,
      mesAgendamento - 1,
      diaAgendamento,
      12,
      0,
      0
    ));

    if (Number.isNaN(dataBusca.getTime())) {
      return res.status(400).json({ error: 'Data de agendamento inválida.' });
    }
    
    if (dataAgendamentoString < hojeStringNormal) {
      return res.status(400).json({ error: "Não é possível agendar em datas passadas." });
    }

    const checkFuncionamento = await validarFuncionamento(dataAgendamentoString, horaAgendamentoStr);
    if (!checkFuncionamento.liberado) {
      return res.status(400).json({ error: checkFuncionamento.motivo });
    }

    // TRAVA COMPLEMENTAR: Verifica se o horário escolhido não está bloqueado
    const bloqueiosAtivos = await prisma.bloqueioQuadra.findMany({
      where: {
        quadraId: Number(courtId),
        data: dataBusca
      }
    });

    const estaNoBloqueio = bloqueiosAtivos.some(bloqueio => {
      return horaAgendamentoStr >= bloqueio.horaInicio && horaAgendamentoStr < bloqueio.horaFim;
    });

    if (estaNoBloqueio) {
      return res.status(400).json({ error: 'Este horário está indisponível ou bloqueado para manutenção.' });
    }

    // Busca o valor por hora da quadra para cálculo matemático confiável
    const quadraDados = await prisma.court.findUnique({ where: { id: Number(courtId) } });
    if (!quadraDados) {
      return res.status(404).json({ error: 'Quadra não encontrada.' });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const lockKey = `${courtId}-${dataAgendamentoString}-${horaInicio}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;

      const dezMinutosAtras = new Date(Date.now() - 10 * 60 * 1000);

      const [anoStr, mesStr, diaStr] = dataAgendamentoString.split('-');
      const [hInicioStr, mInicioStr] = horaAgendamentoStr.split(':');
      const [hFimStr, mFimStr] = horaFim.split('T')[1].substring(0, 5).split(':');

      const dataFormatada = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), 12, 0, 0));

      const inicioFormatado = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), Number(hInicioStr) + 3, Number(mInicioStr), 0));
      const fimFormatado = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), Number(hFimStr) + 3, Number(mFimStr), 0));

      const conflito = await tx.booking.findFirst({
        where: {
          courtId: Number(courtId),
          data: dataFormatada,
          OR: [
            { status: 'pago' },
            { status: 'confirmado' },
            {
              status: 'pendente',
              createdAt: { gte: dezMinutosAtras }
            }
          ],
          AND: [
            {
              OR: [
                { horaInicio: { lte: inicioFormatado }, horaFim: { gt: inicioFormatado } },
                { horaInicio: { lt: fimFormatado }, horaFim: { gte: fimFormatado } },
                { horaInicio: { gte: inicioFormatado }, horaFim: { lte: fimFormatado } }
              ]
            }
          ]
        }
      });

      if (conflito) {
        throw new Error('SLOT_TAKEN');
      }

      // Calcula as frações financeiras com os novos campos de raquete
      const quantidadeDeRaquetes = Number(qtdRaquetes || 0);
      const totalHoras = (fimFormatado - inicioFormatado) / (1000 * 60 * 60);
      const valorTotalCalculado = (quadraDados.precoPorHora * totalHoras) + (quantidadeDeRaquetes * PRECO_RAQUETE_FIXO);

      return tx.booking.create({
        data: {
          userId, 
          courtId: Number(courtId),
          data: dataFormatada,
          horaInicio: inicioFormatado,
          horaFim: fimFormatado,
          status: 'pendente',
          qtdRaquetes: quantidadeDeRaquetes,
          precoRaquete: PRECO_RAQUETE_FIXO,
          valorTotal: valorTotalCalculado
        },
        include: { court: true, user: true }
      });
    });

    return res.status(201).json(booking);
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'Horário já reservado' });
    }
    console.error('ERRO AO CRIAR RESERVA:', err);
    return res.status(500).json({ error: 'Erro ao criar reserva' });
  }
}

async function criarManual(req, res) {
  const { nomeAtleta, data, horarioInicio, horarioFim, courtId, statusPagamento, qtdRaquetes } = req.body;

  try {
    const dataAgendamentoString = data.split('T')[0];

    const agoraBR = new Date(new Date().getTime() - (3 * 60 * 60 * 1000));
    const hojeString = `${agoraBR.getUTCFullYear()}-${String(agoraBR.getUTCMonth() + 1).padStart(2, '0')}-${String(agoraBR.getUTCDate()).padStart(2, '0')}`;
    const horaAtualStr = `${String(agoraBR.getUTCHours()).padStart(2, '0')}:${String(agoraBR.getUTCMinutes()).padStart(2, '0')}`;

    if (dataAgendamentoString < hojeString) {
      return res.status(400).json({ error: 'Não é possível agendar em um dia que já passou.' });
    }
    if (dataAgendamentoString === hojeString && horarioInicio <= horaAtualStr) {
      return res.status(400).json({ error: 'Não é possível agendar em um horário que já passou hoje.' });
    }

    const checkFuncionamento = await validarFuncionamento(dataAgendamentoString, horarioInicio);
    if (!checkFuncionamento.liberado) {
      return res.status(400).json({ error: checkFuncionamento.motivo });
    }

    // TRAVA MATEMÁTICA: Impede agendamento se houver Torneio
    const todosTorneios = await prisma.tournament.findMany();
    
    const [hIniM, mIniM] = horarioInicio.split(':').map(Number);
    const [hFimM, mFimM] = horarioFim.split(':').map(Number);
    const minutosInicioManual = hIniM * 60 + mIniM;
    const minutosFimManual = hFimM * 60 + mFimM;

    const temTorneio = todosTorneios.some(t => {
      const quadrasArray = t.quadras || [];
      const afetaTodas = quadrasArray.length === 0;
      const pertenceAEstaQuadra = afetaTodas || quadrasArray.includes(String(courtId)) || quadrasArray.includes(String(Number(courtId)));
      
      if (!pertenceAEstaQuadra) return false;

      const dataTorneioStr = new Date(t.data).toISOString().split('T')[0];
      const dataFimTorneioStr = new Date(t.dataFim).toISOString().split('T')[0];
      
      const diaBate = dataAgendamentoString >= dataTorneioStr && dataAgendamentoString <= dataFimTorneioStr;
      if (!diaBate) return false;

      const incioTorneioStr = new Date(t.data).toISOString().substring(11, 16);
      const fimTorneioStr = new Date(t.dataFim).toISOString().substring(11, 16);

      const [hIniT, mIniT] = incioTorneioStr.split(':').map(Number);
      const [hFimT, mFimT] = fimTorneioStr.split(':').map(Number);
      
      const minutosInicioTorneio = hIniT * 60 + mIniT;
      const minutosFimTorneio = hFimT * 60 + mFimT;

      return (minutosInicioManual < minutosFimTorneio && minutosFimManual > minutosInicioTorneio);
    });

    if (temTorneio) {
      return res.status(400).json({ error: 'Bloqueio! Este horário está reservado para um Torneio nesta quadra.' });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const lockKey = `${courtId}-${dataAgendamentoString}-${horarioInicio}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;

      const [anoStr, mesStr, diaStr] = dataAgendamentoString.split('-');
      const dataFormatada = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), 12, 0, 0));

      const [hInicio, mInicio] = horarioInicio.split(':');
      const [hFim, mFim] = horarioFim.split(':');

      const inicioFormatado = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), Number(hInicio) + 3, Number(mInicio), 0));
      const fimFormatado = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), Number(hFim) + 3, Number(mFim), 0));

      const conflito = await tx.booking.findFirst({
        where: {
          courtId: Number(courtId),
          data: dataFormatada,
          OR: [{ status: 'confirmado' }, { status: 'pago' }, { status: 'pendente' }],
          AND: [
            {
              OR: [
                { horaInicio: { lte: inicioFormatado }, horaFim: { gt: inicioFormatado } },
                { horaInicio: { lt: fimFormatado }, horaFim: { gte: fimFormatado } },
                { horaInicio: { gte: inicioFormatado }, horaFim: { lte: fimFormatado } }
              ]
            }
          ]
        }
      });

      if (conflito) throw new Error('SLOT_TAKEN');

      const quadra = await tx.court.findUnique({ where: { id: Number(courtId) } });
      const totalHoras = (fimFormatado - inicioFormatado) / (1000 * 60 * 60);
      
      const quantidadeDeRaquetes = Number(qtdRaquetes || 0);
      const valorCalculadoGeral = ((quadra?.precoPorHora || 0) * totalHoras) + (quantidadeDeRaquetes * PRECO_RAQUETE_FIXO);

      const novoBooking = await tx.booking.create({
        data: {
          userId: null, 
          courtId: Number(courtId),
          data: dataFormatada,
          horaInicio: inicioFormatado,
          horaFim: fimFormatado,
          status: statusPagamento === 'pago' ? 'confirmado' : 'pendente',
          nomeAvulso: nomeAtleta,
          qtdRaquetes: quantidadeDeRaquetes,
          precoRaquete: PRECO_RAQUETE_FIXO,
          valorTotal: valorCalculadoGeral
        },
        include: { court: true, user: true }
      });

      if (statusPagamento === 'pago') {
        await tx.payment.create({
          data: {
            bookingId: novoBooking.id,
            valor: valorCalculadoGeral,
            metodo: 'dinheiro_balcao',
            status: 'aprovado'
          }
        });
      }

      return novoBooking;
    });

    if (statusPagamento === 'pago') {
      const dataApenasStr = new Date(booking.data).toLocaleDateString('pt-BR');
      const horaInic = new Date(booking.horaInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const horaTerm = new Date(booking.horaFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

      await enviarEmailConfirmacao(process.env.RESEND_USER_TEST || "mathxtzferreira@gmail.com", {
        nomeAtleta: booking.nomeAvulso || "Atleta",
        nomeQuadra: booking.court?.nome || "Quadra Pahragon",
        data: dataApenasStr,
        horaInicio: horaInic,
        horaFim: horaTerm
      });
    }

    return res.status(201).json(booking);
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') return res.status(409).json({ error: 'Este horário já está reservado.' });
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar reserva no balcão.' });
  }
}

async function enviarEmailConfirmacao(emailAtleta, dadosReserva) {
  const { nomeAtleta, nomeQuadra, data, horaInicio, horaFim } = dadosReserva;

  try {
    await resend.emails.send({
      from: "Pahragon Beach Tennis <onboarding@resend.dev>", 
      to: emailAtleta, 
      subject: "Sua quadra está garantida! 🎾 — Pahragon",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e2221; background-color: #faf9f6;">
          <h1 style="font-size: 24px; font-weight: 900; tracking-tight: -0.04em;">Pahragon <span style="font-size: 10px; color: #0d9488;">BEACH TENNIS</span></h1>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-top: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <h2 style="font-size: 18px; font-weight: 800; margin-top: 0; color: #0f172a;">Reserva Confirmada, ${nomeAtleta}!</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">Seu horário foi agendado com sucesso em nossa arena. Confira os detalhes:</p>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 11px; width: 35%;">Quadra</td>
                <td style="padding: 6px 0; color: #1e2221; font-weight: bold;">${nomeQuadra}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 11px;">Data</td>
                <td style="padding: 6px 0; color: #1e2221; font-weight: bold;">${data}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 11px;">Horário</td>
                <td style="padding: 6px 0; color: #1e2221; font-weight: bold;">${horaInicio} às ${horaFim}</td>
              </tr>
            </table>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
              Prepare a raquete! Chegue com alguns minutos de antecedência para aproveitar ao máximo seu tempo em quadra. 🏝️
            </p>
          </div>
        </div>
      `,
    });
    console.log("✉️ E-mail de confirmação de quadra enviado com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar e-mail de reserva:", error);
  }
}

async function atualizarManual(req, res) {
  const { id } = req.params;
  const { nomeAtleta, data, horarioInicio, horarioFim, courtId, statusPagamento, qtdRaquetes } = req.body;

  try {
    const dataAgendamentoString = data.split('T')[0];
    
    // TRAVA MATEMÁTICA NA EDIÇÃO: Impede salvar por cima de Torneio
    const todosTorneios = await prisma.tournament.findMany();
    
    const [hIniM, mIniM] = horarioInicio.split(':').map(Number);
    const [hFimM, mFimM] = horarioFim.split(':').map(Number);
    const minutosInicioManual = hIniM * 60 + mIniM;
    const minutosFimManual = hFimM * 60 + mFimM;

    const temTorneio = todosTorneios.some(t => {
      const quadrasArray = t.quadras || [];
      const afetaTodas = quadrasArray.length === 0;
      const pertenceAEstaQuadra = afetaTodas || quadrasArray.includes(String(courtId)) || quadrasArray.includes(String(Number(courtId)));
      
      if (!pertenceAEstaQuadra) return false;

      const dataTorneioStr = new Date(t.data).toISOString().split('T')[0];
      const dataFimTorneioStr = new Date(t.dataFim).toISOString().split('T')[0];
      
      const diaBate = dataAgendamentoString >= dataTorneioStr && dataAgendamentoString <= dataFimTorneioStr;
      if (!diaBate) return false;

      const incioTorneioStr = new Date(t.data).toISOString().substring(11, 16);
      const fimTorneioStr = new Date(t.dataFim).toISOString().substring(11, 16);

      const [hIniT, mIniT] = incioTorneioStr.split(':').map(Number);
      const [hFimT, mFimT] = fimTorneioStr.split(':').map(Number);
      
      const minutosInicioTorneio = hIniT * 60 + mIniT;
      const minutosFimTorneio = hFimT * 60 + mFimT;

      return (minutosInicioManual < minutosFimTorneio && minutosFimManual > minutosInicioTorneio);
    });

    if (temTorneio) {
      return res.status(400).json({ error: 'Bloqueio! O novo horário escolhido coincide com um Torneio ativo nesta quadra.' });
    }

    const [anoStr, mesStr, diaStr] = dataAgendamentoString.split('-');
    const [hInicio, mInicio] = horarioInicio.split(':');
    const [hFim, mFim] = horarioFim.split(':');

    const dataFormatada = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), 12, 0, 0));
    const inicioFormatado = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), Number(hInicio) + 3, Number(mInicio), 0));
    const fimFormatado = new Date(Date.UTC(Number(anoStr), Number(mesStr) - 1, Number(diaStr), Number(hFim) + 3, Number(mFim), 0));

    const novoStatus = statusPagamento === 'pago' ? 'confirmado' : 'pendente';
    const quantidadeDeRaquetes = Number(qtdRaquetes || 0);

    const reservaAtualizada = await prisma.$transaction(async (tx) => {
      const quadra = await tx.court.findUnique({ where: { id: Number(courtId) } });
      const totalHoras = (fimFormatado - inicioFormatado) / (1000 * 60 * 60);
      const valorCalculadoGeral = ((quadra?.precoPorHora || 0) * totalHoras) + (quantidadeDeRaquetes * PRECO_RAQUETE_FIXO);

      const booking = await tx.booking.update({
        where: { id: Number(id) },
        data: {
          courtId: Number(courtId),
          data: dataFormatada,
          horaInicio: inicioFormatado,
          horaFim: fimFormatado,
          status: novoStatus,
          nomeAvulso: nomeAtleta,
          qtdRaquetes: quantidadeDeRaquetes,
          precoRaquete: PRECO_RAQUETE_FIXO,
          valorTotal: valorCalculadoGeral
        },
        include: { court: true, user: true }
      });

      if (statusPagamento === 'pago') {
        await tx.payment.deleteMany({ where: { bookingId: booking.id } });
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            valor: valorCalculadoGeral,
            metodo: 'dinheiro_balcao',
            status: 'aprovado'
          }
        });
      } else {
        await tx.payment.deleteMany({ where: { bookingId: booking.id } });
      }

      return booking;
    });

    if (statusPagamento === 'pago') {
      const dataApenasStr = new Date(reservaAtualizada.data).toLocaleDateString('pt-BR');
      const horaInic = new Date(reservaAtualizada.horaInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const horaTerm = new Date(reservaAtualizada.horaFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

      const emailDestinatario = reservaAtualizada.user?.email || "mathxtzferreira@gmail.com";

      await enviarEmailConfirmacao(emailDestinatario, {
        nomeAtleta: reservaAtualizada.nomeAvulso || reservaAtualizada.user?.nome || "Atleta",
        nomeQuadra: reservaAtualizada.court?.nome || "Quadra Pahragon",
        data: dataApenasStr,
        horaInicio: horaInic,
        horaFim: horaTerm
      });
    }

    return res.json(reservaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar reserva manual:", error);
    return res.status(500).json({ error: "Erro ao atualizar reserva." });
  }
}

async function deletarManual(req, res) {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { bookingId: Number(id) }
      });

      await tx.booking.delete({
        where: { id: Number(id) }
      });
    });

    return res.json({ message: 'Reserva e fluxo financeiro removidos com sucesso.' });
  } catch (error) {
    console.error("Erro ao deletar reserva manual:", error);
    return res.status(500).json({ error: "Erro ao deletar reserva." });
  }
}

async function minhasReservas(req, res) {
  const rawUserId = req.user?.id || req.userId;
  const userId = isNaN(Number(rawUserId)) ? rawUserId : Number(rawUserId);

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: { court: true },
      orderBy: [
        { data: 'desc' },
        { horaInicio: 'desc' }
      ]
    });
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar reservas' });
  }
}

async function limparHistoricoCancelado(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const canceladas = await prisma.booking.findMany({
      where: { status: 'cancelado' },
      select: { id: true }
    });

    const ids = canceladas.map(r => r.id);

    if (ids.length === 0) {
      return res.json({ message: 'Nenhuma reserva cancelada para limpar!' });
    }

    await prisma.payment.deleteMany({
      where: { bookingId: { in: ids } }
    });

    await prisma.booking.deleteMany({
      where: { id: { in: ids } }
    });

    return res.json({ message: `Sucesso! ${ids.length} reservas canceladas foram limpas.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao limpar o histórico.' });
  }
}

async function cancelar(req, res) {
  const { id } = req.params;
  const rawUserId = req.user?.id || req.userId;
  const userId = isNaN(Number(rawUserId)) ? rawUserId : Number(rawUserId);

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Reserva não encontrada' });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Sem permissão para cancelar esta reserva' });
    }

    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: 'cancelado' }
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cancelar reserva' });
  }
}

async function horariosDisponiveis(req, res) {
  const { courtId, data } = req.query;
  const horariocut = Number(courtId);

  const horariosBase = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', 
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
  ];

  try {
    if (!Number.isInteger(horariocut) || horariocut <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(data))) {
      return res.status(400).json({ error: 'Quadra ou data inválida.' });
    }

    const dezMinutosAtras = new Date(Date.now() - 10 * 60 * 1000);
    
    await prisma.booking.updateMany({
      where: {
        status: 'pendente',
        createdAt: { lt: dezMinutosAtras }
      },
      data: { status: 'cancelado' }
    });

    const dataSelecionadaString = data.split('T')[0];
    const [anoD, mesD, diaD] = dataSelecionadaString.split('-');
    const dataBusca = new Date(Date.UTC(Number(anoD), Number(mesD) - 1, Number(diaD), 12, 0, 0));
    if (Number.isNaN(dataBusca.getTime())) {
      return res.status(400).json({ error: 'Data inválida.' });
    }

    const reservas = await prisma.booking.findMany({
      where: {
        courtId: Number(courtId),
        data: dataBusca,
        OR: [
          { status: 'pago' },
          { status: 'confirmado' },
          { status: 'pendente', createdAt: { gte: dezMinutosAtras } }
        ]
      }
    });

    const agoraBR = new Date(new Date().getTime() - (3 * 60 * 60 * 1000));
    const hojeString = `${agoraBR.getUTCFullYear()}-${String(agoraBR.getUTCMonth() + 1).padStart(2, '0')}-${String(agoraBR.getUTCDate()).padStart(2, '0')}`;

    const diaSemanaConsulta = new Date(Date.UTC(Number(anoD), Number(mesD) - 1, Number(diaD), 12)).getUTCDay();
    
    const horarioDoDia = await prisma.horarioFuncionamento.findUnique({
      where: { diaSemana: diaSemanaConsulta }
    });

    if (!horarioDoDia || !horarioDoDia.ativo) {
      return res.json({ data, courtId, disponiveis: [], fechado: true });
    }

    let disponiveis = horariosBase.filter(h => h >= horarioDoDia.horaAbertura && h < horarioDoDia.horaFechamento);

    const bloqueios = await prisma.bloqueioQuadra.findMany({
      where: {
        quadraId: Number(courtId),
        data: dataBusca
      }
    });

    if (bloqueios.length > 0) {
      disponiveis = disponiveis.filter(hora => {
        return !bloqueios.some(b => hora >= b.horaInicio && hora < b.horaFim);
      });
    }

    const todosTorneios = await prisma.tournament.findMany();

    const torneiosDoDiaDessaQuadra = todosTorneios.filter(t => {
      const quadrasArray = t.quadras || [];
      const afetaTodasAsQuadras = quadrasArray.length === 0;
      
      const pertenceAEstaQuadra = afetaTodasAsQuadras || 
                                  quadrasArray.includes(String(courtId)) || 
                                  quadrasArray.includes(String(horariocut));
      
      if (!pertenceAEstaQuadra) return false;

      const dataTorneioStr = new Date(t.data).toISOString().split('T')[0];
      const dataFimTorneioStr = new Date(t.dataFim).toISOString().split('T')[0];
      
      return dataSelecionadaString >= dataTorneioStr && dataSelecionadaString <= dataFimTorneioStr;
    });

    if (torneiosDoDiaDessaQuadra.length > 0) {
      disponiveis = disponiveis.filter(hora => {
        const [h, m] = hora.split(':').map(Number);
        const horaMinutoTexto = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        return !torneiosDoDiaDessaQuadra.some(t => {
          const incioTexto = new Date(t.data).toISOString().substring(11, 16);
          const fimTexto = new Date(t.dataFim).toISOString().substring(11, 16);
          
          return horaMinutoTexto >= incioTexto && horaMinutoTexto < fimTexto;
        });
      });
    }

    if (dataSelecionadaString === hojeString) {
      const horaAtual = agoraBR.getUTCHours();
      const minutoAtual = agoraBR.getUTCMinutes();

      disponiveis = disponiveis.filter(h => {
        const [hBotao, mBotao] = h.split(':').map(Number);
        if (hBotao > horaAtual) return true;
        if (hBotao === horaAtual && mBotao > minutoAtual) return true;
        return false;
      });
    }

    disponiveis = disponiveis.filter(horario => {
      const [h, m] = horario.split(':').map(Number);
      const inicioSugerido = new Date(Date.UTC(Number(anoD), Number(mesD) - 1, Number(diaD), h + 3, m, 0));
      const fimSugerido = new Date(inicioSugerido.getTime() + (30 * 60 * 1000)); 

      return !reservas.some(r => {
        const rInicio = new Date(r.horaInicio);
        const rFim = new Date(r.horaFim);
        return (inicioSugerido < rFim && fimSugerido > rInicio);
      });
    });

    disponiveis = disponiveis.filter((h) => {
      const [hora, min] = h.split(':').map(Number);
      const blocoAnterior = min === 30 ? `${String(hora).padStart(2, '0')}:00` : `${String(hora - 1).padStart(2, '0')}:30`;
      const blocoProximo = min === 30 ? `${String(hora + 1).padStart(2, '0')}:00` : `${String(hora).padStart(2, '0')}:30`;
      return disponiveis.includes(blocoAnterior) || disponiveis.includes(blocoProximo);
    });

    return res.json({ data, courtId, disponiveis });
  } catch (err) {
    console.error('ERRO AO BUSCAR HORÁRIOS:', err);
    return res.status(500).json({ error: 'Erro ao buscar horários' });
  }
}

async function listarTodas(req, res) {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        court: true,
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            cpf: true,
            cidade: true,
            estado: true
          }
        }
      },
      orderBy: { data: 'asc' }
    });

    const bloqueios = await prisma.bloqueioQuadra.findMany({
      include: { quadra: true }
    });

    const torneios = await prisma.tournament.findMany();

    const agendaCompleta = bookings.map(b => {
      const dataApenasStr = new Date(b.data).toISOString().split('T')[0];
      const horaInic = new Date(b.horaInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const horaFim = new Date(b.horaFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

      return {
        id: b.id,
        data: dataApenasStr,
        horaInicioStr: horaInic, 
        horaFimStr: horaFim,     
        courtId: b.courtId,
        status: b.status,
        nomeAvulso: b.nomeAvulso || b.user?.name || b.user?.nome || 'Atleta',
        tipo: 'reserva',
        court: b.court,
        user: b.user,
        qtdRaquetes: b.qtdRaquetes, // 💡 IMPORTANTE: Devolvendo a quantidade para carregar perfeitamente no Front-end
        valorTotal: b.valorTotal
      };
    });

    bloqueios.forEach(b => {
      agendaCompleta.push({
        id: `bloqueio-${b.id}`,
        data: b.data, 
        horaInicioStr: b.horaInicio, 
        horaFimStr: b.horaFim,      
        courtId: b.quadraId,
        status: 'confirmado',
        nomeAvulso: `🚧 Bloqueio: ${b.motivo || 'Manutenção'}`,
        tipo: 'bloqueio',
        court: b.quadra
      });
    });

    torneios.forEach(t => {
      const dataInicioStr = new Date(t.data).toISOString().split('T')[0];
      const horaInic = new Date(t.data).toISOString().substring(11, 16);
      const horaFim = new Date(t.dataFim).toISOString().substring(11, 16);
      const quadrasArray = t.quadras || [];

      const criarObjetoTorneio = (qId) => ({
        id: `torneio-${t.id}-${qId}`,
        data: dataInicioStr,
        horaInicioStr: horaInic, 
        horaFimStr: horaFim,   
        courtId: Number(qId),
        status: 'confirmado',
        nomeAvulso: `🏆 Torneio: ${t.nome}`,
        tipo: 'torneio'
      });

      if (quadrasArray.length === 0) {
        [1, 2, 3, 4].forEach(qId => {
          agendaCompleta.push(criarObjetoTorneio(qId));
        });
      } else {
        quadrasArray.forEach(qId => {
          agendaCompleta.push(criarObjetoTorneio(qId));
        });
      }
    });

    return res.json(agendaCompleta);
  } catch (err) {
    console.error('Erro ao montar lista completa do calendário:', err);
    return res.status(500).json({ error: 'Erro ao listar reservas da agenda.' });
  }
}

async function criarBloqueio(req, res) {
  const { quadraId, data, horaInicio, horaFim, motivo } = req.body;
  try {
    const bloqueio = await prisma.bloqueioQuadra.create({
      data: {
        quadraId: Number(quadraId),
        data, 
        horaInicio, 
        horaFim, 
        motivo
      }
    });
    return res.status(201).json(bloqueio);
  } catch (err) {
    return res.status(500).json({ error: "Erro ao criar bloqueio" });
  }
}

async function listarBloqueios(req, res) {
  try {
    const bloqueios = await prisma.bloqueioQuadra.findMany({
      include: { quadra: true },
      orderBy: { data: 'asc' }
    });
    return res.json(bloqueios);
  } catch (err) {
    console.error("Erro ao listar bloqueios:", err);
    return res.status(500).json({ error: "Erro ao listar bloqueios" });
  }
}

async function deletarBloqueio(req, res) {
  const { id } = req.params;
  try {
    await prisma.bloqueioQuadra.delete({
      where: { id: Number(id) }
    });
    return res.json({ message: "Bloqueio removido com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar bloqueio:", err);
    return res.status(500).json({ error: "Erro ao remover bloqueio" });
  }
}

async function buscarPorId(req, res) {
  try {
    const { id } = req.params;
    
    const bookingId = Number(id);
    if (isNaN(bookingId)) {
        return res.status(400).json({ error: "ID inválido" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        court: true,
        user: true 
      }
    });

    if (!booking) {
      return res.status(404).json({ error: "Reserva não encontrada" });
    }

    const userId = Number(req.userId);
    if (req.userRole !== 'admin' && booking.userId !== userId) {
      return res.status(403).json({ error: "Sem permissão para consultar esta reserva." });
    }

    if (booking.user) {
      delete booking.user.senha;
      delete booking.user.passwordResetToken;
      delete booking.user.passwordResetExpires;
    }

    return res.json(booking);
  } catch (error) {
    console.error("Erro em buscarPorId:", error);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}

module.exports = { 
  criar, 
  criarManual,
  minhasReservas, 
  cancelar, 
  horariosDisponiveis, 
  listarTodas, 
  buscarPorId, 
  criarBloqueio, 
  listarBloqueios, 
  deletarBloqueio,
  atualizarManual,
  deletarManual,
  limparHistoricoCancelado,
  enviarEmailConfirmacao,
  obterPrecoRaquete
};
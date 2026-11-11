/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function PagamentoAguardando() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [tempoRestante, setTempoRestante] = useState("10:00");
  const [initPoint, setInitPoint] = useState("");
  const [valorTotal, setValorTotal] = useState(0);

  useEffect(() => {
    if (!bookingId) {
      setErro("Reserva não identificada.");
      setLoading(false);
      return;
    }

    async function inicializarPagamento() {
      try {
        // 💡 Busca os detalhes da reserva salvos no banco de dados
        const resBooking = await api.get(`/bookings/detalhes/${bookingId}`);

        // 💡 MODIFICADO: Puxa o valor total e exato já calculado pelo backend (Quadra + Raquetes)
        const totalOficial = resBooking.data.valorTotal || resBooking.data.court?.precoPorHora || 0;
        setValorTotal(Number(totalOficial));

        // Fluxo do Mercado Pago
        const resPagamento = await api.post("/payments/criar-preferencia", {
          bookingId,
        });

        if (resPagamento.data.initPoint) {
          setInitPoint(resPagamento.data.initPoint);
        } else {
          throw new Error("Link não gerado pelo servidor");
        }

        setLoading(false);
      } catch (err) {
        console.error("Erro geral na inicialização:", err);
        setErro(
          err.response?.data?.error ||
            "Erro ao conectar com o Mercado Pago. Tente novamente.",
        );
        setLoading(false);
      }
    }

    inicializarPagamento();
  }, [bookingId]);

  // Cancela a reserva no banco, liberando o horário para outras pessoas
  async function liberarReserva() {
    try {
      await api.patch(`/bookings/${bookingId}/cancelar`);
    } catch (err) {
      console.error("Erro ao cancelar reserva:", err);
    }
  }

  // Cronômetro regressivo de 10 minutos
  useEffect(() => {
    const tempoFinalSalvo = localStorage.getItem(`tempoFim_${bookingId}`);

    const tempoFim = tempoFinalSalvo
      ? parseInt(tempoFinalSalvo)
      : new Date().getTime() + 10 * 60 * 1000;

    if (!tempoFinalSalvo) {
      localStorage.setItem(`tempoFim_${bookingId}`, tempoFim);
    }

    const intervalo = setInterval(async () => {
      const agora = new Date().getTime();
      const restante = tempoFim - agora;

      if (restante <= 0) {
        clearInterval(intervalo);
        localStorage.removeItem(`tempoFim_${bookingId}`);
        await liberarReserva();
        navigate("/agendar");
      } else {
        const m = String(Math.floor(restante / 1000 / 60)).padStart(2, "0");
        const s = String(Math.floor((restante / 1000) % 60)).padStart(2, "0");
        setTempoRestante(`${m}:${s}`);
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [navigate, bookingId]);

  async function cancelarEVoltar() {
    localStorage.removeItem(`tempoFim_${bookingId}`);
    await liberarReserva();
    navigate("/agendar");
  }

  function irParaMercadoPago() {
    console.log("Conteúdo de initPoint:", initPoint);

    if (initPoint) {
      window.location.href = initPoint;
    } else {
      alert("Erro: O link de pagamento não foi gerado. Verifique o console.");
    }
  }

  // Loading Screen no mesmo padrão Off-White limpo
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center">
        <p className="text-[#1e2221] font-bold text-lg animate-pulse tracking-tight">
          Gerando Pix do Mercado Pago...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2d3130] antialiased tracking-tight font-sans flex flex-col items-center justify-center px-6 py-12">
      <main className="max-w-md w-full space-y-6">
        {erro && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl text-center font-medium">
            {erro}
          </div>
        )}

        {/* Card Principal */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-8 shadow-sm relative overflow-hidden">
          {/* Identidade Visual Discreta no topo do card */}
          <div className="flex items-center justify-center gap-1.5 opacity-40">
            <span className="font-black text-sm tracking-tighter text-[#1e2221]">
              Pahragon
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-teal-600">
              Beach Tennis
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-[#1e2221] font-black text-2xl tracking-tighter">
              Reserva Quase Pronta!
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
              Seguramos o seu horário na areia. Conclua o pagamento antes que o
              tempo se encerre para não perder a vaga.
            </p>
          </div>

          {/* Cronômetro Regressivo Estilo Caixa de Dados do Admin */}
          <div className="bg-teal-50/50 border border-teal-100 rounded-2xl py-6 max-w-[220px] mx-auto shadow-inner text-center">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block mb-1">
              Tempo Restante
            </span>
            <span className="text-4xl font-mono font-bold text-[#1e2221] tracking-tighter block">
              {tempoRestante}
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3 pt-2">
            <button
              onClick={irParaMercadoPago}
              className="w-full bg-[#1e2221] hover:bg-black text-white font-bold py-4 rounded-xl transition shadow-md active:scale-[0.99] text-sm tracking-wide"
            >
              Ir para o Mercado Pago • R$ {valorTotal.toFixed(2)}
            </button>

            <button
              onClick={cancelarEVoltar}
              className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider py-2 transition cursor-pointer"
            >
              ← Cancelar e liberar horário
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
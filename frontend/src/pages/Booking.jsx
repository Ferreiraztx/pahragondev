import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Booking() {
  const [quadras, setQuadras] = useState([]);
  const [quadraSelecionada, setQuadraSelecionada] = useState("");

  // 💡 MODIFICADO: O preço agora inicia em 0 e busca dinamicamente do backend
  const [precoRaquete, setPrecoRaquete] = useState(0);
  const [qtdRaquetes, setQtdRaquetes] = useState(0);

  // Função auxiliar para obter a string correta de HOJE no fuso horário local (AAAA-MM-DD)
  const obterDataHojeLocal = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };

  const [data, setData] = useState(obterDataHojeLocal);

  // Lista com TODOS os blocos possíveis do dia (Horário de funcionamento da quadra)
  const gradeCompletaDoDia = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30",
  ];

  const [horariosProcessados, setHorariosProcessados] = useState([]);
  const [blocosSelecionados, setBlocosSelecionados] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [modalAviso, setModalAviso] = useState({ visivel: false, texto: "" });

  const navigate = useNavigate();

  // Encontra o objeto da quadra selecionada atualmente para saber o preço dela
  const dadosQuadraAtual = quadras.find(
    (q) => String(q.id) === String(quadraSelecionada),
  );

  // Função para calcular o valor total (Horas de Quadra + Aluguel de Raquetes)
  const calcularTotalGeral = () => {
    if (!dadosQuadraAtual) return 0;
    // Como cada bloco representa 30 minutos, multiplicamos o preço por hora por (blocos / 2)
    const valorQuadra =
      (blocosSelecionados.length / 2) * dadosQuadraAtual.precoPorHora;
    const valorRaquetes = qtdRaquetes * precoRaquete; // 💡 MODIFICADO: Multiplicando pelo preço vindo da API
    return valorQuadra + valorRaquetes;
  };

  async function buscarHorarios() {
    if (!quadraSelecionada || !data) return;
    try {
      const res = await api.get(
        `/bookings/disponiveis?courtId=${quadraSelecionada}&data=${data}`,
      );

      const horariosDisponiveisVindoDoBanco = res.data.disponiveis || [];

      const agora = new Date();
      const hojeStr = obterDataHojeLocal();
      const horaAtual = agora.getHours();
      const minutoAtual = agora.getMinutes();

      const mapeados = gradeCompletaDoDia.map((horario) => {
        let estaDisponivel = horariosDisponiveisVindoDoBanco.includes(horario);

        if (data === hojeStr) {
          const [horaBloco, minutoBloco] = horario.split(":").map(Number);
          if (
            horaBloco < horaAtual ||
            (horaBloco === horaAtual && minutoBloco <= minutoAtual)
          ) {
            estaDisponivel = false;
          }
        }

        return {
          horario,
          status: estaDisponivel ? "disponivel" : "ocupado",
        };
      });

      setHorariosProcessados(mapeados);
    } catch (err) {
      console.error("Erro ao buscar horários", err);
      setHorariosProcessados([]);
      setMensagem(
        "Não foi possível carregar os horários. Tente novamente em alguns instantes.",
      );
    }
  }

  // 💡 MODIFICADO: Carrega as quadras e define um fallback estático de 15.00 para o preço
  // 💡 CORRIGIDO: Busca o preço em tempo real direto do back-end sem valores locais
  useEffect(() => {
    // 1. Busca a lista de quadras
    api.get("/courts")
      .then((res) => setQuadras(res.data))
      .catch((err) => console.error("Erro ao buscar quadras", err));
    
    // 2. Busca o preço oficial da raquete definido no back-end
    api.get("/bookings/preco-raquete")
      .then((res) => {
        setPrecoRaquete(Number(res.data.preco));
      })
      .catch((err) => {
        console.error("Erro ao buscar preço da raquete do backend, usando fallback", err);
        setPrecoRaquete(10.00); // Fallback de segurança caso a rota falhe
      });
  }, []);

  useEffect(() => {
    if (quadraSelecionada && data) {
      buscarHorarios();
    } else {
      setHorariosProcessados([]);
    }
    setBlocosSelecionados([]);
    setQtdRaquetes(0); // Reseta a contagem ao mudar de quadra ou data
  }, [quadraSelecionada, data]);

  function lidarComSelecaoDeBloco(horarioClicado) {
    setMensagem("");

    if (blocosSelecionados.includes(horarioClicado)) {
      setBlocosSelecionados([]);
      return;
    }

    if (blocosSelecionados.length === 0) {
      setBlocosSelecionados([horarioClicado]);
      return;
    }

    const primeiroSelecionado = blocosSelecionados[0];
    const indexPrimeiro = gradeCompletaDoDia.indexOf(primeiroSelecionado);
    const indexAtual = gradeCompletaDoDia.indexOf(horarioClicado);

    const deIndex = Math.min(indexPrimeiro, indexAtual);
    const ateIndex = Math.max(indexPrimeiro, indexAtual);

    const intervaloPreenchido = gradeCompletaDoDia.slice(deIndex, ateIndex + 1);

    const possuiOcupadoNoMeio = intervaloPreenchido.some((h) => {
      const correspondente = horariosProcessados.find((p) => p.horario === h);
      return correspondente && correspondente.status === "ocupado";
    });

    if (possuiOcupadoNoMeio) {
      setMensagem(
        "⚠️ Não é possível selecionar esse intervalo pois existem horários já reservados ou que já passaram no meio dele.",
      );
      return;
    }

    setBlocosSelecionados(intervaloPreenchido);
  }

  async function handleAgendar() {
    if (blocosSelecionados.length < 2) {
      setMensagem(
        "⚠️ O tempo mínimo de agendamento é de 1 hora (Selecione pelo menos 2 blocks).",
      );
      return;
    }

    const selecionadosOrdenados = [...blocosSelecionados].sort(
      (a, b) => gradeCompletaDoDia.indexOf(a) - gradeCompletaDoDia.indexOf(b),
    );

    const converterParaMinutos = (hStr) => {
      const [h, m] = hStr.split(":").map(Number);
      return h * 60 + m;
    };

    const primeiroMinutos = converterParaMinutos(selecionadosOrdenados[0]);
    const ultimoMinutos = converterParaMinutos(
      selecionadosOrdenados[selecionadosOrdenados.length - 1],
    );

    const obterStatusPorMinutos = (minutos) => {
      const hStr = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
      const encontrado = horariosProcessados.find((p) => p.horario === hStr);
      return encontrado ? encontrado.status : null;
    };

    const minutes30Antes = primeiroMinutos - 30;
    const minutes60Antes = primeiroMinutos - 60;
    if (
      obterStatusPorMinutos(minutes30Antes) === "disponivel" &&
      obterStatusPorMinutos(minutes60Antes) === "ocupado"
    ) {
      const msgAntes =
        "Sua reserva deixará um intervalo vago de apenas 30 minutos antes do seu jogo. Por favor, inclua esse horário ou junte com a reserva anterior.";
      setModalAviso({ visivel: true, texto: msgAntes });
      setMensagem(`⚠️ ${msgAntes}`);
      return;
    }

    const minutes30Depois = ultimoMinutos + 30;
    const minutes60Depois = ultimoMinutos + 60;
    if (
      obterStatusPorMinutos(minutes30Depois) === "disponivel" &&
      obterStatusPorMinutos(minutes60Depois) === "ocupado"
    ) {
      const msgDepois =
        "Sua reserva deixará um intervalo vago de apenas 30 minutos após o seu jogo. Por favor, inclua mais 30 minutos ou estenda até o próximo agendamento.";
      setModalAviso({ visivel: true, texto: msgDepois });
      setMensagem(`⚠️ ${msgDepois}`);
      return;
    }

    const primeiroBloco = selecionadosOrdenados[0];
    const ultimoBloco = selecionadosOrdenados[selecionadosOrdenados.length - 1];

    const [hFim, mFim] = ultimoBloco.split(":").map(Number);
    const minFinal = mFim + 30;
    const horaFinalCalculada = minFinal === 60 ? hFim + 1 : hFim;
    const minutoFinalCalculada = minFinal === 60 ? 0 : 30;

    const dataLimpa = data.split("T")[0];

    const horaInicioISO = `${dataLimpa}T${primeiroBloco}:00`;
    const horaFimISO = `${dataLimpa}T${String(horaFinalCalculada).padStart(2, "0")}:${String(minutoFinalCalculada).padStart(2, "0")}:00`;

    try {
      const resBooking = await api.post("/bookings", {
        courtId: quadraSelecionada,
        data: dataLimpa,
        horaInicio: horaInicioISO,
        horaFim: horaFimISO,
        qtdRaquetes: qtdRaquetes, // Envia a quantidade escolhida de raquetes para o backend
      });

      navigate(`/pagamento/aguardando?bookingId=${resBooking.data.id}`);
    } catch {
      setMensagem(
        "❌ Erro ao processar o agendamento. Verifique se os horários ainda estão vagos.",
      );
    }
  }

  const formatarDataExibicao = (dataStr) => {
    if (!dataStr) return "Selecione uma data";
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2d3130] font-sans pb-10">
      {/* MODAL CUSTOMIZADO */}
      {modalAviso.visivel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalAviso({ visivel: false, texto: "" })}
          />

          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-6 relative z-10 shadow-2xl space-y-5 text-center animate-scale-up">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400 text-xl">
              ⚠️
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-black text-lg">
                Ajuste de Grade Necessário
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {modalAviso.texto}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalAviso({ visivel: false, texto: "" })}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold py-3 rounded-xl transition shadow-lg active:scale-[0.98]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <header className="max-w-xl mx-auto px-6 py-8 border-b border-slate-200">
        <button
          onClick={() => navigate("/")}
          className="text-sm font-bold text-slate-400 hover:text-[#1e2221]"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-black tracking-tighter text-[#1e2221] mt-2">
          Agendar Quadra
        </h1>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 mt-1">
          Pahragon Arena
        </p>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10 space-y-6">
        {mensagem && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
            {mensagem}
          </div>
        )}

        {/* Seleção da Quadra */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quadra
          </label>
          <select
            className="w-full h-[52px] mt-2 bg-white border border-teal-600 rounded-xl px-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 transition appearance-none cursor-pointer"
            value={quadraSelecionada}
            onChange={(e) => setQuadraSelecionada(e.target.value)}
          >
            <option value="">Selecione uma quadra</option>
            {quadras.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome} — R$ {q.precoPorHora}/h
              </option>
            ))}
          </select>
        </div>

        {/* Seleção de Data */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Data
          </label>
          <div className="relative mt-2 h-[52px]">
            <div className="absolute inset-0 w-full h-full bg-white border border-teal-600 rounded-xl px-4 flex justify-between items-center select-none pointer-events-none z-0">
              <span className="text-slate-800">
                {formatarDataExibicao(data)}
              </span>
              <span className="text-slate-400 text-sm">📅</span>
            </div>

            <input
              type="date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              value={data}
              min={obterDataHojeLocal()}
              onChange={(e) => {
                const dataSelecionada = e.target.value;
                const hojeStr = obterDataHojeLocal();

                if (dataSelecionada && dataSelecionada < hojeStr) {
                  setData(hojeStr);
                  setMensagem("⚠️ Não é permitido selecionar datas passadas.");
                } else {
                  setData(dataSelecionada);
                  setMensagem("");
                }
              }}
              onClick={(e) => {
                if (typeof e.target.showPicker === "function") {
                  try {
                    e.target.showPicker();
                  } catch (error) {
                    // Ignora falhas em navegadores antigos
                  }
                }
              }}
            />
          </div>
        </div>

        {/* LISTAGEM DE HORÁRIOS */}
        {horariosProcessados.length > 0 && (
          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Selecione os Blocos (Mínimo 1 hora)
              </label>
              {blocosSelecionados.length > 0 && (
                <span className="text-xs font-bold text-teal-600">
                  {blocosSelecionados.length * 30} min selecionados
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-3 max-h-[400px] overflow-y-auto pr-1">
              {horariosProcessados.map((item) => {
                const isSelected = blocosSelecionados.includes(item.horario);
                const isOcupado = item.status === "ocupado";

                const [hora, min] = item.horario.split(":").map(Number);
                let proxHora = hora;
                let proxMin = min + 30;
                if (proxMin === 60) {
                  proxMin = 0;
                  proxHora = hora + 1;
                }
                const horarioFimFiltrado = `${String(proxHora).padStart(2, "0")}:${String(proxMin).padStart(2, "0")}`;

                return (
                  <button
                    key={item.horario}
                    type="button"
                    disabled={isOcupado}
                    onClick={() => lidarComSelecaoDeBloco(item.horario)}
                    className={`w-full px-5 py-3.5 rounded-xl font-bold text-left border transition flex justify-between items-center ${
                      isOcupado
                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : isSelected
                          ? "bg-teal-600 border-teal-600 text-white shadow-lg"
                          : "bg-white border-slate-300 text-slate-800 hover:border-teal-600"
                    }`}
                  >
                    <span className="text-base tracking-wide">
                      {item.horario} &gt;&gt; {horarioFimFiltrado}
                    </span>

                    <span
                      className={`text-xs font-bold ${
                        isOcupado
                          ? "text-rose-500"
                          : isSelected
                            ? "text-teal-50"
                            : "text-teal-600"
                      }`}
                    >
                      {isOcupado
                        ? "❌ INDISPONÍVEL"
                        : isSelected
                          ? "✓ SELECIONADO"
                          : "DISPONÍVEL"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SEÇÃO ADICIONADA: COMPONENTES VISUAIS DE ALUGUEL DE RAQUETES */}
        {blocosSelecionados.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Aluguel de Raquetes
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  Não tem equipamento próprio? Adicione raquetes extras ao seu
                  período.
                </p>
              </div>
              {/* 💡 MODIFICADO: Puxando o preço dinâmico do estado atualizado */}
              <span className="text-[11px] font-black bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-1 rounded-lg">
                R$ {precoRaquete.toFixed(2)} / un
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Quantidade
              </span>

              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() =>
                    setQtdRaquetes((prev) => Math.max(0, prev - 1))
                  }
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 font-extrabold hover:bg-slate-100 flex items-center justify-center transition active:scale-95 cursor-pointer select-none"
                >
                  -
                </button>
                <span className="text-sm font-black text-slate-800 w-6 text-center">
                  {qtdRaquetes}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQtdRaquetes((prev) => Math.min(4, prev + 1))
                  } // Limite técnico seguro de até 4 raquetes por reserva
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 font-extrabold hover:bg-slate-100 flex items-center justify-center transition active:scale-95 cursor-pointer select-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Confirmação com o Resumo Financeiro Dinâmico */}
        {blocosSelecionados.length > 0 && (
          <div className="space-y-2 pt-2">
            <button
              onClick={handleAgendar}
              disabled={blocosSelecionados.length < 2}
              className={`w-full font-bold py-4 rounded-xl transition text-lg shadow-lg flex flex-col items-center justify-center leading-tight ${
                blocosSelecionados.length >= 2
                  ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <span>
                {blocosSelecionados.length >= 2
                  ? `Confirmar Reserva (${blocosSelecionados[0]} às ${(() => {
                      const ult =
                        blocosSelecionados[blocosSelecionados.length - 1];
                      const [h, m] = ult.split(":").map(Number);
                      const minF = m + 30;
                      return `${String(minF === 60 ? h + 1 : h).padStart(2, "0")}:${String(minF === 60 ? 0 : 30).padStart(2, "0")}`;
                    })()})`
                  : "Selecione pelo menos 1 hora"}
              </span>
              {blocosSelecionados.length >= 2 && (
                <span className="text-xs font-normal text-teal-100 mt-0.5">
                  Valor Total: R$ {calcularTotalGeral().toFixed(2)}
                </span>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import AgendaAdmin from "./AgendaAdmin";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function AdminDashboard() {
  const [reservas, setReservas] = useState([]);
  const [quadras, setQuadras] = useState([]);
  const [torneios, setTorneios] = useState([]);
  const [caixa, setCaixa] = useState(null);
  const [aba, setAba] = useState("reservas");
  const [atletas, setAtletas] = useState([]);
  const [atletaSelecionado, setAtletaSelecionado] = useState(null);
  const [horarios, setHorarios] = useState([]);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroDataAtivo, setFiltroDataAtivo] = useState("tudo");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [menuAberto, setMenuAberto] = useState(false);

  const [novaQuadra, setNovaQuadra] = useState({
    nome: "",
    descricao: "",
    precoPorHora: "",
  });

  const [novoTorneio, setNovoTorneio] = useState({
    nome: "",
    descricao: "",
    data: "",
    dataFim: "",
    vagas: "",
    preco: "",
    whatsapp: "",
    quadras: [],
  });

  const [modalLimpeza, setModalLimpeza] = useState({
    aberto: false,
    carregando: false,
    sucesso: false,
    mensagem: "",
  });
  const [mensagem, setMensagem] = useState("");
  const navigate = useNavigate();

  const [modalConfirmacao, setModalConfirmacao] = useState({
    aberto: false,
    titulo: "",
    mensagem: "",
    acaoConfirmar: null,
  });

  const admin = JSON.parse(localStorage.getItem("admin") || "{}");
  const token = localStorage.getItem("adminToken");

  const formatarNascimentoCompleto = (dataStr) => {
    if (!dataStr) return "—";
    const dataPura = dataStr.split("T")[0];
    const [ano, mes, dia] = dataPura.split("-");
    const meses = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];
    const fontMes = meses[parseInt(mes, 10) - 1];
    return `${parseInt(dia, 10)} ${fontMes} ${ano}`;
  };

  const [aviso, setAviso] = useState({
    aberto: false,
    tipo: "sucesso",
    mensagem: "",
  });
  const [modalConfirmar, setModalConfirmar] = useState({
    aberto: false,
    id: null,
    texto: "",
  });

  const [bloqueioForm, setBloqueioForm] = useState({
    quadraId: "",
    data: "",
    horaInicio: "",
    horaFim: "",
    motivo: "",
  });
  const [loadingBloqueio, setLoadingBloqueio] = useState(false);

  const handleCriarBloqueio = async (e) => {
    e.preventDefault();
    setLoadingBloqueio(true);

    try {
      const response = await api.post("/bookings/bloqueios", bloqueioForm, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        withCredentials: true,
      });

      if (response.status === 200 || response.status === 201) {
        setAviso({
          aberto: true,
          tipo: "sucesso",
          mensagem: "Quadra bloqueada com sucesso!",
        });
        setBloqueioForm({
          quadraId: "",
          data: "",
          horaInicio: "",
          horaFim: "",
          motivo: "",
        });
        carregarBloqueios();
      } else {
        setAviso({
          aberto: true,
          tipo: "erro",
          mensagem: "Erro ao processar o bloqueio na arena.",
        });
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Erro na conexão com o servidor.";
      setAviso({ aberto: true, tipo: "erro", mensagem: errorMsg });
    } finally {
      setLoadingBloqueio(false);
    }
  };

  const handleDeletarBloqueio = (id, data, quadra) => {
    setModalConfirmar({
      aberto: true,
      id,
      texto: `Deseja realmente cancelar o bloqueio da ${quadra} no dia ${data}?`,
    });
  };

  const confirmarAcaoDeletar = async () => {
    const id = modalConfirmar.id;
    setModalConfirmar({ aberto: false, id: null, texto: "" });

    try {
      const response = await api.delete(`/bookings/bloqueios/${id}`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        withCredentials: true,
      });

      if (response.status === 200 || response.status === 204) {
        setAviso({
          aberto: true,
          tipo: "sucesso",
          mensagem: "Bloqueio cancelado com sucesso!",
        });
        carregarBloqueios();
      } else {
        setAviso({
          aberto: true,
          tipo: "erro",
          mensagem: "Erro ao cancelar o bloqueio.",
        });
      }
    } catch (error) {
      setAviso({
        aberto: true,
        tipo: "erro",
        mensagem: "Erro na conexão com o servidor.",
      });
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    carregarDados();
  }, []);

  async function carregarDados() {
    const headers = { Authorization: `Bearer ${token}` };
    const resultados = await Promise.allSettled([
      api.get("/bookings/todas", { headers, withCredentials: true }),
      api.get("/courts"),
      api.get("/tournaments"),
      api.get("/tournaments/caixa", { headers, withCredentials: true }),
      api.get("/auth/usuarios", { headers, withCredentials: true }),
      api.get("/horarios"),
    ]);

    const [resReservas, resQuadras, resTorneios, resCaixa, resAtletas] =
      resultados;

    if (resReservas.status === "fulfilled") setReservas(resReservas.value.data);
    if (resQuadras.status === "fulfilled") setQuadras(resQuadras.value.data);
    if (resTorneios.status === "fulfilled") setTorneios(resTorneios.value.data);
    if (resCaixa.status === "fulfilled") setCaixa(resCaixa.value.data);
    if (resAtletas.status === "fulfilled") setAtletas(resAtletas.value.data);
    if (resultados[5].status === "fulfilled")
      setHorarios(resultados[5].value.data);
  }

  const diasSemana = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  const [bloqueios, setBloqueios] = useState([]);

  const carregarBloqueios = async () => {
    try {
      const response = await api.get("/bookings/bloqueios", {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        withCredentials: true,
      });
      setBloqueios(response.data);
    } catch (error) {
      console.error("Erro ao carregar bloqueios:", error);
    }
  };

  useEffect(() => {
    if (aba === "gestao") {
      carregarBloqueios();
    }
  }, [aba]);

  async function atualizarHorario(diaSemana, campo, valor) {
    const horarioAtual = horarios.find((h) => h.diaSemana === diaSemana);
    const updated = { ...horarioAtual, [campo]: valor };
    setHorarios(horarios.map((h) => (h.diaSemana === diaSemana ? updated : h)));

    try {
      await api.put(
        "/horarios",
        {
          diaSemana,
          ativo: updated.ativo,
          orderAbertura: updated.horaAbertura,
          horaFechamento: updated.horaFechamento,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );
    } catch {
      setMensagem("❌ Erro ao salvar horário de funcionamento.");
      carregarDados();
    }
  }

  async function criarQuadra(e) {
    e.preventDefault();
    try {
      await api.post(
        "/courts",
        { ...novaQuadra, precoPorHora: Number(novaQuadra.precoPorHora) },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );
      setMensagem("✅ Quadra adicionada com sucesso.");
      setNovaQuadra({ nome: "", descricao: "", precoPorHora: "" });
      carregarDados();
    } catch {
      setMensagem("❌ Erro ao cadastrar quadra.");
    }
  }

  async function criarTorneio(e) {
    e.preventDefault();
    if (novoTorneio.quadras.length === 0) {
      alert("❌ Por favor, selecione pelo menos uma quadra para o torneio.");
      return;
    }

    try {
      const whatsappLimpo = novoTorneio.whatsapp
        ? novoTorneio.whatsapp.replace(/\D/g, "")
        : "";
      const dadosParaEnviar = {
        nome: novoTorneio.nome,
        descricao: novoTorneio.descricao,
        data: novoTorneio.data,
        dataFim: novoTorneio.dataFim,
        vagas: Number(novoTorneio.vagas),
        preco: Number(novoTorneio.preco),
        whatsapp: whatsappLimpo,
        quadras: novoTorneio.quadras,
      };

      await api.post("/tournaments", dadosParaEnviar, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      setMensagem("✅ Torneio publicado com sucesso.");
      setNovoTorneio({
        nome: "",
        descricao: "",
        data: "",
        dataFim: "",
        vagas: "",
        preco: "",
        whatsapp: "",
        quadras: [],
      });
      carregarDados();
    } catch (error) {
      setMensagem("❌ Erro ao publicar torneio. Verifique os dados.");
    }
  }

  const handleLimparCanceladas = async () => {
    setModalLimpeza((prev) => ({
      ...prev,
      carregando: true,
      mensagem:
        "Conectando ao banco de dados e removendo registros vinculados...",
    }));

    try {
      const response = await api.delete("/bookings/limpar-canceladas", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      setModalLimpeza({
        aberto: true,
        carregando: false,
        sucesso: true,
        mensagem:
          response.data.message ||
          "Todas as reservas canceladas e seus respectivos históricos de pagamentos foram removidos com sucesso.",
      });

      carregarDados();
    } catch (error) {
      const msgErro =
        error.response?.data?.error ||
        "Não foi possível completar a limpeza do banco de dados no momento.";
      setModalLimpeza({
        aberto: true,
        carregando: false,
        sucesso: false,
        mensagem: msgErro,
      });
    }
  };

  const lidarSelecaoQuadraTorneio = (courtId) => {
    const idTexto = String(courtId);
    setNovoTorneio((prev) => {
      const jaSelecionada = prev.quadras.includes(idTexto);
      return jaSelecionada
        ? { ...prev, quadras: prev.quadras.filter((id) => id !== idTexto) }
        : { ...prev, quadras: [...prev.quadras, idTexto] };
    });
  };

  const selecionarTodasAsQuadrasTorneio = () => {
    setNovoTorneio((prev) => ({
      ...prev,
      quadras:
        prev.quadras.length === quadras.length
          ? []
          : quadras.map((q) => String(q.id)),
    }));
  };

  function solicitarDeletarQuadra(id, nome) {
    setModalConfirmacao({
      aberto: true,
      titulo: "Remover Quadra",
      mensagem: `Tem certeza que deseja desativar e remover a "${nome}" da estrutura da arena?`,
      acaoConfirmar: async () => {
        await api.delete(`/courts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        carregarDados();
        fecharModal();
      },
    });
  }

  function solicitarDeletarTorneio(id, nome) {
    setModalConfirmacao({
      aberto: true,
      titulo: "Cancelar Torneio",
      mensagem: `Tem certeza que deseja remover o torneio "${nome}"? Esta ação não pode ser desfeita.`,
      acaoConfirmar: async () => {
        await api.delete(`/tournaments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        carregarDados();
        fecharModal();
      },
    });
  }

  function fecharModal() {
    setModalConfirmacao({
      aberto: false,
      titulo: "",
      mensagem: "",
      acaoConfirmar: null,
    });
  }

  function selecionarAba(id) {
    setAba(id);
    setFiltroStatus("todos");
    setMenuAberto(false);
  }

  async function sair() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Erro ao limpar cookie no servidor", err);
    }
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/admin/login");
  }

  function aplicarFiltroRapido(tipo) {
    const hoje = new Date();
    const isoString = (d) => d.toISOString().split("T")[0];
    setFiltroDataAtivo(tipo);

    switch (tipo) {
      case "hoje":
        setDataInicio(isoString(hoje));
        setDataFim(isoString(hoje));
        break;
      case "semana": {
        const semanaPassada = new Date();
        semanaPassada.setDate(hoje.getDate() - 7);
        setDataInicio(isoString(semanaPassada));
        setDataFim(isoString(hoje));
        break;
      }
      case "mes": {
        const mesPassado = new Date();
        mesPassado.setMonth(hoje.getMonth() - 1);
        setDataInicio(isoString(mesPassado));
        setDataFim(isoString(hoje));
        break;
      }
      case "tudo":
      default:
        setDataInicio("");
        setDataFim("");
        break;
    }
  }

  const reservasFiltradasPorData = (reservas || []).filter((r) => {
    if (!r || !r.data) return false;
    let dataReservaISO =
      typeof r.data === "string"
        ? r.data.split("T")[0]
        : new Date(r.data).toISOString().split("T")[0];
    if (dataInicio && dataReservaISO < dataInicio) return false;
    if (dataFim && dataReservaISO > dataFim) return false;
    return true;
  });

  const paymentsFiltradosPorPeriodo = (caixa?.payments || []).filter((p) => {
    const dataPagamentoISO = new Date(p.booking.data)
      .toISOString()
      .split("T")[0];
    if (dataInicio && dataPagamentoISO < dataInicio) return false;
    if (dataFim && dataPagamentoISO > dataFim) return false;
    return true;
  });

  const formatarCPF = (cpf) => {
    if (!cpf) return "";
    const numeros = cpf.replace(/\D/g, "");
    if (numeros.length !== 11) return cpf;
    return `${numeros.substring(0, 3)}.***.***-${numeros.substring(9)}`;
  };

  const totalFiltradoPorPeriodo = paymentsFiltradosPorPeriodo.reduce(
    (soma, p) => soma + p.valor,
    0,
  );
  const totalConfirmadasNoPeriodo = reservasFiltradasPorData.filter(
    (r) => r.status === "confirmado",
  ).length;
  const totalPendentesNoPeriodo = reservasFiltradasPorData.filter(
    (r) => r.status === "pendente",
  ).length;
  const totalCanceladasNoPeriodo = reservasFiltradasPorData.filter(
    (r) => r.status === "cancelado",
  ).length;
  const reservasExibidasNaLista = reservasFiltradasPorData.filter(
    (r) => filtroStatus === "todos" || r.status === filtroStatus,
  );

  const dadosGrafico = paymentsFiltradosPorPeriodo.length
    ? Object.values(
        paymentsFiltradosPorPeriodo.reduce((acc, p) => {
          const dataObj = new Date(p.booking.data);
          const dataFormatada = `${dataObj.getDate().toString().padStart(2, "0")}/${(dataObj.getMonth() + 1).toString().padStart(2, "0")}`;
          if (!acc[dataFormatada])
            acc[dataFormatada] = { name: dataFormatada, faturamento: 0 };
          acc[dataFormatada].faturamento += p.valor;
          return acc;
        }, {}),
      ).sort((a, b) => {
        const [diaA, mesA] = a.name.split("/").map(Number);
        const [diaB, mesB] = b.name.split("/").map(Number);
        return mesA !== mesB ? mesA - mesB : diaA - diaB;
      })
    : [];

  function BlacklistAtleta(userId) {
    const reservasDoAtleta = reservas.filter((r) => r.user?.id === userId);
    const totalReservas = reservasDoAtleta.length;
    const ultimaReserva = totalReservas
      ? reservasDoAtleta.reduce((maisRecente, r) =>
          new Date(r.data) > new Date(maisRecente.data) ? r : maisRecente,
        )
      : null;
    return { totalReservas, ultimaReserva };
  }

  const statusStyle = {
    pendente:
      "text-amber-800 bg-amber-100/80 px-3 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
    confirmado:
      "text-teal-900 bg-teal-100/80 px-3 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
    cancelado:
      "text-slate-500 bg-slate-200/60 px-3 py-1 rounded-lg text-xs font-medium",
  };

  const abas = [
    { id: "reservas", label: "Reservas", count: reservas.length },
    { id: "quadras", label: "Quadras", count: quadras.length },
    { id: "torneios", label: "Torneios", count: torneios.length },
    { id: "atletas", label: "Atletas", count: atletas.length },
    { id: "horarios", label: "Horário de Funcionamento", count: null },
    { id: "gestao", label: "Bloqueio de Quadras", count: null },
    { id: "caixa", label: "Fluxo de Caixa", count: null },
  ];

  const formatarDataLateral = (dataString) => {
    const dataObj = new Date(dataString);
    const dia = dataObj.getDate().toString().padStart(2, "0");
    const mes = dataObj
      .toLocaleString("pt-BR", { month: "short" })
      .replace(".", "");
    return `${dia} ${mes}`;
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2d3130] antialiased tracking-tight font-sans text-base overflow-x-hidden">
      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      {modalConfirmacao.aberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">
                {modalConfirmacao.titulo}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {modalConfirmacao.mensagem}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={fecharModal}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirmacao.acaoConfirmar}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHE DO ATLETA */}
      {atletaSelecionado &&
        (() => {
          const { totalReservas, ultimaReserva } = BlacklistAtleta(
            atletaSelecionado.id,
          );
          return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-md w-full shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      {atletaSelecionado.nome}
                    </h3>
                    <p className="text-sm text-slate-500 font-mono">
                      {atletaSelecionado.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setAtletaSelecionado(null)}
                    className="opacity-40 hover:opacity-100 text-xl leading-none px-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">
                      Telefone
                    </span>
                    <span className="text-slate-800 font-semibold">
                      {atletaSelecionado.telefone || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">
                      CPF
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatarCPF(atletaSelecionado.cpf)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">
                      Cidade
                    </span>
                    <span className="text-slate-800 font-semibold">
                      {atletaSelecionado.cidade
                        ? `${atletaSelecionado.cidade}/${atletaSelecionado.estado || ""}`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">
                      Nascimento
                    </span>
                    <span className="text-slate-800 font-semibold">
                      {atletaSelecionado.dataNascimento
                        ? formatarNascimentoCompleto(
                            atletaSelecionado.dataNascimento,
                          )
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Atividade na Arena
                  </p>
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600">
                      Total de reservas
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 font-mono">
                      {totalReservas}
                    </span>
                  </div>
                  {ultimaReserva ? (
                    <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
                      <span className="text-xs font-bold text-slate-400 block">
                        Última reserva
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {ultimaReserva.court?.nome}
                        </span>
                        <span className="text-sm font-mono text-slate-500">
                          {formatarDataLateral(ultimaReserva.data)}
                        </span>
                      </div>
                      <span className={statusStyle[ultimaReserva.status]}>
                        {ultimaReserva.status}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 px-1">
                      Ainda não fez nenhuma reserva.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setAtletaSelecionado(null)}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          );
        })()}

      {/* CABEÇALHO */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex items-center justify-between border-b border-slate-200/80">
        <div className="flex items-baseline gap-2.5">
          <span className="font-black text-2xl sm:text-3xl tracking-tighter text-[#1e2221]">
            Pahragon
          </span>
          <span className="text-xs font-extrabold uppercase tracking-widest text-teal-600">
            Beach Tennis
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-8 text-sm sm:text-base">
          <span className="text-slate-500">
            Logado como{" "}
            <span className="font-bold text-slate-800">{admin.nome}</span>
          </span>
          <button
            onClick={sair}
            className="text-slate-400 hover:text-rose-600 transition font-semibold"
          >
            Sair
          </button>
        </div>
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="lg:hidden flex flex-col items-center justify-center gap-1.5 w-10 h-10 rounded-xl hover:bg-slate-200/60 transition"
          aria-label="Abrir menu"
        >
          <span
            className={`block w-6 h-0.5 bg-[#1e2221] transition-transform ${menuAberto ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-[#1e2221] transition-opacity ${menuAberto ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-[#1e2221] transition-transform ${menuAberto ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </header>

      {/* MENU MOBILE */}
      {menuAberto && (
        <div className="lg:hidden border-b border-slate-200/80 bg-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
              <span className="text-sm text-slate-500">
                Logado como{" "}
                <span className="font-bold text-slate-800">{admin.nome}</span>
              </span>
              <button
                onClick={sair}
                className="text-sm font-bold text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition"
              >
                Sair
              </button>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Menu Principal
              </p>
              <nav className="flex flex-col gap-2">
                {abas.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => selecionarAba(a.id)}
                    className={`text-left px-4 py-3 rounded-xl text-base font-bold transition flex items-center justify-between ${aba === a.id ? "bg-[#1e2221] text-white shadow-md" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"}`}
                  >
                    <span>{a.label}</span>
                    {a.count !== null && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-mono ${aba === a.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}
                      >
                        {a.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {mensagem && (
          <div className="mb-8 sm:mb-10 text-base text-teal-900 bg-teal-50 border border-teal-200/60 px-5 py-4 rounded-xl flex items-center justify-between">
            <span className="font-medium">{mensagem}</span>
            <button
              onClick={() => setMensagem("")}
              className="opacity-50 hover:opacity-100 text-lg"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-16 items-start">
          {/* Barra Lateral */}
          <div className="lg:col-span-1 space-y-10 lg:sticky lg:top-10 min-w-0 w-full overflow-hidden">
            <div className="hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                Menu Principal
              </p>
              <nav className="flex flex-col gap-2">
                {abas.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => selecionarAba(a.id)}
                    className={`text-left px-4 py-3 rounded-xl text-base font-bold transition flex items-center justify-between ${aba === a.id ? "bg-[#1e2221] text-white shadow-md" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"}`}
                  >
                    <span>{a.label}</span>
                    {a.count !== null && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-mono ${aba === a.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}
                      >
                        {a.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {(aba === "reservas" || aba === "caixa") && (
              <div className="space-y-6 pt-6 lg:pt-0 border-t border-slate-200/80 lg:border-t-0 min-w-0 w-full">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Filtrar Período
                </p>
                <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto pb-1 w-full">
                  {[
                    { id: "tudo", label: "Todo o histórico" },
                    { id: "hoje", label: "Apenas hoje" },
                    { id: "semana", label: "Últimos 7 dias" },
                    { id: "mes", label: "Últimos 30 dias" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => aplicarFiltroRapido(item.id)}
                      className={`text-left text-sm px-3 py-2 rounded-lg font-medium transition whitespace-nowrap ${filtroDataAtivo === item.id ? "text-teal-700 font-bold bg-teal-50" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 pt-2 min-w-0 w-full">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Período Customizado
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-4 min-w-0 w-full">
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                        De
                      </span>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => {
                          setDataInicio(e.target.value);
                          setFiltroDataAtivo("custom");
                        }}
                        className="block w-full bg-white border border-slate-300 rounded-xl px-4 text-base h-12 focus:outline-none focus:border-slate-900 shadow-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                        Até
                      </span>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => {
                          setDataFim(e.target.value);
                          setFiltroDataAtivo("custom");
                        }}
                        className="block w-full bg-white border border-slate-300 rounded-xl px-4 text-base h-12 focus:outline-none focus:border-slate-900 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Área Conteúdo */}
          <div className="lg:col-span-3 space-y-10 min-w-0 w-full">
            {aba === "reservas" && (
              <div className="space-y-10">
                <div className="grid grid-cols-3 gap-4 sm:gap-8 py-4 border-b border-slate-200/80">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-1">
                      Confirmadas
                    </span>
                    <span className="text-3xl sm:text-5xl font-light text-slate-900 font-mono tracking-tighter">
                      {totalConfirmadasNoPeriodo}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-1">
                      Pendentes
                    </span>
                    <span className="text-3xl sm:text-5xl font-light text-amber-600 font-mono tracking-tighter">
                      {totalPendentesNoPeriodo}
                    </span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-1">
                      Canceladas
                    </span>
                    <span className="text-3xl sm:text-5xl font-light text-slate-400 font-mono tracking-tighter">
                      {totalCanceladasNoPeriodo}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setModalLimpeza({
                          aberto: true,
                          carregando: false,
                          sucesso: false,
                          mensagem: "",
                        })
                      }
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer border border-transparent hover:border-rose-100 shadow-sm"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Limpar histórico
                    </button>
                  </div>
                </div>

                {/* COMPONENTE DA AGENDA DO ADMIN (Enviando a estrutura completa de quadras para o formulário manual interno funcionar) */}
                <AgendaAdmin
                  reservas={reservasFiltradasPorData}
                  quadras={quadras}
                  token={token}
                  aoAtualizarDados={carregarDados}
                />

                <div className="flex gap-4 sm:gap-6 text-sm border-b border-slate-200/40 pb-3 overflow-x-auto pt-6">
                  {[
                    { id: "todos", label: "Todos os status" },
                    { id: "confirmado", label: "Confirmadas" },
                    { id: "pendente", label: "Pendentes" },
                    { id: "cancelado", label: "Canceladas" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFiltroStatus(tab.id)}
                      className={`pb-1.5 transition text-sm font-medium whitespace-nowrap ${filtroStatus === tab.id ? "text-slate-900 border-b-2 border-slate-900 font-bold" : "text-slate-400 hover:text-slate-700"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {reservasExibidasNaLista.length === 0 ? (
                    <div className="text-slate-400 text-base py-16 text-center font-light">
                      Nenhuma reserva encontrada para os critérios selecionados.
                    </div>
                  ) : (
                    reservasExibidasNaLista.map((r) => (
                      <div
                        key={r.id}
                        className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                          <span className="text-sm font-mono font-bold text-slate-400 uppercase sm:w-20 tracking-wider">
                            {formatarDataLateral(r.data)}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                              <span className="font-extrabold text-slate-900 text-base sm:text-lg">
                                {r.court?.nome || "Quadra"}
                              </span>
                              <span className="text-sm font-mono font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                                {r.horaInicioStr ||
                                  (r.horaInicio
                                    ? new Date(r.horaInicio).toLocaleTimeString(
                                        "pt-BR",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          timeZone: "UTC",
                                        },
                                      )
                                    : "00:00")}
                                h –{" "}
                                {r.horaFimStr ||
                                  (r.horaFim
                                    ? new Date(r.horaFim).toLocaleTimeString(
                                        "pt-BR",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          timeZone: "UTC",
                                        },
                                      )
                                    : "00:00")}
                                h
                              </span>
                            </div>
                            <div className="text-sm text-slate-500 mt-1.5 flex items-center flex-wrap gap-x-2">
                              <span className="font-semibold text-slate-700">
                                {r.nomeAvulso || r.user?.nome || "Usuário"}
                              </span>
                              <span className="opacity-40">•</span>
                              <span className="font-mono text-slate-400 text-xs sm:text-sm">
                                {r.user?.email || "—"}
                              </span>
                              {/* EXIBIÇÃO DA LOGÍSTICA DE RAQUETES NO FILTRO DO ADMIN */}
                              {r.qtdRaquetes > 0 && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span className="text-xs bg-orange-50 border border-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-md animate-pulse">
                                    🏓 {r.qtdRaquetes}{" "}
                                    {r.qtdRaquetes === 1
                                      ? "Raquete"
                                      : "Raquetes"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className={statusStyle[r.status]}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {aba === "quadras" && (
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
                    Estrutura das Quadras
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {quadras.length === 0 ? (
                      <p className="text-slate-400 text-base py-4">
                        Nenhuma quadra listada.
                      </p>
                    ) : (
                      quadras.map((q) => (
                        <div
                          key={q.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all"
                        >
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-lg">
                              {q.nome}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">
                              {q.descricao || "Sem descrição cadastrada"}
                              <span className="mx-2 text-slate-300">•</span>
                              Tarifa:{" "}
                              <span className="text-teal-700 font-extrabold font-mono">
                                R$ {q.precoPorHora}/h
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => solicitarDeletarQuadra(q.id, q.nome)}
                            className="self-start sm:self-auto text-sm font-bold text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-200/80 max-w-lg">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Nova Quadra
                  </h3>
                  <form onSubmit={criarQuadra} className="space-y-4">
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base h-12 shadow-sm focus:outline-none focus:border-slate-900"
                      placeholder="Título/Identificação da Quadra"
                      value={novaQuadra.nome}
                      onChange={(e) =>
                        setNovaQuadra({ ...novaQuadra, nome: e.target.value })
                      }
                      required
                    />
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base h-12 shadow-sm focus:outline-none focus:border-slate-900"
                      placeholder="Descrição ou observações estruturais"
                      value={novaQuadra.descricao}
                      onChange={(e) =>
                        setNovaQuadra({
                          ...novaQuadra,
                          descricao: e.target.value,
                        })
                      }
                    />
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base font-mono h-12 shadow-sm focus:outline-none focus:border-slate-900"
                      placeholder="Preço Cobrado por Hora (Ex: 80)"
                      type="number"
                      value={novaQuadra.precoPorHora}
                      onChange={(e) =>
                        setNovaQuadra({
                          ...novaQuadra,
                          precoPorHora: e.target.value,
                        })
                      }
                      required
                    />
                    <button
                      className="bg-[#1e2221] hover:bg-black text-white text-sm font-bold px-5 py-3.5 rounded-xl transition shadow-md w-full sm:w-auto"
                      type="submit"
                    >
                      Adicionar à Arena
                    </button>
                  </form>
                </div>
              </div>
            )}

            {aba === "torneios" && (
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
                    Torneios Ativos
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {torneios.length === 0 ? (
                      <p className="text-slate-400 text-base">
                        Sem competições agendadas.
                      </p>
                    ) : (
                      torneios.map((t) => (
                        <div
                          key={t.id}
                          className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                            <span className="self-start text-xs sm:text-sm font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">
                              {formatarDataLateral(t.data)}
                            </span>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">
                                {t.nome}
                              </h4>
                              <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-y-1">
                                <span>👥 {t.vagas} duplas/vagas totais</span>
                                <span className="mx-2 text-slate-300">•</span>
                                <span>
                                  Inscrição:{" "}
                                  <span className="font-mono text-slate-700 font-bold">
                                    R$ {Number(t.preco).toFixed(2)}
                                  </span>
                                </span>
                                {t.whatsapp && (
                                  <>
                                    <span className="mx-2 text-slate-300">
                                      •
                                    </span>
                                    <span className="text-slate-600 font-medium">
                                      📞 {t.whatsapp}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              solicitarDeletarTorneio(t.id, t.nome)
                            }
                            className="text-xs font-bold text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors self-start sm:self-auto"
                          >
                            Cancelar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-200/80 max-w-lg">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Novo Torneio
                  </h3>
                  <form onSubmit={criarTorneio} className="space-y-4">
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base h-12 shadow-sm focus:outline-none focus:border-slate-900"
                      placeholder="Nome da Competição"
                      value={novoTorneio.nome}
                      onChange={(e) =>
                        setNovoTorneio({ ...novoTorneio, nome: e.target.value })
                      }
                      required
                    />
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base h-12 shadow-sm focus:outline-none focus:border-slate-900"
                      placeholder="Categorias envolvidas (Ex: Open Masculino)"
                      value={novoTorneio.descricao}
                      onChange={(e) =>
                        setNovoTorneio({
                          ...novoTorneio,
                          descricao: e.target.value,
                        })
                      }
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1 w-full">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                          Início do Torneio
                        </span>
                        <input
                          className="block w-full bg-white border border-slate-300 rounded-xl px-4 text-base h-12 shadow-sm text-slate-800 focus:outline-none focus:border-slate-900"
                          type="datetime-local"
                          value={novoTorneio.data}
                          onChange={(e) =>
                            setNovoTorneio({
                              ...novoTorneio,
                              data: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1 w-full">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                          Término do Torneio
                        </span>
                        <input
                          className="block w-full bg-white border border-slate-300 rounded-xl px-4 text-base h-12 shadow-sm text-slate-800 focus:outline-none focus:border-slate-900"
                          type="datetime-local"
                          value={novoTorneio.dataFim}
                          onChange={(e) =>
                            setNovoTorneio({
                              ...novoTorneio,
                              dataFim: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base font-mono h-12 shadow-sm focus:outline-none focus:border-slate-900"
                        placeholder="Limite de Vagas"
                        type="number"
                        value={novoTorneio.vagas}
                        onChange={(e) =>
                          setNovoTorneio({
                            ...novoTorneio,
                            vagas: e.target.value,
                          })
                        }
                        required
                      />
                      <input
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base font-mono h-12 shadow-sm focus:outline-none focus:border-slate-900"
                        placeholder="Valor Inscrição R$"
                        type="number"
                        value={novoTorneio.preco}
                        onChange={(e) =>
                          setNovoTorneio({
                            ...novoTorneio,
                            preco: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                        WhatsApp de Contato *
                      </span>
                      <input
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-base h-12 shadow-sm focus:outline-none focus:border-slate-900"
                        placeholder="Ex: 41999999999"
                        type="text"
                        required
                        value={novoTorneio.whatsapp}
                        onChange={(e) =>
                          setNovoTorneio({
                            ...novoTorneio,
                            whatsapp: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2 border-t border-slate-200/60 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                          Quadras Usadas no Torneio (Bloqueio automático) *
                        </span>
                        <button
                          type="button"
                          onClick={selecionarTodasAsQuadrasTorneio}
                          className="text-xs font-bold text-teal-600 hover:text-teal-700"
                        >
                          {novoTorneio.quadras.length === quadras.length
                            ? "Desmarcar Todas"
                            : "Selecionar Todas"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                        {quadras.map((q) => {
                          const estaSelecionada = novoTorneio.quadras.includes(
                            String(q.id),
                          );
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => lidarSelecaoQuadraTorneio(q.id)}
                              className={`flex items-center justify-center p-3 rounded-xl border text-sm font-bold transition-all ${estaSelecionada ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm" : "bg-white border-slate-200 text-slate-600"}`}
                            >
                              <span className="mr-2">
                                {estaSelecionada ? "✅" : "⬜"}
                              </span>
                              {q.nome}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      className="bg-[#1e2221] hover:bg-black text-white text-sm font-bold px-5 py-3.5 rounded-xl transition shadow-md w-full sm:w-auto"
                      type="submit"
                    >
                      Lançar Torneio
                    </button>
                  </form>
                </div>
              </div>
            )}

            {aba === "atletas" && (
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
                    Atletas Cadastrados
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {atletas.length === 0 ? (
                      <p className="text-slate-400 text-base py-4">
                        Nenhum atleta cadastrado ainda.
                      </p>
                    ) : (
                      atletas.map((at) => {
                        const { totalReservas, ultimaReserva } =
                          BlacklistAtleta(at.id);
                        return (
                          <div
                            key={at.id}
                            onClick={() => setAtletaSelecionado(at)}
                            className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 hover:shadow-md cursor-pointer transition-all"
                          >
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-lg">
                                {at.nome}
                              </h4>
                              <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
                                <span className="font-mono text-slate-400 text-xs sm:text-sm">
                                  {at.email}
                                </span>
                                {at.cpf && (
                                  <>
                                    <span className="opacity-40">•</span>
                                    <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                                      CPF: {formatarCPF(at.cpf)}
                                    </span>
                                  </>
                                )}
                                {at.telefone && (
                                  <>
                                    <span className="opacity-40">•</span>
                                    <span>{at.telefone}</span>
                                  </>
                                )}
                                {at.cidade && (
                                  <>
                                    <span className="opacity-40">•</span>
                                    <span>
                                      {at.cidade}
                                      {at.estado ? `/${at.estado}` : ""}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-6 sm:gap-8">
                              <div className="text-center sm:text-right">
                                <span className="text-xs font-bold text-slate-400 block">
                                  Reservas
                                </span>
                                <span className="text-xl font-extrabold text-slate-900 font-mono">
                                  {totalReservas}
                                </span>
                              </div>
                              <div className="text-center sm:text-right min-w-[80px]">
                                <span className="text-xs font-bold text-slate-400 block">
                                  Última
                                </span>
                                <span className="text-sm font-bold text-teal-700">
                                  {ultimaReserva
                                    ? formatarDataLateral(ultimaReserva.data)
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {aba === "horarios" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                    Horário de Funcionamento
                  </h2>
                  <p className="text-slate-400 text-sm font-light">
                    Desative um dia para fechar as reservas nele completamente.
                  </p>
                </div>
                <div className="space-y-3">
                  {diasSemana.map((nomeDia, indice) => {
                    const h = horarios.find(
                      (item) => item.diaSemana === indice,
                    );
                    if (!h) return null;
                    return (
                      <div
                        key={indice}
                        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${h.ativo ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200/60 opacity-70"}`}
                      >
                        <div className="flex items-center gap-4 min-w-[140px]">
                          <button
                            type="button"
                            onClick={() =>
                              atualizarHorario(indice, "ativo", !h.ativo)
                            }
                            className={`w-12 h-7 rounded-full relative transition-colors shrink-0 ${h.ativo ? "bg-teal-500" : "bg-slate-300"}`}
                          >
                            <span
                              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${h.ativo ? "translate-x-5" : ""}`}
                            />
                          </button>
                          <span className="font-extrabold text-slate-900">
                            {nomeDia}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="time"
                            value={h.horaAbertura}
                            disabled={!h.ativo}
                            onChange={(e) =>
                              atualizarHorario(
                                indice,
                                "horaAbertura",
                                e.target.value,
                              )
                            }
                            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono disabled:opacity-40"
                          />
                          <span className="text-slate-400 text-sm">às</span>
                          <input
                            type="time"
                            value={h.horaFechamento}
                            disabled={!h.ativo}
                            onChange={(e) =>
                              atualizarHorario(
                                indice,
                                "horaFechamento",
                                e.target.value,
                              )
                            }
                            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono disabled:opacity-40"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {aba === "gestao" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Gestão de Quadras
                  </h2>
                  <p className="text-sm text-slate-400 font-light mt-1">
                    Bloqueie horários específicos para manutenção, aulas ou
                    eventos privados.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                      <div className="w-1.5 h-5 bg-teal-500 rounded-full"></div>
                      Novo Bloqueio de Horário
                    </h3>
                  </div>
                  <form
                    onSubmit={handleCriarBloqueio}
                    className="p-6 space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-0.5">
                          Quadra
                        </label>
                        <select
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700"
                          value={bloqueioForm.quadraId}
                          onChange={(e) =>
                            setBloqueioForm({
                              ...bloqueioForm,
                              quadraId: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione a quadra...</option>
                          {quadras &&
                            quadras.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.nome}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-0.5">
                          Data do Bloqueio
                        </label>
                        <input
                          type="date"
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700"
                          value={bloqueioForm.data}
                          onChange={(e) =>
                            setBloqueioForm({
                              ...bloqueioForm,
                              data: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-0.5">
                          Horário de Início
                        </label>
                        <input
                          type="time"
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700"
                          value={bloqueioForm.horaInicio}
                          onChange={(e) =>
                            setBloqueioForm({
                              ...bloqueioForm,
                              horaInicio: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-0.5">
                          Horário de Término
                        </label>
                        <input
                          type="time"
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700"
                          value={bloqueioForm.horaFim}
                          onChange={(e) =>
                            setBloqueioForm({
                              ...bloqueioForm,
                              horaFim: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 ml-0.5">
                        Motivo (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Manutenção da areia..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700"
                        value={bloqueioForm.motivo}
                        onChange={(e) =>
                          setBloqueioForm({
                            ...bloqueioForm,
                            motivo: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loadingBloqueio}
                        className={`w-full py-3 rounded-xl font-extrabold text-sm text-white shadow-md ${loadingBloqueio ? "bg-slate-400" : "bg-teal-600 hover:bg-teal-700"}`}
                      >
                        {loadingBloqueio
                          ? "Processando..."
                          : "Confirmar Bloqueio de Horário"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">
                    Bloqueios Manuais Ativos
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {bloqueios.length === 0 ? (
                      <p className="text-slate-400 text-sm font-light pl-1 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                        Nenhum horário de manutenção bloqueado no momento.
                      </p>
                    ) : (
                      bloqueios.map((b) => {
                        const dataFormatadaSegura = formatarDataLateral(
                          b.data.replace(/-/g, "/"),
                        );
                        const nomeDaQuadra =
                          b.quadra?.nome ||
                          quadras.find((q) => q.id === b.quadraId)?.nome ||
                          `Quadra #${b.quadraId}`;
                        return (
                          <div
                            key={b.id}
                            className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                              <span className="self-start text-xs sm:text-sm font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg shrink-0">
                                {dataFormatadaSegura}
                              </span>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-base">
                                  {nomeDaQuadra}
                                </h4>
                                <p className="text-sm text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                                  <span className="font-mono text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded text-xs">
                                    ⏰ {b.horaInicio} às {b.horaFim}
                                  </span>
                                  {b.motivo && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="italic text-slate-400 text-xs">
                                        {b.motivo}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeletarBloqueio(
                                  b.id,
                                  dataFormatadaSegura,
                                  nomeDaQuadra,
                                )
                              }
                              className="self-start sm:self-auto text-xs font-bold text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50"
                            >
                              Remover Bloqueio
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">
                    Bloqueios Gerados por Torneios
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {torneios.length === 0 ? (
                      <p className="text-slate-400 text-sm font-light pl-1 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                        Nenhum torneio ativo ocupando quadras no momento.
                      </p>
                    ) : (
                      torneios.map((t) => {
                        const dataInicioTxt = new Date(
                          t.data,
                        ).toLocaleDateString("pt-BR", { timeZone: "UTC" });
                        const horaInicTxt = new Date(t.data)
                          .toISOString()
                          .substring(11, 16);
                        const horaFimTxt = new Date(t.dataFim)
                          .toISOString()
                          .substring(11, 16);
                        const nomesDasQuadras =
                          t.quadras && t.quadras.length > 0
                            ? t.quadras
                                .map(
                                  (qId) =>
                                    quadras.find(
                                      (q) => String(q.id) === String(qId),
                                    )?.nome || `#${qId}`,
                                )
                                .join(", ")
                            : "Todas as quadras";
                        return (
                          <div
                            key={t.id}
                            className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                              <span className="self-start text-xs sm:text-sm font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg shrink-0">
                                🏆 Evento
                              </span>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-base">
                                  {t.nome}
                                </h4>
                                <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-y-1 gap-x-2">
                                  <span className="font-mono text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded text-xs">
                                    ⏰ {dataInicioTxt} • {horaInicTxt} às{" "}
                                    {horaFimTxt}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                                    📍 {nomesDasQuadras}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl self-start sm:self-auto">
                              Gerenciado em Torneios
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {aba === "caixa" && caixa && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 py-4 border-b border-slate-200/80">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-1">
                      Período Selecionado
                    </span>
                    <span className="text-3xl sm:text-5xl font-light text-orange-600 font-mono tracking-tighter">
                      R$ {totalFiltradoPorPeriodo.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-1">
                      Acumulado Histórico
                    </span>
                    <span className="text-3xl sm:text-5xl font-light text-slate-900 font-mono tracking-tighter">
                      R$ {caixa.total.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-1">
                      Volume de Vendas
                    </span>
                    <span className="text-3xl sm:text-5xl font-light text-slate-700 font-mono tracking-tighter">
                      {paymentsFiltradosPorPeriodo.length}{" "}
                      <span className="text-sm text-slate-400 font-normal">
                        itens
                      </span>
                    </span>
                  </div>
                </div>

                <div className="py-4 w-full min-w-0">
                  <div className="mb-6">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Curva de Ganhos
                    </h3>
                    <p className="text-slate-400 text-sm font-light">
                      Evolução do faturamento bruto por dia
                    </p>
                  </div>

                  {dadosGrafico.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-sm text-slate-400 font-light">
                      Nenhum dado financeiro mapeado no filtro ativo.
                    </div>
                  ) : (
                    <div className="h-60 w-full pr-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={dadosGrafico}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `R$${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e2221",
                              borderColor: "#1e2221",
                              borderRadius: "12px",
                              color: "#fff",
                              padding: "12px",
                            }}
                            labelStyle={{
                              color: "rgba(255,255,255,0.6)",
                              fontSize: "11px",
                              marginBottom: "4px",
                            }}
                            itemStyle={{
                              color: "#f97316",
                              fontSize: "14px",
                              fontWeight: "bold",
                            }}
                            formatter={(value) => [
                              `R$ ${value.toFixed(2)}`,
                              "Faturamento",
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="faturamento"
                            stroke="#ea580c"
                            strokeWidth={2.5}
                            fillOpacity={0.04}
                            fill="#ea580c"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">
                    Entradas Registradas
                  </h3>
                  <div className="divide-y divide-slate-200/60">
                    {paymentsFiltradosPorPeriodo.length === 0 ? (
                      <p className="text-slate-400 text-base py-6 font-light">
                        Sem transações no período.
                      </p>
                    ) : (
                      paymentsFiltradosPorPeriodo.map((p) => (
                        <div
                          key={p.id}
                          className="py-4 px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base group hover:bg-slate-200/30 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-4 sm:gap-6">
                            <span className="text-sm font-mono text-slate-400 w-16 font-bold shrink-0">
                              {formatarDataLateral(p.booking.data)}
                            </span>
                            <div>
                              <p className="font-extrabold text-slate-900 text-base">
                                {p.booking.court?.nome || "Quadra"}
                              </p>
                              <p className="text-sm text-slate-500 mt-0.5">
                                👤{" "}
                                {p.booking.nomeAvulso ||
                                  p.booking.user?.nome ||
                                  "Usuário"}{" "}
                                <span className="mx-2 text-slate-300">•</span>{" "}
                                <span className="font-mono uppercase text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                  {p.metodo}
                                </span>
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-extrabold text-orange-600 text-base pl-20 sm:pl-0">
                            + R$ {p.valor.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {aviso.aberto && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-center gap-3.5 backdrop-blur-md max-w-md bg-white/95 ${aviso.tipo === "sucesso" ? "border-emerald-100/80 shadow-emerald-100/20" : "border-rose-100/80 shadow-rose-100/20"}`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${aviso.tipo === "sucesso" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
            >
              {aviso.tipo === "sucesso" ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1 pr-2">
              <p className="text-sm font-bold text-slate-950">
                {aviso.tipo === "sucesso" ? "Sucesso" : "Ops, algo deu errado"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                {aviso.mensagem}
              </p>
            </div>
            <button
              onClick={() => setAviso({ ...aviso, aberto: false })}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {modalLimpeza.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() =>
              !modalLimpeza.carregando &&
              setModalLimpeza({ ...modalLimpeza, aberto: false })
            }
          />
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 relative z-10 animate-in fade-in zoom-in-95 duration-200 font-sans">
            {!modalLimpeza.carregando &&
              !modalLimpeza.sucesso &&
              modalLimpeza.mensagem === "" && (
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Limpar Histórico de Cancelamentos
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Esta ação irá deletar{" "}
                    <span className="font-semibold text-slate-700">
                      permanentemente
                    </span>{" "}
                    todas as reservas com o status{" "}
                    <span className="font-semibold text-slate-700">
                      "cancelado"
                    </span>{" "}
                    do banco de dados, juntamente com seus respectivos registros
                    de transações.
                  </p>
                  <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 mt-4 flex gap-2.5">
                    <span className="text-amber-600 text-sm font-bold">⚠️</span>
                    <p className="text-xs text-amber-800 font-medium leading-normal">
                      Essa operação é irreversível
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() =>
                        setModalLimpeza({ ...modalLimpeza, aberto: false })
                      }
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleLimparCanceladas}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              )}
            {modalLimpeza.carregando && (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-rose-600 animate-spin mb-4" />
                <h3 className="text-base font-bold text-slate-900">
                  Processando Limpeza...
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                  {modalLimpeza.mensagem}
                </p>
              </div>
            )}
            {!modalLimpeza.carregando && modalLimpeza.mensagem !== "" && (
              <div className="text-center py-2">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${modalLimpeza.sucesso ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                >
                  {modalLimpeza.sucesso ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalLimpeza.sucesso
                    ? "Banco de Dados Limpo!"
                    : "Erro na Operação"}
                </h3>
                <p className="text-sm text-slate-500 mt-2 px-2 leading-relaxed">
                  {modalLimpeza.mensagem}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setModalLimpeza({
                      aberto: false,
                      carregando: false,
                      sucesso: false,
                      mensagem: "",
                    })
                  }
                  className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Fechar Janela
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalConfirmar.aberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-black">
                !
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Confirmar Cancelamento
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed px-2">
                  {modalConfirmar.texto}
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setModalConfirmar({ aberto: false, id: null, texto: "" })
                }
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-extrabold hover:bg-slate-100 shadow-sm"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarAcaoDeletar}
                className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-extrabold hover:bg-rose-700 shadow-md shadow-rose-100"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

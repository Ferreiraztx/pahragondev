import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";

const availability = [
  {
    time: "18:00h - 19:00h",
    status: "Reservado",
    available: false,
  },
  {
    time: "19:00h - 20:00h",
    status: "Disponível",
    available: true,
  },
  {
    time: "20:00h - 21:00h",
    status: "Disponível",
    available: true,
  },
  {
    time: "21:00h - 22:00h",
    status: "Últimas vagas",
    available: true,
  },
];

const signaturePoints = [
  {
    label: "Estrutura",
    desc: "Quadras cobertas, ambiente organizado e leitura visual limpa em toda a jornada.",
  },
  {
    label: "Reserva",
    desc: "Escolha o horário, confirme por PIX e tenha o bloqueio da quadra em poucos instantes.",
  },
  {
    label: "Comunidade",
    desc: "Torneios, partidas e rotina esportiva para quem quer jogar com frequência e estilo.",
  },
];

const steps = [
  {
    num: "01",
    title: "Escolha sua quadra",
    desc: "Visualize a grade com clareza e encontre o horário ideal em poucos segundos.",
  },
  {
    num: "02",
    title: "Confirme sua reserva",
    desc: "Faça login e vincule o agendamento ao seu perfil de forma rápida e segura.",
  },
  {
    num: "03",
    title: "Pague por PIX",
    desc: "A confirmação acontece na hora e o horário fica bloqueado no seu nome automaticamente.",
  },
];

export default function Home() {
  const { user } = useAuth();

  const handleComecarAgora = () => {
    if (user) {
      // 🎾 Se já está logado, manda direto para a grade de agendamentos
      navigate("/agendar");
    } else {
      // 🔑 Se está deslogado, aí sim manda para o fluxo unificado ou cadastro
      navigate("/login");
    }
  };
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6f4ee] text-[#1f2523] antialiased tracking-tight font-sans">
      <div className="absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.08),_transparent_42%)]" />

      <Navbar />

      <main>
        <section className="relative isolate min-h-[92svh] overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            controls={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "center center" }}
          >
            <source src="/videos/pahragon.mp4" type="video/mp4" />
          </video>

          <div className="absolute inset-0 bg-black/42" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,14,0.44)_0%,rgba(6,10,14,0.14)_40%,rgba(6,10,14,0.10)_74%,rgba(246,244,238,0)_89%,rgba(246,244,238,0.82)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f6f4ee] via-[#f6f4ee]/55 to-transparent" />

          <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-6xl items-center px-6 py-20 sm:py-16 lg:py-20">
            <div className="grid w-full gap-10 lg:grid-cols-[1.16fr_0.84fr] lg:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.15] bg-black/[0.15] px-4 py-2 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-teal-300" />
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-teal-100">
                    Grade de hoje aberta
                  </span>
                </div>

                <h1 className="mt-6 text-[2.55rem] font-light leading-[0.9] text-white sm:text-6xl xl:text-[5.4rem]">
                  Sorriso no rosto,
                  <br />
                  <span className="font-black text-white">areia nos pés.</span>
                </h1>

                <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
                  A Pahragon Beach Tennis combina o minimalismo de um espaço planejado
                  com a energia do beach tennis. Reserve sua quadra em segundos
                  e viva uma experiência mais elegante, fluida e vibrante no
                  Santa Quitéria.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => navigate("/agendar")}
                    className="w-full rounded-2xl bg-white px-7 py-4 text-sm font-extrabold text-[#18201e] shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-slate-100 sm:w-auto"
                  >
                    Agendar horário
                  </button>
                  <button
                    onClick={() => navigate("/torneios")}
                    className="w-full rounded-2xl border border-white/20 bg-black/10 px-6 py-4 text-sm font-bold text-white backdrop-blur-sm transition duration-300 hover:bg-white/10 sm:w-auto"
                  >
                    Ver torneios
                  </button>
                </div>
              </div>

              <div className="mt-2 w-full lg:mt-0 lg:justify-self-end">
                <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[1.75rem] border border-white/[0.12] bg-black/[0.18] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:max-w-[320px] sm:p-5 lg:mx-0 lg:ml-auto">
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-100/90">
                          Hoje
                        </p>
                        <h2 className="mt-1.5 text-xl font-black text-white">
                          Quadra 1
                        </h2>
                      </div>
                      <span className="rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                        R$ 80/h
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {availability.slice(0, 3).map((slot) => (
                        <div
                          key={slot.time}
                          className={`flex items-center justify-between rounded-2xl border px-3.5 py-3 transition ${
                            slot.available
                              ? "border-white/10 bg-white/[0.08]"
                              : "border-white/10 bg-black/10 opacity-70"
                          }`}
                        >
                          <div>
                            <p
                              className={`text-sm font-bold ${
                                slot.available
                                  ? "text-white"
                                  : "text-slate-300/90"
                              }`}
                            >
                              {slot.time}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                              slot.available
                                ? "bg-teal-300/[0.12] text-teal-100"
                                : "bg-white/10 text-slate-300"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => navigate("/agendar")}
                      className="mt-4 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-extrabold text-[#18201e] transition hover:bg-slate-100"
                    >
                      Ver grade completa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-teal-600">
              Role para ver mais
            </p>
          </div>
        </section>

        <section
          id="experiencia"
          className="mx-auto max-w-6xl px-6 pb-10 pt-20"
        >
          <div className="grid items-stretch gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="max-w-xl pt-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-600">
                A experiência
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl">
                Um lugar para jogar bem, respirar leve e voltar sempre.
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-500 sm:text-base">
                A proposta da Pahragon Beach Tennis é unir estética limpa, operação
                simples e energia esportiva em uma experiência que parece
                premium sem ficar carregada. Menos ruído, mais presença.
              </p>
            </div>

            <div className="h-full rounded-[2rem] border border-slate-200/90 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <p className="max-w-2xl text-sm font-medium leading-7 text-slate-500">
                  “Beach tennis com organização, conforto visual e uma jornada
                  que começa no clique e continua dentro da quadra.”
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:gap-5">
                {signaturePoints.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.4rem] border border-slate-100 bg-slate-50/70 px-5 py-4"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-teal-600">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid items-stretch gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="lg:sticky lg:top-24">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-600">
                Fluxo simplificado
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl">
                Agende sem burocracia ou intermediários.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
                A experiência precisa parecer leve do primeiro clique até a
                confirmação. Mais clareza visual, menos ruído e mais confiança
                na tomada de decisão.
              </p>
            </div>

            <div className="h-full space-y-4">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition duration-300 hover:border-teal-200 hover:shadow-[0_22px_55px_rgba(20,184,166,0.10)] sm:p-6"
                >
                  <div className="flex items-start gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 font-mono text-xl font-black text-slate-400 transition group-hover:bg-teal-50 group-hover:text-teal-600">
                      {step.num}
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500 sm:text-base">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-4">
          <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#13211f_0%,#0f1720_55%,#103a38_100%)] p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.22)] sm:p-10">
            <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-teal-300/15 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-300">
                  Última chamada
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tighter sm:text-4xl">
                  Quer garantir o melhor horário da semana?
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-base">
                  Os horários nobres de fim de tarde costumam fechar rápido.
                  Entre agora, finalize seu cadastro e reserve antes da grade
                  virar.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleComecarAgora}
                  className="px-6 py-3 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-md"
                >
                  Começar agora
                </button>
                <button
                  onClick={() => navigate("/agendar")}
                  className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  Ver horários
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#18201e] text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-bold text-white">Pahragon Beach Tennis</span>
            <span className="opacity-40">•</span>
            <span>Santa Quitéria • Curitiba</span>
          </div>
          <p className="text-xs font-mono text-slate-400">
            © 2026 • Desenvolvido por Matheus Ferreira
          </p>
        </div>
      </footer>
    </div>
  );
}

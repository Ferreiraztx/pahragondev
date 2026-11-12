import React from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

export default function Estrutura() {
  const navigate = useNavigate();

  // 📝 Dados estáticos para renderizar os diferenciais da arena
  const diferenciais = [
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      titulo: "Iluminação LED Profissional",
      descricao:
        "Refletores de última geração que garantem visibilidade perfeita para jogos noturnos sem sombras ou ofuscamento.",
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          {/* Escada de acesso à esquerda */}
          <path d="M4 21V10m0 4h3m-3 3h3" />
          {/* O escorregador com a onda perfeita de descida */}
          <path d="M7 10c4 0 5 4 8 7s4 4 5 4" />
        </svg>
      ),
      titulo: "Parquinho infantil",
      descricao:
        "Além da sua diversão, trazemos diversão para as crianças enquanto esperam os adultos jogarem",
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      titulo: "Área de Convivência & Alimentação",
      descricao:
        "Espaço completo para o seu pós-jogo com comidas, bebidas trincando e TVs transmitindo torneios ao vivo.",
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
      titulo: "Vestiários Modernos",
      descricao:
        "Estrutura limpa e equipada com chuveiros aquecidos para o seu total conforto e privacidade.",
    },
  ];

  // 📸 Mock de Fotos da Arena (Substitua as URLs pelas imagens reais do seu projeto futuramente)
  const galeriaImagens = [
    {
      title: "Quadra Central",
      url: "/quadras.png",
    },
    {
      title: "Área Gourmet",
      url: "/gourmet.png",
    },
    {
      title: "Estacionamento",
      url: "/estacionamento.png",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-500 selection:text-white">
      <Navbar />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f766e] to-[#134e4a] py-20 px-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)]" />

        <div className="max-w-6xl mx-auto relative z-10 text-center lg:text-left lg:flex lg:items-center lg:justify-between gap-10">
          <div className="max-w-2xl">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-teal-200 block mb-3">
              Infraestrutura Completa
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              A melhor experiência <br />
              dentro e fora das quadras.
            </h1>
            <p className="mt-4 text-base text-teal-50/80 max-w-lg leading-relaxed">
              Projetamos um espaço de alto padrão para quem respira esporte. Da
              areia tratada ao espaço gourmet, cada detalhe foi feito para você
              e sua equipe.
            </p>
          </div>
        </div>
      </section>

      {/* 🖼️ GALERIA DE FOTOS (GRID DE ALTO PADRÃO) */}
      <section className="max-w-6xl mx-auto py-16 px-6">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1 uppercase">
            Conheça nosso espaço
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {galeriaImagens.map((item, index) => (
            <div
              key={index}
              className="group relative h-72 rounded-3xl overflow-hidden bg-slate-200 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Imagem com efeito Zoom no Hover */}
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Overlay Escuro Gradiente que aparece no Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Texto fixado na base interna da imagem */}
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-sm font-bold tracking-wide font-sans">
                  {item.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ⚡ DIFERENCIAIS DA ESTRUTURA */}
      <section className="bg-white border-y border-slate-200/60 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              O que você encontra por aqui
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Muito além de apenas o aluguel de quadra, entregamos conforto e
              diversão integrada para toda a sua família.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {diferenciais.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-start p-5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all duration-200"
              >
                {/* Ícone Container */}
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#0f766e] flex items-center justify-center mb-4 shadow-sm">
                  {item.icon}
                </div>
                {/* Textos descritivos */}
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {item.titulo}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  {item.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ProcessarPagamento() {
  const navigate = useNavigate();
  const [mensagemStatus, setMensagemStatus] = useState("Verificando status do pagamento...");

  useEffect(() => {
    // 1. Captura a URL completa vinda do Mercado Pago
    const params = new URLSearchParams(window.location.search);
    
    // 2. Busca robusta pelo bookingId na URL usando Regex ou parâmetro direto
    let bookingId = params.get("bookingId");
    if (!bookingId) {
      const match = window.location.search.match(/[?&]bookingId=(\d+)/);
      bookingId = match ? match[1] : null;
    }

    // 3. Captura as variações de nomes que o Mercado Pago usa para o status na URL
    if (bookingId) {
    // 4. Envia os dados para a sua rota pública do Back-end
    api.post("/payments/confirmar", {
      bookingId: Number(bookingId)
    })
      .then((res) => {
        // Se o back-end validou ou forçou a aprovação porque o status era de sucesso
        if (res.data.pago) {
          setMensagemStatus("Pagamento confirmado! Redirecionando...");
          setTimeout(() => {
            navigate(`/pagamento/sucesso?bookingId=${bookingId}`);
          }, 1000); // 1 segundo de transição suave
        } else {
          // Se o banco de dados responder que continua pendente/rejeitado
          navigate(`/pagamento/falha?bookingId=${bookingId}`);
        }
      })
      .catch((err) => {
        console.error("Erro interno ao processar resposta do pagamento:", err);
        navigate(`/pagamento/falha?bookingId=${bookingId}`);
      });
    } else {
      // Se a URL vier completamente sem o ID da reserva, volta por segurança
      console.warn("Nenhum bookingId foi identificado na URL de processamento.");
      navigate("/agendar");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2d3130] antialiased tracking-tight font-sans flex flex-col items-center justify-center px-6 py-12">
      <main className="max-w-md w-full text-center space-y-6">
        
        {/* Identidade Visual Discreta */}
        <div className="flex items-center justify-center gap-1.5 opacity-30">
          <span className="font-black text-sm tracking-tighter text-[#1e2221]">Pahragon</span>
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-teal-600">Beach Tennis</span>
        </div>

        {/* Spinner de Carregamento Animado */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
          <svg className="animate-spin h-8 w-8 text-[#1e2221]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        {/* Texto de Status Dinâmico */}
        <div className="space-y-1">
          <h3 className="text-[#1e2221] font-bold text-lg tracking-tight">
            Processando Transação
          </h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium transition-all">
            {mensagemStatus}
          </p>
        </div>

      </main>
    </div>
  );
}
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

export default function Register() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
  });
  const [erro, setErro] = useState("");
  const [showToast, setShowToast] = useState(false); // 🧼 Estado para controlar o Toast
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "telefone") {
      setForm({ ...form, [name]: maskTelefone(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  function maskTelefone(value) {
    if (!value) return "";
    // Remove tudo o que não for número
    let numbers = value.replace(/\D/g, "");

    // Se passar de 11 dígitos, limita ao tamanho máximo de um celular com DDD
    if (numbers.length > 11) {
      numbers = numbers.slice(0, 11);
    }

    // Aplica a formatação com base na quantidade de números digitados
    if (numbers.length <= 2) {
      return numbers.length > 0 ? `(${numbers}` : "";
    }
    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    // Formato final para celular de 9 dígitos: (41) 99999-9999
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    // 1. Validação de E-mail Real (Regex padrão)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setErro("Por favor, insira um e-mail válido.");
      return;
    }

    // 2. Validação de Senha Forte
    // Exige: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial
    const senhaRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!senhaRegex.test(form.senha)) {
      setErro(
        "A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais (ex: @, $, !, %).",
      );
      return;
    }

    // 3. Validação do Tamanho do Telefone
    // Remove tudo que não for número para contar o tamanho real digitado
    const apenasNumeros = form.telefone.replace(/\D/g, "");
    // Aceita formatos com ou sem DDD (ex: 11 ou 10 dígitos)
    if (
      form.telefone &&
      (apenasNumeros.length < 10 || apenasNumeros.length > 11)
    ) {
      setErro(
        "Por favor, insira um telefone válido com DDD (10 ou 11 dígitos).",
      );
      return;
    }

    try {
      await api.post("/auth/register", form);

      // 🌟 Exibe o Toast no topo direito
      setShowToast(true);

      // 🕒 Dá 3 segundos para ler antes de redirecionar para o login
      setTimeout(() => {
        setShowToast(false);
        navigate("/login");
      }, 3000);
    } catch (_err) {
      const msgDoServidor =
        _err.response?.data?.message || _err.response?.data?.error;

      if (msgDoServidor) {
        setErro(msgDoServidor);
      } else {
        setErro("Erro ao cadastrar. Verifique seus dados e tente novamente.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4 relative">
      <div className="w-full max-w-md">
        {/* Identidade Visual Refinada */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-baseline gap-2 mb-4 cursor-pointer">
            <span className="font-black text-4xl tracking-tighter text-[#1e2221]">
              Pahragon
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-teal-600">
              Beach Tennis
            </span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Criar sua conta
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Junte-se à nossa comunidade no Santa Quitéria.
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          {erro && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl mb-6 font-medium">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              {
                name: "nome",
                label: "Nome completo",
                type: "text",
                placeholder: "Ex: Matheus Leal",
              },
              {
                name: "email",
                label: "E-mail",
                type: "email",
                placeholder: "seu@email.com",
              },
              {
                name: "senha",
                label: "Senha",
                type: "password",
                placeholder: "••••••••",
              },
              {
                name: "telefone",
                label: "Telefone",
                type: "text",
                placeholder: "(41) 99999-9999",
              },
            ].map((field) => (
              <div key={field.name}>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {field.label}
                </label>
                <input
                  className="w-full mt-1.5 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.name]} // 🌟 Adicione essa linha para o input refletir a máscara na tela
                  onChange={handleChange}
                  required={field.name !== "telefone"}
                  maxLength={field.name === "telefone" ? 15 : undefined} // 🔒 Deixe o limite em 15 por causa dos espaços/parênteses
                />
              </div>
            ))}

            <button
              className="w-full bg-[#1e2221] hover:bg-black text-white font-bold py-3.5 rounded-xl transition shadow-sm mt-2 cursor-pointer"
              type="submit"
            >
              Finalizar Cadastro
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Já possui acesso?{" "}
            <Link
              to="/login"
              className="cursor-pointer text-teal-600 font-bold hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>

      {/* 🧼 TOAST DE AVISO NO CANTO SUPERIOR DIREITO */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 font-sans">
          <div className="p-4 rounded-3xl shadow-2xl border border-slate-100/80 backdrop-blur-xl flex items-start gap-4 max-w-sm bg-white/95">
            {/* Ícone de Sucesso */}
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100/60 mt-0.5">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Mensagem */}
            <div className="flex-1 pr-1">
              <p className="text-sm font-black text-slate-950 tracking-tight">
                Conta Criada com Sucesso!
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Por favor, faça seu login na próxima tela para acessar o painel.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import QRCode from "react-qr-code";

export default function List({ contatos = [], onSelectChat, qrCode, statusConexao }) {
  // 1. Criamos um estado para controlar qual aba está ativa ('pessoas' ou 'grupos')
  const [abaAtiva, setAbaAtiva] = useState("pessoas");
  const [mostrarQrModal, setMostrarQrModal] = useState(false);
  // 2. CORREÇÃO: Grupos têm '@g.us'. Pessoas são todos os outros (seja '@s.whatsapp.net' ou '@lid')
  const grupos = contatos.filter((c) => c.id.includes('@g.us'));
  const pessoas = contatos.filter((c) => !c.id.includes('@g.us'));

  // 3. Decidimos qual lista mostrar
  const contatosExibidos = abaAtiva === "pessoas" ? pessoas : grupos;
  // console.log(contatos)

  // Função para renderizar a linha do contato (igual à anterior)
  const renderContato = (contato) => (
    <div
      key={contato.id}
      onClick={() => onSelectChat(contato)}
      className="flex items-center p-4 w-full hover:bg-gray-100 cursor-pointer border-b border-gray-100 active:bg-gray-200"
    >
      <div className="w-12 h-12 bg-[#d8d8d8] rounded-full flex-shrink-0 overflow-hidden">
        {contato.profilePic ? (
          <img
            src={contato.profilePic}
            alt={contato.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-light">
            {contato.name?.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>

      <div className="ml-4 flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h3 className="text-[16.5px] font-medium text-gray-900 truncate pr-2">
            {contato.name}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {contato.timestamp}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate mt-0.5">
          {contato.lastMessage || "Sem mensagens"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      <div className="h-16 bg-[#008069] flex items-center justify-between px-4 shadow-md flex-shrink-0 z-10 w-full relative">
        <h1 className="text-xl font-medium text-white">WhatsApp</h1>

        <div className="flex items-center gap-4 text-white">
          {statusConexao === "conectado" ? (
            <span className="text-xs bg-green-600/50 px-2 py-1 rounded-md border border-green-400">
              Online
            </span>
          ) : qrCode ? (
            <button
              onClick={() => setMostrarQrModal(!mostrarQrModal)}
              className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md font-bold shadow-sm transition-colors flex items-center gap-2"
            >
              Conectar
            </button>
          ) : (
            <span className="text-xs text-gray-200">
              Conectando...
            </span>
          )}

          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>

      {/* MODAL DO QR CODE FLUTUANTE */}
      {mostrarQrModal && qrCode && (
        <div className="absolute top-16 right-4 z-50 bg-white p-6 rounded-lg shadow-2xl border border-gray-200 flex flex-col items-center">
          <h3 className="text-gray-800 font-bold mb-4">Conecte seu WhatsApp</h3>
          <div className="bg-white p-2 rounded-lg border-4 border-[#008069]">
            <QRCode value={qrCode} size={200} />
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center max-w-[200px]">
            Abra o WhatsApp no seu celular, toque em "Aparelhos Conectados" e aponte a câmera.
          </p>
          <button
            onClick={() => setMostrarQrModal(false)}
            className="mt-4 text-sm text-[#008069] font-medium hover:underline"
          >
            Fechar aba
          </button>
        </div>
      )}
      {/* CABEÇALHO */}


      {/* SISTEMA DE ABAS (TABS) */}
      <div className="flex bg-white border-b border-gray-200 shadow-sm z-10 flex-shrink-0">
        <button
          onClick={() => setAbaAtiva("pessoas")}
          className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors duration-200
            ${abaAtiva === "pessoas"
              ? "text-[#008069] border-b-2 border-[#008069]"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
        >
          Pessoas ({pessoas.length})
        </button>
        <button
          onClick={() => setAbaAtiva("grupos")}
          className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors duration-200
            ${abaAtiva === "grupos"
              ? "text-[#008069] border-b-2 border-[#008069]"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
        >
          Grupos ({grupos.length})
        </button>
      </div>

      {/* ÁREA DE SCROLL (Lista dinâmica) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white w-full">
        <div className="flex flex-col w-full pb-6">
          {contatosExibidos.length === 0 ? (
            <div className="p-8 text-center text-gray-400 w-full mt-4">
              {abaAtiva === "pessoas"
                ? "Nenhuma conversa com pessoas encontrada..."
                : "Você não tem mensagens em grupos..."}
            </div>
          ) : (
            contatosExibidos.map(renderContato)
          )}
        </div>
      </div>
    </div>
  );
}
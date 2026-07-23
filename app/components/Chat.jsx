import { useEffect, useRef } from "react";

export default function Chat({ chatName, chatAtivo, mensagens, onBack }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Função auxiliar para renderizar o conteúdo da mensagem baseado no tipo
  const renderMessageContent = (msg) => {
    return (
      <div className="flex flex-col gap-1">
        {/* Renderiza a imagem se o tipo for 'image' */}
        {msg.type === "image" && msg.media && (
          <img
            src={msg.media}
            alt="Mídia recebida"
            className="max-w-full rounded-lg object-cover max-h-64"
          />
        )}

        {/* Renderiza o player de áudio se o tipo for 'audio' */}
        {msg.type === "audio" && msg.media && (
          <audio controls className="w-64 max-w-full h-10">
            <source src={msg.media} type="audio/ogg" /> {/* WhatsApp usa ogg/opus */}
            Seu navegador não suporta o elemento de áudio.
          </audio>
        )}

        {/* Renderiza o texto (serve tanto para msg de texto quanto legendas de imagens) */}
        {msg.body && (
          <span className="text-[#111b21] break-words text-[15.2px] leading-snug">
            {msg.body}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#e5ddd5] relative overflow-hidden">
      {/* Cabeçalho */}
      <div className="h-14 bg-[#008069] flex items-center px-4 shadow-md flex-shrink-0 z-10 text-white">
        <button
          onClick={onBack}
          className="mr-4 flex items-center justify-center -ml-1 p-2 hover:bg-white/20 rounded-full transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center">
          <div className="w-9 h-9 bg-gray-400 rounded-full overflow-hidden">
            {chatAtivo?.profilePic ? (
              <img
                src={chatAtivo.profilePic}
                alt={chatName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl">
                {chatName?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="ml-3">
            <h2 className="font-medium text-[16px]">{chatName}</h2>
            <p className="text-xs text-white/80 -mt-0.5">online</p>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/fundo.jpg')",
          backgroundSize: "cover",
          backgroundRepeat: "repeat"
        }}
      >
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />

        <div className="flex flex-col gap-2 relative z-10">
          {mensagens.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center text-white/80 bg-black/30 px-6 py-3 rounded-xl">
                Aguardando mensagens...
              </div>
            </div>
          ) : (
            mensagens.map((msg, index) => {
              const isMe = msg.fromMe;
              return (
                <div key={msg.id || index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[75%] px-2 py-2 rounded-2xl shadow-sm
                      ${isMe ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"}`}
                  >
                    
                    {/* Chama a função que renderiza a mídia/texto */}
                    {renderMessageContent(msg)}

                    <div className="text-[11px] text-[#667781] flex items-center justify-end gap-1 mt-1">
                      {msg.timestamp}
                      {isMe && (
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 6L6.5 11.5L17 1" stroke="#53bdeb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.5 11.5L12 6" stroke="#53bdeb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Barra inferior */}
      <div className="h-14 bg-[#f0f2f5] border-t border-gray-200 flex items-center justify-center z-10">
        <p className="text-[#8696a0] text-sm font-medium">
          Modo Monitoramento - Apenas Leitura
        </p>
      </div>
    </div>
  );
}
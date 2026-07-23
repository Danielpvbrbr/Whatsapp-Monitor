"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import List from "./components/List";
import Chat from "./components/Chat";

const socket = io("http://localhost:3001", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});

export default function Home() { // <-- CHAVE ADICIONADA AQUI
  const [chats, setChats] = useState([]);
  const [chatAtivo, setChatAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [isCarregando, setIsCarregando] = useState(true);
  
  // Novos estados do QR Code
  const [qrCode, setQrCode] = useState(null);
  const [statusConexao, setStatusConexao] = useState("carregando");
  
  const intervalRef = useRef(null);

  const loadData = useCallback(() => {
    socket.emit("get_full_data");
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 5000);

    socket.on("qr_code", (qr) => {
      setQrCode(qr);
      setStatusConexao("aguardando_qr");
    });

    socket.on("status_conexao", (status) => {
      setStatusConexao(status);
      if (status === "conectado") setQrCode(null);
    });

    socket.on("full_data", (data) => {
      if (data.chats) {
        setChats(data.chats);
        setIsCarregando(false);
      }
      if (chatAtivo?.id && data.messages?.[chatAtivo.id]) {
        setMensagens(data.messages[chatAtivo.id]);
      }
    });

    socket.on("nova_mensagem", (data) => {
      if (chatAtivo && data.chatId === chatAtivo.id) {
        setMensagens((prev) => [...prev, data.novaMsg]);
      }
    });

    return () => {
      clearInterval(intervalRef.current);
      socket.off("full_data");
      socket.off("nova_mensagem");
      socket.off("qr_code");
      socket.off("status_conexao");
    };
  }, [chatAtivo, loadData]);

  const abrirConversa = (contato) => {
    setChatAtivo(contato);
    setMensagens([]);
    socket.emit("solicitar_mensagens", contato.id);
  };

  const handleSendMessage = (text) => {
    if (!chatAtivo || !text?.trim()) return;

    const novaMsg = {
      id: Date.now().toString(36),
      body: text.trim(),
      fromMe: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMensagens((prev) => [...prev, novaMsg]);
  };

  // <-- AJUSTE AQUI: O loading só aparece se não estivermos esperando o QR Code
  if (isCarregando && statusConexao !== "aguardando_qr") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#008069] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f0f2f5]">
      {!chatAtivo ? (
        <List
          contatos={chats}
          onSelectChat={abrirConversa}
          qrCode={qrCode}
          statusConexao={statusConexao}
        />
      ) : (
        <Chat
          chatName={chatAtivo.name}
          chatAtivo={chatAtivo}
          mensagens={mensagens}
          onBack={() => setChatAtivo(null)}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
} // <-- CHAVE ADICIONADA AQUI
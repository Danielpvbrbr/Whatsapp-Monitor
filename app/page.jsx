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

export default function Home() {
  const [chats, setChats] = useState([]);
  const [chatAtivo, setChatAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [isCarregando, setIsCarregando] = useState(true);

  const intervalRef = useRef(null);

  const loadData = useCallback(() => {
    socket.emit("get_full_data");
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 5000);

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

  if (isCarregando) {
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
        <List contatos={chats} onSelectChat={abrirConversa} />
      ) : (
        <Chat
          chatName={chatAtivo.name}
          chatAtivo={chatAtivo}           // ← Importante para foto
          mensagens={mensagens}
          onBack={() => setChatAtivo(null)}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}
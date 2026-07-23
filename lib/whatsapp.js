const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { Server } = require("socket.io");
const http = require("http");
const fs = require('fs');
const pino = require('pino');

const server = http.createServer();
const io = new Server(server, { cors: { origin: "*" } });

const ARQUIVO_BANCO = './banco_whatsapp_limpo.json';

let store = { chats: {}, messages: {} };

if (fs.existsSync(ARQUIVO_BANCO)) {
    try {
        store = JSON.parse(fs.readFileSync(ARQUIVO_BANCO, 'utf-8'));
    } catch (e) { }
}

const saveStore = () => {
    fs.writeFileSync(ARQUIVO_BANCO, JSON.stringify(store, null, 2));
};

setInterval(saveStore, 10000);

let currentQr = null;
let isConnected = false;
let sock;

async function startBaileys() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        markOnlineOnConnect: false,
    });

    // Salvar credenciais sempre que atualizar
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📱 Novo QR Code gerado. Enviando para o Frontend...");
            currentQr = qr; // Salva na memória
            io.emit("qr_code", qr); // Envia para o React!
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ Conectado com sucesso ao WhatsApp (Baileys)!');
            isConnected = true;
            currentQr = null; // Limpa da memória
            io.emit("status_conexao", "conectado"); // Avisa o React!
        }

        if (connection === 'close') {
            isConnected = false;
            currentQr = null;
            io.emit("status_conexao", "desconectado"); // Avisa o React!

            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. Reconectando...', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(startBaileys, 2000);
            } else {
                console.log("❌ Desconectado (Saiu do WhatsApp). Apague a pasta auth_info_baileys para gerar um novo QR Code.");
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        // 1. MUDOU DE 'const' PARA 'let'
        let chatId = msg.key.remoteJid;

        // TRAVA: Se for de Canal (Newsletter) ou Status (Broadcast), ignora tudo!
        if (chatId.includes('@newsletter') || chatId.includes('@broadcast')) {
            return; // Sai da função imediatamente, não salva nada!
        }

        // Se a mensagem vier com o ID oculto (@lid), usamos o número de telefone real!
        if (msg.key.remoteJidAlt) {
            chatId = msg.key.remoteJidAlt;
        }

        const isMe = msg.key.fromMe;
        // ---------------------------------------------------------
        // LÓGICA PARA NOME DO CONTATO OU GRUPO
        // ---------------------------------------------------------
        let contactName = msg.pushName || chatId.split('@')[0];

        if (chatId.includes('@g.us')) {
            // Se for um grupo, tentamos buscar o nome real dele
            try {
                // Se o nome ainda não foi salvo ou se está salvo com esse número feio (120363...)
                if (!store.chats[chatId] || store.chats[chatId].name.startsWith('12036')) {
                    const groupMetadata = await sock.groupMetadata(chatId);
                    contactName = groupMetadata.subject; // Pega o nome real do grupo!
                } else {
                    contactName = store.chats[chatId].name; // Mantém o nome que já tava bonitinho
                }
            } catch (error) {
                console.log("Não foi possível buscar o nome do grupo:", chatId);
            }
        } else {
            // Se for pessoa, e a mensagem não veio com nome, tenta usar o nome que já tá no banco
            if (!msg.pushName && store.chats[chatId]?.name) {
                contactName = store.chats[chatId].name;
            }
        }
        // ---------------------------------------------------------

        // 1. Recupera/Atualiza a foto de perfil (que tinha sumido do código)
        let urlFotoPerfil = store.chats[chatId]?.profilePic || null;
        if (!urlFotoPerfil) {
            try {
                urlFotoPerfil = await sock.profilePictureUrl(chatId, 'image');
            } catch (error) {
                // Adicionamos esse console.log para ver o motivo do bloqueio
                console.log(`❌ Sem foto para ${contactName} (${chatId}): ${error.message}`);
                urlFotoPerfil = null;
            }
        }

        // Variáveis para identificar o que estamos recebendo
        let messageType = 'text';
        let body = "";
        let mediaData = null;

        try {
            // Verifica se é imagem
            if (msg.message.imageMessage) {
                messageType = 'image';
                body = msg.message.imageMessage.caption || "";
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                mediaData = `data:${msg.message.imageMessage.mimetype};base64,${buffer.toString('base64')}`;
            }
            // Verifica se é áudio
            else if (msg.message.audioMessage) {
                messageType = 'audio';
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                mediaData = `data:${msg.message.audioMessage.mimetype};base64,${buffer.toString('base64')}`;
            }
            // Verifica se é vídeo/figurinha
            else if (msg.message.videoMessage || msg.message.stickerMessage) {
                messageType = 'text';
                body = "Mídia não suportada (Vídeo/Figurinha)";
            }
            // Se for texto normal
            else {
                body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            }
        } catch (error) {
            // Se der timeout de rede, cai aqui, mas NÃO derruba o app
            console.error("Erro ao baixar mídia do WhatsApp:", error.message);
            body = "Erro ao carregar mídia (Timeout).";
        }

        // 2. CORREÇÃO: Garante que o array existe ANTES de dar o push
        if (!store.messages[chatId]) {
            store.messages[chatId] = [];
        }

        // 3. Atualiza os dados do Chat na lista da esquerda
        store.chats[chatId] = {
            id: chatId,
            name: contactName,
            // Um pequeno ajuste visual: se for foto/áudio, mostra o ícone na prévia da mensagem
            lastMessage: messageType === 'image' ? '📷 Imagem' : (messageType === 'audio' ? '🎵 Áudio' : (body.length > 60 ? body.substring(0, 57) + '...' : body)),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            profilePic: urlFotoPerfil
        };

        console.log(msg)

        // 4. Salva a mensagem (APENAS UMA VEZ)
        store.messages[chatId].push({
            id: msg.key.id,
            type: messageType,
            body: body,
            media: mediaData,
            fromMe: isMe,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // 5. Emite para o Frontend
        io.emit("nova_mensagem", { chatId, novaMsg: store.messages[chatId].at(-1) });
        io.emit("atualizar_chats", Object.values(store.chats));

        // saveStore();
    });

}

startBaileys();

// ==================== SOCKET ====================
io.on("connection", (socket) => {
    console.log("🟢 Cliente frontend conectado");
    socket.emit("carregar_chats", Object.values(store.chats));

    socket.on("solicitar_mensagens", (chatId) => {
        socket.emit("historico_mensagens", store.messages[chatId] || []);
    });

    socket.on("get_full_data", () => {
        socket.emit("full_data", {
            chats: Object.values(store.chats),
            messages: store.messages
        });
    });
});

server.listen(3001, () => {
    console.log("Servidor Baileys rodando na porta 3001");
});
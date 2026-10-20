require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { TikTokLiveConnection, WebcastEvent } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT || 3000);
const USERNAME = (process.env.TIKTOK_USERNAME || "").replace(/^@/, "").trim();
let connection = null;
let connecting = false;
let liveConnected = false;

app.use(express.json({ limit: "12kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.post("/api/reply", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const nickname = String(req.body?.nickname || "espectador").slice(0, 40);
  const comment = String(req.body?.comment || "").slice(0, 240);
  if (!comment.trim()) return res.status(400).json({ error: "Comentário vazio." });
  if (!apiKey) return res.json({ reply: quickReply(nickname, comment), mode: "basic" });
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: "Você é um personagem divertido de live brasileira. Responda em português brasileiro, de forma espontânea, simpática e curta (máximo 18 palavras). Sempre mencione o nome do usuário exatamente uma vez. Não afirme que realizou ações reais. Não use emojis em excesso." }] }, contents: [{ role: "user", parts: [{ text: "Usuário: " + nickname + "\nComentário: " + comment + "\nDê uma resposta falada curta." }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 70 } })
    });
    if (!response.ok) throw new Error("Gemini HTTP " + response.status);
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join(" ").trim();
    if (!reply) throw new Error("Resposta vazia");
    res.json({ reply: reply.slice(0, 260), mode: "ai" });
  } catch (error) {
    console.error("Erro na resposta IA:", error.message);
    res.json({ reply: quickReply(nickname, comment), mode: "basic" });
  }
});
function quickReply(nickname, comment) {
  const m = comment.toLowerCase();
  if (/\b(oi|olá|ola|eai|e aí)\b/.test(m)) return "Oii, " + nickname + "! Que bom ter você aqui na live!";
  if (/\b(tudo bem|como vai)\b/.test(m)) return "Tudo ótimo por aqui, " + nickname + "! E você, tá curtindo a live?";
  if (/\b(pula|pular)\b/.test(m)) return "Você pediu e eu pulei, " + nickname + "! Manda a próxima!";
  if (/\b(dança|danca)\b/.test(m)) return "Bora dançar, " + nickname + "! Essa é pra você!";
  return "Valeu pelo comentário, " + nickname + "! Continua participando da live!";
}
app.get("/api/status", (_req, res) => res.json({ connected: liveConnected, username: USERNAME || null }));

function resolveNickname(data) {
  const candidates = [data?.nickname, data?.user?.nickname, data?.user?.displayName, data?.uniqueId, data?.unique_id, data?.user?.uniqueId, data?.user?.unique_id, data?.username];
  const name = candidates.find(value => typeof value === "string" && value.trim());
  return name ? name.trim().replace(/^@/, "") : "espectador";
}

function broadcast(type, payload) {
  io.emit("live-event", { type, ...payload, receivedAt: new Date().toISOString() });
}

async function connectTikTok(requestedUsername) {
  if (connecting || liveConnected) return;
  const targetUsername = (requestedUsername || USERNAME || "").replace(/^@/, "").trim();
  if (!targetUsername) {
    broadcast("system", { message: "Configure TIKTOK_USERNAME no arquivo .env para conectar à live." });
    return;
  }
  connecting = true;
  broadcast("system", { message: "Tentando conectar à live de @" + targetUsername + "..." });
  try {
    connection = new TikTokLiveConnection(targetUsername, { processInitialData: false });
    connection.on(WebcastEvent.CHAT, data => {
      const comment = data.comment || "";
      const nickname = resolveNickname(data);
      broadcast("chat", { nickname, uniqueId: data.uniqueId || data.unique_id || data.user?.uniqueId || null, comment, userId: data.userId || data.user?.userId || null });
    });
    connection.on(WebcastEvent.GIFT, data => {
      broadcast("gift", {
        nickname: resolveNickname(data),
        uniqueId: data.uniqueId || data.unique_id || data.user?.uniqueId || null,
        giftName: data.giftName || data.gift?.name || "presente",
        repeatCount: data.repeatCount || data.repeat_count || 1
      });
    });
    connection.on(WebcastEvent.FOLLOW, data => {
      broadcast("follow", { nickname: data.nickname || data.uniqueId || "Novo seguidor" });
    });
    connection.on("streamEnd", () => {
      liveConnected = false;
      broadcast("system", { message: "A live terminou ou a conexão foi encerrada." });
    });
    const result = await connection.connect();
    liveConnected = true;
    broadcast("status", { message: "Conectado à live de @" + targetUsername, roomId: result.roomId || null });
  } catch (error) {
    liveConnected = false;
    broadcast("system", { message: "Não foi possível conectar: " + (error.message || "erro desconhecido") + ". Confirme se a conta está ao vivo e se o usuário está correto." });
  } finally {
    connecting = false;
  }
}

io.on("connection", socket => {
  socket.emit("live-event", { type: "status", message: liveConnected ? "Conectado à live." : "Jogo iniciado. Conecte quando a live estiver ativa." });
  socket.on("connect-tiktok", username => connectTikTok(username));
  socket.on("disconnect-tiktok", async () => {
    try { if (connection) await connection.disconnect(); } catch (_) {}
    connection = null;
    liveConnected = false;
    broadcast("system", { message: "Conexão com TikTok encerrada manualmente." });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Jogo disponível em http://localhost:" + PORT);
  console.log("Configure TIKTOK_USERNAME no .env e inicie a live antes de conectar.");
});

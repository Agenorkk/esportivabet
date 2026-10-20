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

app.use(express.static(path.join(__dirname, "public")));
app.get("/api/status", (_req, res) => res.json({ connected: liveConnected, username: USERNAME || null }));

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
      const nickname = data.nickname || data.uniqueId || "Espectador";
      broadcast("chat", { nickname, comment, userId: data.userId || null });
    });
    connection.on(WebcastEvent.GIFT, data => {
      broadcast("gift", {
        nickname: data.nickname || data.uniqueId || "Espectador",
        giftName: data.giftName || "presente",
        repeatCount: data.repeatCount || 1
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

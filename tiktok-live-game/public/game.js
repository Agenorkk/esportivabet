const socket = io();
const $ = id => document.getElementById(id);
const badge = $("connectionBadge");
const log = $("log");
const speechText = $("speechText");
const speechBubble = $("speechBubble");
const character = $("character");
let followerCount = 0;
let lastSpokenAt = 0;
let commentQueue = [];
let speaking = false;

function addLog(message) {
  const p = document.createElement("p");
  p.textContent = new Date().toLocaleTimeString("pt-BR") + " — " + message;
  log.appendChild(p);
  while (log.children.length > 7) log.removeChild(log.children[1]);
}
function addFeed(label, message) {
  const feed = $("eventFeed");
  const empty = feed.querySelector(".feed-empty");
  if (empty) empty.remove();
  const item = document.createElement("div");
  item.className = "feed-item";
  const b = document.createElement("b");
  b.textContent = label + ": ";
  item.appendChild(b);
  item.appendChild(document.createTextNode(message));
  feed.prepend(item);
  while (feed.children.length > 4) feed.lastElementChild.remove();
}
function speak(text) {
  if (!$("voiceToggle").checked || !("speechSynthesis" in window)) return;
  commentQueue.push(String(text).slice(0, 180));
  processSpeechQueue();
}
function processSpeechQueue() {
  if (speaking || !commentQueue.length) return;
  speaking = true;
  const text = commentQueue.shift();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = Number($("speechRate").value);
  const voices = speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.toLowerCase().startsWith("pt-br")) || voices.find(v => v.lang.toLowerCase().startsWith("pt"));
  if (ptVoice) utterance.voice = ptVoice;
  utterance.onend = utterance.onerror = () => { speaking = false; processSpeechQueue(); };
  speechSynthesis.speak(utterance);
}
function react(type, data) {
  if (type === "chat") {
    const nickname = data.nickname || "Espectador";
    const comment = (data.comment || "").trim();
    if (!comment) return;
    addFeed(nickname, comment);
    const lower = comment.toLowerCase();
    if (lower.includes("oi") || lower.includes("olá") || lower.includes("ola")) {
      speechText.textContent = "Salve, " + nickname + "! Bem-vindo à arena!";
      if ($("readAllToggle").checked) speak("Salve, " + nickname + "! Bem-vindo à arena!");
      else speak("Salve, " + nickname + "!");
    } else if (lower.includes("pula") || lower.includes("pular")) {
      character.animate([{transform:"translateY(0)"},{transform:"translateY(-55px)"},{transform:"translateY(0)"}],{duration:650});
      speechText.textContent = nickname + " mandou pular! Olha o salto!";
      speak(nickname + " mandou pular! Olha o salto!");
    } else if (lower.includes("dança") || lower.includes("danca")) {
      character.animate([{transform:"rotate(0)"},{transform:"rotate(12deg)"},{transform:"rotate(-12deg)"},{transform:"rotate(0)"}],{duration:850});
      speechText.textContent = "Bora dançar, " + nickname + "!";
      speak("Bora dançar, " + nickname + "!");
    } else if ($("readAllToggle").checked) {
      speechText.textContent = nickname + escreveu ? "" : "";
    } else {
      speechText.textContent = "Comentário de " + nickname + " recebido!";
    }
    if ($("readAllToggle").checked && !lower.includes("oi") && !lower.includes("olá") && !lower.includes("ola") && !lower.includes("pula") && !lower.includes("pular") && !lower.includes("dança") && !lower.includes("danca")) {
      speechText.textContent = nickname + " comentou: " + comment;
      speak(nickname + " comentou: " + comment);
    }
  } else if (type === "gift") {
    const text = (data.nickname || "Alguém") + " enviou " + (data.giftName || "um presente");
    speechText.textContent = "Muito obrigado pelo presente, " + (data.nickname || "chat") + "!";
    addFeed("🎁 PRESENTE", text);
    speak("Muito obrigado pelo presente, " + (data.nickname || "chat") + "!");
  } else if (type === "follow") {
    followerCount++;
    $("goalCount").textContent = followerCount + " / 100";
    $("goalProgress").style.width = Math.min(100, followerCount) + "%";
    speechText.textContent = "Valeu por seguir, " + data.nickname + "!";
    addFeed("⭐ NOVO SEGUIDOR", data.nickname || "Espectador");
    speak("Valeu por seguir, " + (data.nickname || "amigo") + "!");
  } else if (data.message) {
    addLog(data.message);
    $("sceneStatus").textContent = data.message;
    if (type === "status" && data.message.toLowerCase().includes("conectado")) {
      badge.textContent = "Conectado";
      badge.classList.add("connected");
    }
  }
}
socket.on("connect", () => addLog("Conectado ao servidor do jogo."));
socket.on("disconnect", () => { badge.textContent = "Servidor offline"; badge.classList.remove("connected"); });
socket.on("live-event", event => react(event.type, event));

$("connectBtn").addEventListener("click", () => {
  const username = $("username").value.trim().replace(/^@/, "");
  if (!username) { addLog("Digite o usuário do TikTok sem @."); return; }
  socket.emit("connect-tiktok");
  addLog("Solicitada conexão para @" + username + ". O usuário precisa estar configurado no .env do servidor.");
});
$("testBtn").addEventListener("click", () => {
  const samples = [
    {type:"chat",nickname:"netinho_p1",comment:"oi guardião"},
    {type:"chat",nickname:"visitante",comment:"pula"},
    {type:"gift",nickname:"fã da live",giftName:"Rosa"},
    {type:"follow",nickname:"novo_seguidor"}
  ];
  react(samples[Math.floor(Math.random()*samples.length)].type, samples[Math.floor(Math.random()*samples.length)]);
});
$("characterSelect").addEventListener("change", e => {
  character.classList.remove("robot","ninja");
  if (e.target.value === "robot") {
    character.classList.add("robot");
    speechText.textContent = "Bip-bop! Robô Byte online. Digite no chat!";
  } else if (e.target.value === "ninja") {
    character.classList.add("ninja");
    speechText.textContent = "Sou o Ninja Sombrio. Digite no chat para me desafiar!";
  } else {
    speechText.textContent = "Eu sou o Guardião da Arena. Mande um oi!";
  }
  speak(speechText.textContent);
});
$("speechRate").addEventListener("input", e => $("rateValue").textContent = Number(e.target.value).toFixed(1) + "x");

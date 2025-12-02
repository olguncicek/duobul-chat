const socket = io();

const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");

const chatContainer = document.getElementById("chat-container");
const messagesUl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

let username = null;

// TR saatini doğru göstermek için (hem client hem server aynı format)
function getTurkeyTime() {
  const now = new Date();
  return now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  });
}

// Basit XSS koruması
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ========= GİRİŞ ========= */

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;
  username = name;

  // Sunucuya kullanıcı adını bildir
  socket.emit("set_username", username);

  // Giriş ekranını kaldır, sohbeti göster
  loginScreen.style.display = "none";
  chatContainer.style.display = "flex";

  msgInput.focus();
});

/* ========= MESAJ GÖNDERME ========= */

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !username) return;

  const message = {
    user: username,
    text,
    time: getTurkeyTime(), // saat client'tan
  };

  socket.emit("sendMessage", message);
  msgInput.value = "";
  msgInput.focus();
}

sendBtn.addEventListener("click", sendMessage);

msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

/* ========= MESAJ ALMA ========= */

socket.on("chat_message", (msg) => {
  addMessage(msg);
});

socket.on("user_status", (data) => {
  addStatusMessage(data);
});

/* ========= EKRANA BASMA ========= */

function addMessage(msg) {
  const li = document.createElement("li");
  li.classList.add("message");
  if (msg.user === username) {
    li.classList.add("mine");
  }

  li.innerHTML = `
    <div class="message-header">
      <div class="message-user">
        <span class="status-dot online"></span>
        <span>${escapeHTML(msg.user)}</span>
      </div>
      <span class="message-time">${msg.time}</span>
    </div>
    <div class="message-text">${escapeHTML(msg.text)}</div>
  `;

  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

function addStatusMessage(data) {
  const { user, status, time } = data;

  const li = document.createElement("li");
  li.classList.add("status-message");

  const statusText =
    status === "online"
      ? `${user} sohbet odasına katıldı`
      : `${user} sohbetten ayrıldı`;

  li.innerHTML = `
    <span class="status-dot ${status === "online" ? "online" : "offline"}"></span>
    <span>${escapeHTML(statusText)}</span>
    <span class="message-time">${time}</span>
  `;

  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

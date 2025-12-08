const socket = io();

// HTML Elementleri
const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const chatContainer = document.getElementById("chatContainer");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");

const notificationSound = document.getElementById("notificationSound");

let myUsername = "";
let currentRoom = "genel"; 

/* ---------- 1. GİRİŞ İŞLEMLERİ ---------- */
function doLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    alert("Lütfen kullanıcı adı ve şifre giriniz!");
    return;
  }
  
  socket.emit("loginAttempt", { username, password });
}

// Giriş Başarılı
socket.on("loginSuccess", (approvedUsername) => {
  myUsername = approvedUsername;
  loginModal.classList.add("hidden");
  chatContainer.classList.remove("blur");
  msgInput.focus();
});

// Hatalı Giriş
socket.on("loginError", (message) => {
  alert(message);
  passwordInput.value = "";
});

loginBtn.addEventListener("click", doLogin);
passwordInput.addEventListener("keypress", (e) => { if (e.key === "Enter") doLogin(); });
usernameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") doLogin(); });

/* ---------- 2. ODA DEĞİŞTİRME ---------- */
lobbyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const roomName = btn.dataset.room;
    if (roomName === currentRoom) return;

    document.querySelector(".lobby-btn.active").classList.remove("active");
    btn.classList.add("active");

    messagesUl.innerHTML = "";
    currentRoom = roomName;
    socket.emit("joinRoom", currentRoom);
  });
});

/* ---------- 3. MESAJ GÖNDERME ---------- */
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !myUsername) return;

  const time = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  socket.emit("sendMessage", { text, time });
  msgInput.value = "";
  msgInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

/* ---------- 4. SUNUCUDAN GELENLER ---------- */

socket.on("newMessage", (msg) => {
  addMessage(msg.username, msg.text, msg.time);
  
  // SES ÇALMA ÖZELLİĞİ
  if (msg.username !== myUsername) {
    notificationSound.play().catch(e => console.log(e));
  }
});

socket.on("loadHistory", (messages) => {
  messagesUl.innerHTML = "";
  messages.forEach((msg) => {
    addMessage(msg.username, msg.text, msg.time);
  });
  scrollToBottom();
});

/* ---------- YARDIMCI FONKSİYONLAR ---------- */
function addMessage(username, text, time) {
  const li = document.createElement("li");
  li.classList.add("message");
  
  if (username === myUsername) {
    li.classList.add("mine");
  }

  const header = document.createElement("div");
  header.classList.add("message-header");

  const sender = document.createElement("span");
  sender.classList.add("sender");
  sender.textContent = username;

  const date = document.createElement("span");
  date.classList.add("date");
  date.textContent = time;

  header.appendChild(sender);
  header.appendChild(date);

  const textP = document.createElement("p");
  textP.classList.add("text");
  textP.textContent = text;

  li.appendChild(header);
  li.appendChild(textP);

  messagesUl.appendChild(li);
  scrollToBottom();
}

function scrollToBottom() {
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

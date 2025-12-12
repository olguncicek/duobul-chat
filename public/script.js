const socket = io();

// HTML Elementleri
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const chatContainer = document.getElementById("chatContainer");

const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const doRegisterBtn = document.getElementById("doRegisterBtn");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");

let myUsername = "";
let currentRoom = "genel";
const userStatusMap = {};

/* ---------- 1. GİRİŞ VE MODAL GEÇİŞLERİ ---------- */
function doLogin() {
  const name = usernameInput.value.trim();
  if (!name) return alert("Lütfen kullanıcı adınızı girin!");
  myUsername = name;
  socket.emit("setUsername", myUsername);
  loginModal.classList.add("hidden");
  chatContainer.classList.remove("blur");
  msgInput.focus();
}

loginBtn.addEventListener("click", doLogin);
usernameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") doLogin(); });

// Kayıt ekranını aç
registerBtn.addEventListener("click", () => {
  loginModal.classList.add("hidden");
  registerModal.classList.remove("hidden");
});

// Giriş ekranına dön
backToLoginBtn.addEventListener("click", () => {
  registerModal.classList.add("hidden");
  loginModal.classList.remove("hidden");
});

/* ---------- 2. KAYIT İŞLEMİ VE KONTROLLER ---------- */
doRegisterBtn.addEventListener("click", () => {
  const email = document.getElementById("regEmail").value.trim();
  const uName = document.getElementById("regUsername").value.trim();
  const pass = document.getElementById("regPass").value.trim();
  const name = document.getElementById("regName").value.trim();

  // Boş alan kontrolü
  if (!email || !uName || !pass || !name) {
    return alert("Lütfen tüm alanları doldurun!");
  }

  // E-posta Regex kontrolü
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return alert("Lütfen geçerli bir e-posta adresi girin!");
  }

  // RAM Modunda çalıştığımız için doğrudan başarı mesajı veriyoruz
  alert("Kayıt Başarılı! Şimdi giriş yapabilirsiniz.");
  registerModal.classList.add("hidden");
  loginModal.classList.remove("hidden");
});

/* ---------- 3. ODA VE MESAJ İŞLEMLERİ ---------- */
lobbyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const roomName = btn.dataset.room;
    if (roomName === currentRoom) return;
    document.querySelector(".lobby-btn.active").classList.remove("active");
    btn.classList.add("active");
    messagesUl.innerHTML = "";
    socket.emit("joinRoom", roomName);
    currentRoom = roomName;
  });
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  socket.emit("sendMessage", { text, time });
  msgInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

/* ---------- 4. SOCKET OLAYLARI ---------- */
socket.on("newMessage", (msg) => { addMessageToUI(msg.username, msg.text, msg.time); });

socket.on("loadHistory", (messages) => {
  messagesUl.innerHTML = "";
  messages.forEach((m) => addMessageToUI(m.username, m.text, m.time));
});

socket.on("userStatus", (data) => {
  userStatusMap[data.username] = data.online ? "online" : "offline";
  updateAllUserStatuses();
});

socket.on("activeUsersList", (list) => {
  list.forEach(u => { userStatusMap[u] = "online"; });
  updateAllUserStatuses();
});

function addMessageToUI(username, text, time) {
  const li = document.createElement("li");
  li.className = "message";
  li.dataset.username = username;
  li.innerHTML = `
    <div class="message-header">
      <span class="status-dot ${userStatusMap[username] === 'online' ? '' : 'offline'}"></span>
      <span class="sender">${username}</span>
      <span class="date">${time}</span>
    </div>
    <p class="text">${text}</p>
  `;
  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

function updateAllUserStatuses() {
  document.querySelectorAll("li.message").forEach(li => {
    const dot = li.querySelector(".status-dot");
    const uName = li.dataset.username;
    if (userStatusMap[uName] === "online") dot.classList.remove("offline");
    else dot.classList.add("offline");
  });
}

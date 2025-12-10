/* public/script.js - TAM VE HATASIZ SÜRÜM */

const socket = io();

// --- HTML Elementleri ---
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const chatContainer = document.getElementById("chatContainer");

// Butonlar
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const doRegisterBtn = document.getElementById("doRegisterBtn");
const sendBtn = document.getElementById("sendBtn");

// Inputlar
const usernameInput = document.getElementById("usernameInput");
const msgInput = document.getElementById("msgInput");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");

// Kayıt Formu Inputları
const regName = document.getElementById("regName");
const regSurname = document.getElementById("regSurname");
const regYear = document.getElementById("regYear");
const regEmail = document.getElementById("regEmail");
const regPass = document.getElementById("regPass");

let myUsername = "";
let currentRoom = "genel"; 
const userStatusMap = {};

/* ===========================
   1. GİRİŞ İŞLEMLERİ
   =========================== */
function doLogin() {
  const name = usernameInput.value.trim();
  if (!name) {
    alert("Lütfen bir kullanıcı adı gir!");
    return;
  }
  myUsername = name;
  socket.emit("setUsername", myUsername);
  
  loginModal.classList.add("hidden");
  chatContainer.classList.remove("blur");
}

if (loginBtn) {
  loginBtn.addEventListener("click", doLogin);
}

if (usernameInput) {
  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doLogin();
  });
}

/* ===========================
   2. KAYIT İŞLEMLERİ
   =========================== */
// Giriş -> Kayıt Ekranına Geçiş
if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    registerModal.classList.remove("hidden");
  });
}

// Kayıt -> Giriş Ekranına Dönüş
if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", () => {
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
  });
}

// Kayıt Ol Butonu
if (doRegisterBtn) {
  doRegisterBtn.addEventListener("click", () => {
    const userData = {
      name: regName.value.trim(),
      surname: regSurname.value.trim(),
      year: regYear.value.trim(),
      email: regEmail.value.trim(),
      password: regPass.value.trim()
    };

    if (!userData.name || !userData.email || !userData.password) {
      alert("Lütfen gerekli alanları doldurun.");
      return;
    }

    // Sunucuya gönder
    socket.emit("registerUser", userData);
  });
}

// Sunucudan Kayıt Cevabı Gelince
socket.on("registerResponse", (response) => {
  if (response.success) {
    alert("Kayıt Başarılı! Giriş yapabilirsin.");
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
    // Formu temizle
    regName.value = ""; regEmail.value = ""; regPass.value = "";
  } else {
    alert("Hata: " + response.message);
  }
});

/* ===========================
   3. ODA VE MESAJ İŞLEMLERİ
   =========================== */
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

if (sendBtn) sendBtn.addEventListener("click", sendMessage);
if (msgInput) msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* ===========================
   4. SOCKET OLAYLARI
   =========================== */
socket.on("newMessage", (msg) => addMessageToUI(msg));
socket.on("loadHistory", (msgs) => {
  messagesUl.innerHTML = "";
  msgs.forEach(addMessageToUI);
});
socket.on("activeUsersList", (list) => {
  list.forEach(u => userStatusMap[u] = "online");
});
socket.on("userStatus", (data) => {
  userStatusMap[data.username] = data.online ? "online" : "offline";
});

function addMessageToUI(msg) {
  const li = document.createElement("li");
  li.className = "message";
  li.innerHTML = `
    <div class="message-header">
       <span class="sender">${msg.username}</span>
       <span class="date">${msg.time}</span>
    </div>
    <p class="text">${msg.text}</p>
  `;
  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

const socket = io();

// HTML Elementleri
const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const passGroup = document.getElementById("passGroup");
const mainActionBtn = document.getElementById("mainActionBtn"); // Giriş/Kayıt Butonu
const toggleModeBtn = document.getElementById("toggleModeBtn"); // Mod Değiştirme Butonu
const formTitle = document.getElementById("formTitle");
const loginError = document.getElementById("loginError");

const chatContainer = document.getElementById("chatContainer");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");

let myUsername = "";
let currentRoom = "genel"; 
let isRegisterMode = false; // Şuan Kayıt modunda mıyız?

const userStatusMap = {}; // Kim online, kim offline

/* ---------- 1. GİRİŞ / KAYIT UI MANTIĞI ---------- */

// Modlar arasında geçiş (Giriş Yap <-> Kayıt Ol)
function switchMode() {
  isRegisterMode = !isRegisterMode;
  loginError.style.display = "none"; // Hata varsa gizle
  usernameInput.value = "";
  passwordInput.value = "";

  if (isRegisterMode) {
    // Kayıt Modu Görünümü
    formTitle.textContent = "Yeni Hesap Oluştur";
    passGroup.style.display = "block"; // Şifreyi göster
    mainActionBtn.textContent = "Kayıt Ol ve Gir ➤";
    mainActionBtn.style.background = "#19e5ff"; // Mavi tonu
    toggleModeBtn.textContent = "Zaten hesabın var mı? Giriş Yap";
  } else {
    // Giriş Modu Görünümü
    formTitle.textContent = "Anında Bağlan, Hemen Oyna.";
    passGroup.style.display = "none"; // Şifreyi (opsiyonel) gizle ama biz basitlik olsun diye login'de şifre istemeyeceğiz ya da isteyeceğiz
    // NOT: Kullanıcı "Kayıt Ol" butonu çalışmıyor dediği için Login'de de şifre soralım ki anlamı olsun.
    passGroup.style.display = "block"; 
    
    mainActionBtn.textContent = "Giriş Yap ➤";
    mainActionBtn.style.background = "#22e56f"; // Yeşil tonu
    toggleModeBtn.textContent = "Kayıt Ol";
  }
}

// Butona tıklayınca mod değiştir
toggleModeBtn.addEventListener("click", switchMode);

// Ana Butona (Giriş/Kayıt) Tıklama
function handleAuth() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username) {
    showError("Lütfen kullanıcı adı gir.");
    return;
  }
  
  // Eğer Kayıt modundaysak veya Giriş modunda şifre girilmişse
  if (isRegisterMode && !password) {
    showError("Kayıt olmak için şifre belirlemelisin.");
    return;
  }

  // Sunucuya isteği gönder
  const action = isRegisterMode ? "register" : "login";
  socket.emit("authRequest", { action, username, password });
}

function showError(msg) {
  loginError.textContent = msg;
  loginError.style.display = "block";
}

mainActionBtn.addEventListener("click", handleAuth);
passwordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleAuth();
});
usernameInput.addEventListener("keypress", (e) => {
  // Giriş modunda şifre girmeden enter'a basarsa şifreye odaklansın
  if (e.key === "Enter") passwordInput.focus();
});

/* ---------- 2. SUNUCUDAN GELEN AUTH CEVAPLARI ---------- */

socket.on("authResponse", (data) => {
  if (data.success) {
    // Başarılı Giriş/Kayıt
    myUsername = data.username;
    loginModal.classList.add("hidden");
    chatContainer.classList.remove("blur");
    msgInput.focus();
  } else {
    // Hata (Yanlış şifre vb.)
    showError(data.message);
  }
});

/* ---------- 3. ODA DEĞİŞTİRME ---------- */
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

/* ---------- 4. MESAJ GÖNDERME ---------- */
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
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* ---------- 5. SOHBET OLAYLARI ---------- */

socket.on("newMessage", (msg) => {
  addMessage(msg.username, msg.text, msg.time);
});

socket.on("loadHistory", (messages) => {
  messagesUl.innerHTML = "";
  messages.forEach((msg) => {
    addMessage(msg.username, msg.text, msg.time);
  });
  scrollToBottom();
});

socket.on("userStatus", ({ username, online }) => {
  userStatusMap[username] = online ? "online" : "offline";
  updateAllUserStatuses();
});

socket.on("activeUsersList", (usersArray) => {
  usersArray.forEach(u => {
    userStatusMap[u] = "online";
  });
  updateAllUserStatuses();
});

/* ---------- YARDIMCI FONKSİYONLAR ---------- */

function addMessage(username, text, time) {
  const li = document.createElement("li");
  li.classList.add("message");
  if (username === myUsername) li.classList.add("mine");
  li.dataset.username = username;

  const header = document.createElement("div");
  header.classList.add("message-header");

  const dot = document.createElement("span");
  dot.classList.add("status-dot");
  if (userStatusMap[username] !== "online") dot.classList.add("offline");

  const sender = document.createElement("span");
  sender.classList.add("sender");
  sender.textContent = username;

  const date = document.createElement("span");
  date.classList.add("date");
  date.textContent = time;

  header.appendChild(dot);
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

function updateAllUserStatuses() {
  const allMessages = document.querySelectorAll("li.message");
  allMessages.forEach(li => {
    const uName = li.dataset.username;
    const dot = li.querySelector(".status-dot");
    if (userStatusMap[uName] === "online") {
      dot.classList.remove("offline");
    } else {
      dot.classList.add("offline");
    }
  });
}

function scrollToBottom() {
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

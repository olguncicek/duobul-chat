const socket = io();

const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const chatContainer = document.getElementById("chatContainer");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");

let myUsername = "";
const userStatusMap = {}; // username -> "online" / "offline"

/* ---------- GİRİŞ / KULLANICI ADI ---------- */
/* ---------- MEVCUT KODLARININ ÜSTÜNE EKLE/GÜNCELLE ---------- */

// Global değişken
let currentRoom = "genel";

// Lobi butonlarını seç
const lobbyBtns = document.querySelectorAll(".lobby-btn");

// Her butona tıklama olayı ekle
lobbyBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const roomName = btn.dataset.room;
    
    // Zaten bu odadaysak işlem yapma
    if (roomName === currentRoom) return;

    // 1. Aktif sınıfını güncelle (görsel değişim)
    document.querySelector(".lobby-btn.active").classList.remove("active");
    btn.classList.add("active");

    // 2. Mesaj ekranını temizle (yeni odaya temiz sayfa)
    messagesUl.innerHTML = "";
    
    // 3. Odayı değiştir
    currentRoom = roomName;
    socket.emit("joinRoom", currentRoom);
    
    // İstersen buraya bir "Hoşgeldin" mesajı ekleyebilirsin (istemci tarafında)
    addSystemMessage(`${btn.innerText} odasına geçiş yapıldı.`);
  });
});

// Yardımcı Fonksiyon: Sistem mesajı (sarı renkli vs. yapabilirsin istersen)
function addSystemMessage(text) {
    const li = document.createElement("li");
    li.classList.add("message");
    li.style.background = "transparent";
    li.style.color = "#8ad0ff";
    li.style.fontStyle = "italic";
    li.style.textAlign = "center";
    li.textContent = text;
    messagesUl.appendChild(li);
}

// ... sendMessage ve diğer kodların aynı kalabilir ...
function doLogin() {
  const name = usernameInput.value.trim();
  if (!name) return;
  myUsername = name;
  socket.emit("setUsername", myUsername);

  loginModal.classList.add("hidden");
  chatContainer.classList.remove("blur");
  msgInput.focus();
}

loginBtn.addEventListener("click", doLogin);
usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") doLogin();
});

/* ---------- MESAJ GÖNDERME ---------- */

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !myUsername) return;

  // SAATİ HERKİSİN BİLGİSAYARINDA YEREL OLARAK HESAPLA
  const time = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  socket.emit("sendMessage", { text, time });
  msgInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* ---------- MESAJ ALMA ---------- */

socket.on("newMessage", (data) => {
  const { username, text, time } = data;
  addMessage(username, text, time);
});

function addMessage(username, text, time) {
  const li = document.createElement("li");
  li.classList.add("message");
  if (username === myUsername) {
    li.classList.add("mine");
  }
  li.dataset.username = username;

  const header = document.createElement("div");
  header.classList.add("message-header");

  const dot = document.createElement("span");
  dot.classList.add("status-dot");
  // Kullanıcının son bilinen durumuna göre renk
  if (userStatusMap[username] === "offline") {
    dot.classList.add("offline");
  }

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
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

/* ---------- ONLINE / OFFLINE NOKTA RENKLERİ ---------- */

socket.on("userStatus", ({ username, online }) => {
  userStatusMap[username] = online ? "online" : "offline";

  const dots = document.querySelectorAll(
    `li.message[data-username="${username}"] .status-dot`
  );

  dots.forEach((dot) => {
    if (online) {
      dot.classList.remove("offline");
    } else {
      dot.classList.add("offline");
    }
  });
});

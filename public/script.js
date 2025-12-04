const socket = io();

// HTML Elementlerini Seçelim
const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const chatContainer = document.getElementById("chatContainer");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn"); // Lobi butonları

let myUsername = "";
let currentRoom = "genel"; // Varsayılan oda
const userStatusMap = {}; // username -> "online" / "offline"

/* ---------- 1. GİRİŞ İŞLEMLERİ ---------- */
function doLogin() {
  const name = usernameInput.value.trim();
  if (!name) return;
  myUsername = name;
  
  // Sunucuya kullanıcı adını bildir
  socket.emit("setUsername", myUsername);

  // Modalı gizle, sohbeti aç
  loginModal.classList.add("hidden");
  chatContainer.classList.remove("blur");
  msgInput.focus();
}

loginBtn.addEventListener("click", doLogin);
usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") doLogin();
});

/* ---------- 2. LOBİ / ODA DEĞİŞTİRME ---------- */
lobbyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const roomName = btn.dataset.room;

    // Eğer zaten o odadaysak hiçbir şey yapma
    if (roomName === currentRoom) return;

    // Görsel olarak aktif butonu değiştir
    document.querySelector(".lobby-btn.active").classList.remove("active");
    btn.classList.add("active");

    // Ekranı temizle (Yeni oda temiz sayfa)
    messagesUl.innerHTML = "";

    // Odayı değiştir
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

  // Mesajı sunucuya gönder
  socket.emit("sendMessage", { text, time });
  msgInput.value = "";
  msgInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* ---------- 4. MESAJ ALMA VE GÖSTERME ---------- */

// A) Yeni bir mesaj geldiğinde
socket.on("newMessage", (msg) => {
  addMessage(msg.username, msg.text, msg.time);
});

// B) Geçmiş mesajları yükle dendiğinde (Oda değişince)
socket.on("loadHistory", (messages) => {
  messagesUl.innerHTML = ""; // Garanti olsun diye temizle
  messages.forEach((msg) => {
    addMessage(msg.username, msg.text, msg.time);
  });
  // En alta kaydır
  messagesUl.scrollTop = messagesUl.scrollHeight;
});

// Ekrana Mesaj Ekleyen Yardımcı Fonksiyon
function addMessage(username, text, time) {
  const li = document.createElement("li");
  li.classList.add("message");
  
  // Eğer mesaj benimse 'mine' sınıfı ekle (sağa yaslar)
  if (username === myUsername) {
    li.classList.add("mine");
  }
  li.dataset.username = username;

  const header = document.createElement("div");
  header.classList.add("message-header");

  // Online/Offline Durum Noktası
  const dot = document.createElement("span");
  dot.classList.add("status-dot");
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
  
  // Otomatik aşağı kaydır
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

/* ---------- 5. ONLINE / OFFLINE DURUMU ---------- */
socket.on("userStatus", ({ username, online }) => {
  userStatusMap[username] = online ? "online" : "offline";

  // Ekrandaki eski mesajlardaki noktaların rengini güncelle
  const dots = document.querySelectorAll(
    `li.message[data-username="${username}"] .status-dot`
  );
  dots.forEach((dot) => {
    if (online) dot.classList.remove("offline");
    else dot.classList.add("offline");
  });
});

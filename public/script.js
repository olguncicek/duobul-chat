const socket = io();

// HTML Elementleri
const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const chatContainer = document.getElementById("chatContainer");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");

let myUsername = "";
let currentRoom = "genel"; 
const userStatusMap = {}; // Kim online, kim offline haritası

/* ---------- 1. GİRİŞ İŞLEMLERİ ---------- */
const passwordInput = document.getElementById("passwordInput"); // Yeni element

function doLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    alert("Lütfen kullanıcı adı ve şifreyi giriniz!");
    return;
  }
  
  // Sunucuya giriş isteği gönder (İsim + Şifre)
  socket.emit("loginAttempt", { username, password });
}

// Sunucudan gelen "Giriş Başarılı" cevabı
socket.on("loginSuccess", (approvedUsername) => {
  myUsername = approvedUsername;
  
  loginModal.classList.add("hidden");
  chatContainer.classList.remove("blur");
  msgInput.focus();
});

// Sunucudan gelen "Hatalı Giriş" cevabı
socket.on("loginError", (message) => {
  alert(message); // Örn: "Şifre yanlış!"
  passwordInput.value = ""; // Şifreyi temizle
});

loginBtn.addEventListener("click", doLogin);
// Şifre kutusunda Enter'a basınca da giriş yap
passwordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") doLogin();
});
usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") doLogin();
});
/* ---------- 2. ODA DEĞİŞTİRME ---------- */
lobbyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const roomName = btn.dataset.room;
    if (roomName === currentRoom) return;

    // Aktif butonu değiştir
    document.querySelector(".lobby-btn.active").classList.remove("active");
    btn.classList.add("active");

    // Ekranı temizle
    messagesUl.innerHTML = "";

    // Odaya geç
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
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* ---------- 4. SUNUCUDAN GELENLER ---------- */

// Yeni Mesaj Geldiğinde
socket.on("newMessage", (msg) => {
  addMessage(msg.username, msg.text, msg.time);
});

// Eski Mesajlar Yüklendiğinde
socket.on("loadHistory", (messages) => {
  messagesUl.innerHTML = "";
  messages.forEach((msg) => {
    addMessage(msg.username, msg.text, msg.time);
  });
  scrollToBottom();
});

// Birisi Durum Değiştirdiğinde (Girdi/Çıktı)
socket.on("userStatus", ({ username, online }) => {
  userStatusMap[username] = online ? "online" : "offline";
  updateAllUserStatuses(); // Ekrandaki renkleri güncelle
});

// [YENİ] Siteye İlk Girince Aktif Kullanıcı Listesini Al
socket.on("activeUsersList", (usersArray) => {
  // Gelen listedeki herkesi "online" olarak işaretle
  usersArray.forEach(u => {
    userStatusMap[u] = "online";
  });
  // Ekrandaki tüm ışıkları buna göre düzelt
  updateAllUserStatuses();
});

/* ---------- YARDIMCI FONKSİYONLAR ---------- */

function addMessage(username, text, time) {
  const li = document.createElement("li");
  li.classList.add("message");
  
  if (username === myUsername) {
    li.classList.add("mine");
  }
  // Bu satır önemli: Mesajın kime ait olduğunu etikete yazıyoruz
  li.dataset.username = username;

  const header = document.createElement("div");
  header.classList.add("message-header");

  // Durum Noktası (Dot)
  const dot = document.createElement("span");
  dot.classList.add("status-dot");
  
  // Eğer listemizde "online" değilse, varsayılan olarak kırmızı (offline) yap
  if (userStatusMap[username] !== "online") {
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
  scrollToBottom();
}

// Ekrandaki tüm mesajların ışıklarını günceller
function updateAllUserStatuses() {
  const allMessages = document.querySelectorAll("li.message");
  allMessages.forEach(li => {
    const uName = li.dataset.username;
    const dot = li.querySelector(".status-dot");
    
    if (userStatusMap[uName] === "online") {
      dot.classList.remove("offline"); // Yeşil
    } else {
      dot.classList.add("offline"); // Kırmızı
    }
  });
}

function scrollToBottom() {
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

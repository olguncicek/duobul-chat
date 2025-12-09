const socket = io();

// HTML Elementleri
const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const chatContainer = document.getElementById("chatContainer");
const registerModal = document.getElementById("registerModal");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const doRegisterBtn = document.getElementById("doRegisterBtn");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");
const regName = document.getElementById("regName");
const regSurname = document.getElementById("regSurname");
const regYear = document.getElementById("regYear");
const regEmail = document.getElementById("regEmail");
const regPass = document.getElementById("regPass");

let myUsername = "";
let currentRoom = "genel"; 
const userStatusMap = {}; // Kim online, kim offline haritası

/* ---------- 1. GİRİŞ İŞLEMLERİ ---------- */
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
/* ---------- KAYIT MODALI İŞLEMLERİ ---------- */

// 1. Giriş ekranındaki "Kayıt Ol" butonuna basınca
if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");   // Giriş ekranını gizle
    registerModal.classList.remove("hidden"); // Kayıt ekranını aç
  });
}

// 2. Kayıt ekranındaki "Giriş Ekranına Dön" butonuna basınca
if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", () => {
    registerModal.classList.add("hidden"); // Kayıt ekranını gizle
    loginModal.classList.remove("hidden");   // Giriş ekranını aç
  });
}

// 3. "Kaydı Tamamla" butonuna basınca
if (doRegisterBtn) {
  doRegisterBtn.addEventListener("click", () => {
    // Basit bir doğrulama
    if (!regName.value || !regSurname.value || !regYear.value || !regEmail.value || !regPass.value) {
      alert("Lütfen tüm alanları doldur!");
      return;
    }

    // Şimdilik veritabanı olmadığı için başarılı gibi davranıyoruz
    console.log("Kayıt Bilgileri:", {
      Ad: regName.value,
      Soyad: regSurname.value,
      Yil: regYear.value,
      Email: regEmail.value,
      Sifre: regPass.value
    });

    alert("Kayıt Başarılı! Şimdi giriş yapabilirsin.");
    
    // Formu temizle ve giriş ekranına at
    regName.value = ""; regSurname.value = ""; regYear.value = ""; 
    regEmail.value = ""; regPass.value = "";
    
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
  });
}

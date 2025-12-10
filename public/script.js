const socket = io();

// HTML Elementleri - Genel
const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const chatContainer = document.getElementById("chatContainer");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");

// HTML Elementleri - Kayıt Ekranı
const registerBtn = document.getElementById("registerBtn");
const registerModal = document.getElementById("registerModal");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const doRegisterBtn = document.getElementById("doRegisterBtn");

// Kayıt Formu Inputları
const regName = document.getElementById("regName");
const regSurname = document.getElementById("regSurname");
const regYear = document.getElementById("regYear");
const regEmail = document.getElementById("regEmail");
const regPass = document.getElementById("regPass");


let myUsername = "";
let currentRoom = "genel"; 
const userStatusMap = {}; // Kim online, kim offline haritası

/* =========================================
   1. KAYIT OLMA İŞLEMLERİ (YENİ EKLENDİ)
   ========================================= */

// Giriş Ekranından -> Kayıt Ekranına Geçiş
if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    registerModal.classList.remove("hidden");
  });
}

// Kayıt Ekranından -> Geri Dönüş
if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", () => {
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
  });
}

// Kayıt Butonu ve Doğrulama
if (doRegisterBtn) {
  doRegisterBtn.addEventListener("click", () => {
    // Değerleri al ve boşlukları temizle
    const name = regName.value.trim();
    const surname = regSurname.value.trim();
    const year = regYear.value.trim();
    const email = regEmail.value.trim();
    const pass = regPass.value.trim();

    // A) BOŞ ALAN KONTROLÜ
    if (!name || !surname || !year || !email || !pass) {
      alert("Hata: Lütfen tüm alanları doldurun!");
      return;
    }

    // B) DOĞUM YILI KONTROLÜ
    const currentYear = new Date().getFullYear();
    const birthYear = parseInt(year);

    if (isNaN(birthYear) || birthYear < 1950 || birthYear > currentYear - 5) {
      alert(`Hata: Lütfen geçerli bir doğum yılı girin! (1950 - ${currentYear - 5} arası)`);
      return;
    }

    // C) E-POSTA FORMAT KONTROLÜ (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Hata: Lütfen geçerli bir e-posta adresi girin! (Örn: ornek@gmail.com)");
      return;
    }

    // D) HER ŞEY BAŞARILI
    console.log("KAYIT BAŞARILI:", { name, surname, year, email });
    alert("Tebrikler! Başarıyla kayıt olundu. Giriş ekranına yönlendiriliyorsunuz.");

    // Formu temizle
    regName.value = ""; regSurname.value = ""; regYear.value = ""; 
    regEmail.value = ""; regPass.value = "";

    // Giriş ekranını aç
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
  });
}


/* =========================================
   2. GİRİŞ (LOGIN) İŞLEMLERİ
   ========================================= */
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


/* =========================================
   3. ODA DEĞİŞTİRME (LOBBY)
   ========================================= */
lobbyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const roomName = btn.dataset.room;
    if (roomName === currentRoom) return;

    // Aktif butonu değiştir
    document.querySelector(".lobby-btn.active").classList.remove("active");
    btn.classList.add("active");

    // Ekranı temizle
    messagesUl.innerHTML = "";
    
    // Sunucuya bildir
    socket.emit("joinRoom", roomName);
    currentRoom = roomName;
  });
});


/* =========================================
   4. MESAJ GÖNDERME
   ========================================= */
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Sunucuya gönder
  socket.emit("sendMessage", { text, time });
  msgInput.value = "";
  msgInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});


/* =========================================
   5. SOCKET OLAYLARI (Mesaj Alma, Durum)
   ========================================= */

// Mesaj Geldiğinde
socket.on("newMessage", (msg) => {
  addMessageToUI(msg.username, msg.text, msg.time);
});

// Geçmiş Mesajlar Yüklendiğinde
socket.on("loadHistory", (messages) => {
  messagesUl.innerHTML = "";
  messages.forEach((m) => addMessageToUI(m.username, m.text, m.time));
});

// Birinin Durumu Değiştiğinde (Online/Offline)
socket.on("userStatus", (data) => {
  const { username, online } = data;
  userStatusMap[username] = online ? "online" : "offline";
  updateAllUserStatuses();
});

// Online Kullanıcılar Listesi Geldiğinde (İlk Giriş)
socket.on("activeUsersList", (list) => {
  list.forEach(u => {
    userStatusMap[u] = "online";
  });
  updateAllUserStatuses();
});

// UI: Mesaj Ekleme Fonksiyonu
function addMessageToUI(username, text, time) {
  const li = document.createElement("li");
  li.classList.add("message");
  
  // Mesajın kime ait olduğunu etikete yazıyoruz
  li.dataset.username = username;

  const header = document.createElement("div");
  header.classList.add("message-header");

  // Durum Noktası (Dot)
  const dot = document.createElement("span");
  dot.classList.add("status-dot");
  
  // Eğer online değilse kırmızı (offline) yap
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

// UI: Işıkları Güncelle
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

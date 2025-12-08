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

// DM (Özel Mesaj) Elementleri
const dmContainer = document.getElementById("dmContainer");
const dmTabBtn = document.getElementById("dmTabBtn");
const dmTargetName = document.getElementById("dmTargetName");

const notificationSound = document.getElementById("notificationSound");

let myUsername = "";
let currentRoom = "genel"; 
let isDmMode = false; // Şu an özel mesajda mıyız?
let activeDmUser = null; // Kiminle konuşuyoruz?

/* ---------- 1. GİRİŞ ---------- */
function doLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) return alert("Bilgileri giriniz!");
  
  socket.emit("loginAttempt", { username, password });
}

socket.on("loginSuccess", (user) => {
  myUsername = user;
  loginModal.classList.add("hidden");
  chatContainer.classList.remove("blur");
  msgInput.focus();
});
socket.on("loginError", (msg) => { alert(msg); passwordInput.value = ""; });

loginBtn.addEventListener("click", doLogin);
passwordInput.addEventListener("keypress", (e) => { if (e.key === "Enter") doLogin(); });

/* ---------- 2. ODA DEĞİŞTİRME (LOBİLER) ---------- */
lobbyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Eğer DM modundaysak çıkalım
    exitDmMode();

    const roomName = btn.dataset.room;
    if (roomName === currentRoom) return;

    document.querySelector(".lobby-btn.active")?.classList.remove("active");
    btn.classList.add("active");

    messagesUl.innerHTML = "";
    currentRoom = roomName;
    socket.emit("joinRoom", currentRoom);
  });
});

/* ---------- 3. ÖZEL MESAJ (DM) FONKSİYONLARI ---------- */

// İSME TIKLAYINCA ÇALIŞIR
function clickUser(targetUser) {
    if (targetUser === myUsername) return; // Kendine tıklama

    // 1. DM Butonunu görünür yap ve ayarla
    activeDmUser = targetUser;
    dmTargetName.textContent = "@" + targetUser;
    dmContainer.classList.remove("hidden");

    // 2. Otomatik olarak o sekmeye geç
    switchToDmTab();
}

// DM SEKMESİNE GEÇİŞ
function switchToDmTab() {
    isDmMode = true;
    
    // Diğer lobi butonlarının aktifliğini kaldır
    document.querySelector(".lobby-btn.active")?.classList.remove("active");
    // DM butonunu aktif yap
    dmTabBtn.classList.add("active");

    // Ekranı temizle ve geçmişi yükle
    messagesUl.innerHTML = "";
    socket.emit("getPrivateHistory", activeDmUser);
}

// DM BUTONUNA TIKLAYINCA (Zaten açıksa oraya dön)
dmTabBtn.addEventListener("click", () => {
    if (!activeDmUser) return;
    switchToDmTab();
});

// DM MODUNDAN ÇIKMA (Normal odaya dönünce)
function exitDmMode() {
    isDmMode = false;
    dmTabBtn.classList.remove("active");
    // Butonu gizlemek istersen: dmContainer.classList.add("hidden"); 
    // Ama genelde açık kalması daha iyidir, kullanıcı geri dönebilsin diye.
}

/* ---------- 4. MESAJ GÖNDERME ---------- */
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !myUsername) return;

  const time = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  if (isDmMode && activeDmUser) {
      // ÖZEL MESAJ GÖNDER
      socket.emit("sendPrivateMessage", { to: activeDmUser, text, time });
  } else {
      // GENEL MESAJ GÖNDER
      socket.emit("sendMessage", { text, time });
  }
  
  msgInput.value = "";
  msgInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

/* ---------- 5. SUNUCUDAN GELENLER ---------- */

// Genel Mesaj Geldi
socket.on("newMessage", (msg) => {
    // Eğer şu an DM modundaysak, genel mesajları ekrana basma (arkada kalsın)
    // Veya istersen bildirim verebilirsin.
    if (!isDmMode && currentRoom === "genel") { 
        addMessage(msg.username, msg.text, msg.time, false);
        if (msg.username !== myUsername) notificationSound.play().catch(e=>{});
    } else if (!isDmMode) {
        // Bulunduğumuz oyun odasındaysak bas
        addMessage(msg.username, msg.text, msg.time, false);
    }
});

// Genel Geçmiş Yüklendi
socket.on("loadHistory", (messages) => {
    messagesUl.innerHTML = "";
    messages.forEach((msg) => addMessage(msg.username, msg.text, msg.time, false));
    scrollToBottom();
});

// ÖZEL MESAJ GELDİ
socket.on("receivePrivateMessage", (msg) => {
    // 1. Eğer o kişiyle konuşuyorsam ekrana bas
    if (isDmMode && (activeDmUser === msg.from || msg.isMine)) {
        addMessage(msg.from, msg.text, msg.time, true);
        scrollToBottom();
    } 
    // 2. Eğer başkasıyla konuşuyorsam veya geneldedeysem BİLDİRİM/BUTON GÖSTER
    else if (!msg.isMine) {
        // Sağ üstte o kişinin butonu çıksın
        activeDmUser = msg.from;
        dmTargetName.textContent = "@" + msg.from;
        dmContainer.classList.remove("hidden");
        
        // Ses çal
        notificationSound.play().catch(e=>{});
        
        // Belki butonun rengini değiştirebilirsin (Bildirim efekti)
        dmTabBtn.style.backgroundColor = "#ff4655"; // Kırmızı yap
        setTimeout(() => { dmTabBtn.style.backgroundColor = ""; }, 1000); // Geri düzelt
    }
});

// Özel Mesaj Geçmişi Yüklendi
socket.on("loadPrivateHistory", (messages) => {
    messagesUl.innerHTML = "";
    messages.forEach((msg) => addMessage(msg.sender, msg.text, msg.time, true));
    scrollToBottom();
});

/* ---------- YARDIMCI FONKSİYONLAR ---------- */
function addMessage(username, text, time, isPrivate) {
  const li = document.createElement("li");
  li.classList.add("message");
  if (username === myUsername) li.classList.add("mine");
  if (isPrivate) li.classList.add("dm-msg"); // Özel stil

  const header = document.createElement("div");
  header.classList.add("message-header");

  const sender = document.createElement("span");
  sender.classList.add("sender");
  sender.textContent = username;
  
  // İSME TIKLAMA OLAYI (Sadece genel sohbette ve başkasıysa)
  if (!isPrivate && username !== myUsername) {
      sender.onclick = () => clickUser(username);
      sender.title = "Özel Mesaj At";
  }

  const date = document.createElement("span");
  date.classList.add("date");
  date.textContent = time;

  header.appendChild(sender);
  header.appendChild(date);

  const textP = document.createElement("p");
  textP.textContent = text;

  li.appendChild(header);
  li.appendChild(textP);

  messagesUl.appendChild(li);
  scrollToBottom();
}

function scrollToBottom() {
  messagesUl.scrollTop = messagesUl.scrollHeight;
}
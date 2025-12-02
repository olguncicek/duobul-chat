const socket = io();

const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");

const usernameModal = document.getElementById("usernameModal");
const usernameInput = document.getElementById("usernameInput");
const usernameSaveBtn = document.getElementById("usernameSaveBtn");

let username = null;
const onlineUsers = {}; // { "Ali": true/false }

// ====== KULLANICI ADI POPUP ======

function openUsernameModal() {
  usernameModal.style.display = "flex";
  usernameInput.focus();
}

function closeUsernameModal() {
  usernameModal.style.display = "none";
}

function saveUsername() {
  const value = usernameInput.value.trim();
  if (!value) return;
  username = value;
  closeUsernameModal();
  socket.emit("join", username);
}

usernameSaveBtn.addEventListener("click", saveUsername);
usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveUsername();
  }
});

// Sayfa açılır açılmaz popup aç
openUsernameModal();

// ====== SAAT FONKSİYONU (LOCAL ZAMAN) ======

function getTimeString() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  // 11.08 gibi
  return `${hours}.${minutes}`;
}

// HTML kaçışı (XSS'ye karşı basit önlem)
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ====== MESAJ GÖNDERME ======

function sendMessage() {
  if (!username) {
    // isim seçilmeden mesaj gönderilmesin
    openUsernameModal();
    return;
  }

  const msg = input.value.trim();
  if (!msg) return;

  const time = getTimeString();

  const data = {
    text: msg,
    username,
    time, // local saat
  };

  socket.emit("sendMessage", data);
  input.value = "";
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// ====== ONLINE / OFFLINE DURUM GÜNCELLEME ======

function updateUserStatusDots(changedUsername, isOnline) {
  const allMessages = document.querySelectorAll("li.message");

  allMessages.forEach((li) => {
    if (li.dataset.username === changedUsername) {
      const dot = li.querySelector(".status-dot");
      if (!dot) return;
      dot.classList.remove("online", "offline");
      dot.classList.add(isOnline ? "online" : "offline");
    }
  });
}

socket.on("userStatus", (data) => {
  onlineUsers[data.username] = data.online;
  updateUserStatusDots(data.username, data.online);
});

// ====== MESAJ ALMA VE EKRANA BASMA ======

socket.on("newMessage", (msg) => {
  addMessage(msg);
});

function addMessage(msg) {
  const li = document.createElement("li");
  li.classList.add("message");
  li.dataset.username = msg.username;

  // Benim mesajım mı?
  if (msg.username === username) {
    li.classList.add("mine");
  }

  const isOnline =
    typeof onlineUsers[msg.username] === "boolean"
      ? onlineUsers[msg.username]
      : true; // varsayılan çevrimiçi

  li.innerHTML = `
    <div class="message-header">
      <span class="username">
        <span class="status-dot ${isOnline ? "online" : "offline"}"></span>
        ${escapeHtml(msg.username)}
      </span>
      <span class="date">${msg.time || ""}</span>
    </div>
    <p class="text">${escapeHtml(msg.text)}</p>
  `;

  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

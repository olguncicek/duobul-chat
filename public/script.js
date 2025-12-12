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
const userStatusMap = {}; 

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

    document.querySelector(".lobby-btn.active").classList.remove("active");
    btn.classList.add("active");

    messagesUl.innerHTML = "";
    
    socket.emit("joinRoom", roomName);
    currentRoom = roomName;
  });
});

/* ---------- 3. MESAJ GÖNDERME ---------- */
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  socket.emit("sendMessage", { text, time });
  msgInput.value = "";
  msgInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* ---------- 4. SOCKET OLAYLARI ---------- */
socket.on("newMessage", (msg) => {
  addMessageToUI(msg.username, msg.text, msg.time);
});

socket.on("loadHistory", (messages) => {
  messagesUl.innerHTML = "";
  messages.forEach((m) => {
    addMessageToUI(m.username, m.text, m.time);
  });
});

socket.on("userStatus", (data) => {
  const { username, online } = data;
  userStatusMap[username] = online ? "online" : "offline";
  updateAllUserStatuses();
});

socket.on("activeUsersList", (list) => {
  list.forEach(u => {
    userStatusMap[u] = "online";
  });
  updateAllUserStatuses();
});

function scrollToBottom() {
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

function addMessageToUI(username, text, time) {
  const li = document.createElement("li");
  li.classList.add("message");
  
  // WHATSAPP STİLİ HİZALAMA
  if (username === myUsername) {
    li.classList.add("mine");    // Sağ taraf
  } else {
    li.classList.add("others");  // Sol taraf
  }

  li.dataset.username = username;

  const header = document.createElement("div");
  header.classList.add("message-header");

  const dot = document.createElement("span");
  dot.classList.add("status-dot");
  
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

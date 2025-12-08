const socket = io();

// Elementler
const loginModal = document.getElementById("loginModal");
const appLayout = document.getElementById("appLayout");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");

// Genel Sohbet
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const publicMessagesUl = document.getElementById("publicMessages");
const roomBtns = document.querySelectorAll(".room-btn");

// DM (Özel Mesaj)
const privateSection = document.getElementById("privateSidebar");
const dmTitle = document.getElementById("dmTitle");
const dmPlaceholder = document.getElementById("dmPlaceholder");
const dmContent = document.getElementById("dmContent");
const privateMessagesUl = document.getElementById("privateMessagesList");
const dmInput = document.getElementById("dmInput");
const dmSendBtn = document.getElementById("dmSendBtn");
const closeDmBtn = document.getElementById("closeDmBtn");

// Ses
const notificationSound = document.getElementById("notificationSound");

let myUsername = "";
let currentRoom = "genel";
let currentDmUser = null;

// --- GİRİŞ ---
function doLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!username || !password) return alert("Bilgileri giriniz!");
  socket.emit("loginAttempt", { username, password });
}
loginBtn.addEventListener("click", doLogin);

socket.on("loginSuccess", (user) => {
  myUsername = user;
  loginModal.classList.add("hidden");
  appLayout.classList.remove("blur");
});
socket.on("loginError", (msg) => alert(msg));

// --- ODA DEĞİŞİMİ ---
roomBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const room = btn.dataset.room;
    if(room === currentRoom) return;
    document.querySelector(".room-btn.active").classList.remove("active");
    btn.classList.add("active");
    publicMessagesUl.innerHTML = "";
    currentRoom = room;
    socket.emit("joinRoom", room);
  });
});

// --- GENEL MESAJ ---
sendBtn.addEventListener("click", () => {
  const text = msgInput.value.trim();
  if(!text) return;
  const time = new Date().toLocaleTimeString("tr-TR", {hour:"2-digit", minute:"2-digit"});
  socket.emit("sendMessage", { text, time });
  msgInput.value = "";
});

socket.on("newMessage", (msg) => {
  addMessage(msg.username, msg.text, msg.time, publicMessagesUl, false);
  if(msg.username !== myUsername) playSound();
});

socket.on("loadHistory", (msgs) => {
  publicMessagesUl.innerHTML = "";
  msgs.forEach(m => addMessage(m.username, m.text, m.time, publicMessagesUl, false));
});

// --- DM SİSTEMİ ---
function openDm(targetUser) {
  if(targetUser === myUsername) return; // Kendine yazma
  currentDmUser = targetUser;
  dmTitle.innerText = `DM: ${targetUser}`;
  dmPlaceholder.classList.add("hidden");
  dmContent.classList.remove("hidden");
  closeDmBtn.style.display = "block";
  
  privateMessagesUl.innerHTML = "";
  socket.emit("getPrivateHistory", targetUser);
}

// DM Kapatma Butonu
closeDmBtn.addEventListener("click", () => {
  currentDmUser = null;
  dmTitle.innerText = "Özel Mesaj";
  dmPlaceholder.classList.remove("hidden");
  dmContent.classList.add("hidden");
  closeDmBtn.style.display = "none";
});

dmSendBtn.addEventListener("click", () => {
  const text = dmInput.value.trim();
  if(!text || !currentDmUser) return;
  const time = new Date().toLocaleTimeString("tr-TR", {hour:"2-digit", minute:"2-digit"});
  
  // Sunucuya at
  socket.emit("privateMessage", { to: currentDmUser, text, time });
  // Kendime ekle
  addMessage(myUsername, text, time, privateMessagesUl, true);
  dmInput.value = "";
});

socket.on("receivePrivateMessage", (msg) => {
  if(currentDmUser === msg.from) {
    addMessage(msg.from, msg.text, msg.time, privateMessagesUl, true);
  } else {
    // Başkasından geldiyse sadece ses çal (İleride bildirim eklenebilir)
  }
  playSound();
});

socket.on("loadPrivateHistory", (msgs) => {
  privateMessagesUl.innerHTML = "";
  msgs.forEach(m => addMessage(m.sender, m.text, m.time, privateMessagesUl, true));
});

// --- YARDIMCI FONKSİYONLAR ---
function addMessage(user, text, time, listElement, isPrivate) {
  const li = document.createElement("li");
  if(user === myUsername) li.classList.add("mine");
  
  const senderSpan = document.createElement("span");
  senderSpan.className = "sender";
  senderSpan.innerText = user;
  
  // Sadece genel sohbette başkasına tıklanabilir
  if(!isPrivate && user !== myUsername) {
    senderSpan.onclick = () => openDm(user);
    senderSpan.title = "Özel mesaj at";
  }

  const dateSpan = document.createElement("span");
  dateSpan.className = "date";
  dateSpan.innerText = time;

  const p = document.createElement("p");
  p.innerText = text;

  const header = document.createElement("div");
  header.appendChild(senderSpan);
  header.appendChild(dateSpan);
  
  li.appendChild(header);
  li.appendChild(p);
  
  listElement.appendChild(li);
  listElement.scrollTop = listElement.scrollHeight;
}

function playSound() {
  notificationSound.play().catch(e => console.log("Ses çalınamadı (etkileşim gerek):", e));
}

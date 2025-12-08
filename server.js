const express = require("express");
const http = require("http");
const fs = require("fs");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => res.sendFile(__dirname + "/public/duo.html"));

// DOSYALAR
const USERS_FILE = "users.json";
const MESSAGES_FILE = "messages.json";
const PRIVATE_FILE = "privates.json";

let userDatabase = {};
let roomMessages = {};
let privateMessages = {}; // Format: { "ahmet-mehmet": [] }
const activeUsers = new Map();

// --- VERİ YÜKLEME ---
function loadData() {
  if (fs.existsSync(USERS_FILE)) userDatabase = JSON.parse(fs.readFileSync(USERS_FILE));
  else fs.writeFileSync(USERS_FILE, JSON.stringify({}));

  if (fs.existsSync(MESSAGES_FILE)) roomMessages = JSON.parse(fs.readFileSync(MESSAGES_FILE));
  else fs.writeFileSync(MESSAGES_FILE, JSON.stringify({}));

  if (fs.existsSync(PRIVATE_FILE)) privateMessages = JSON.parse(fs.readFileSync(PRIVATE_FILE));
  else fs.writeFileSync(PRIVATE_FILE, JSON.stringify({}));
}
loadData();

// --- KAYDETME ---
function saveUsers() { fs.writeFile(USERS_FILE, JSON.stringify(userDatabase, null, 2), () => {}); }
function saveMessages() { fs.writeFile(MESSAGES_FILE, JSON.stringify(roomMessages, null, 2), () => {}); }
function savePrivates() { fs.writeFile(PRIVATE_FILE, JSON.stringify(privateMessages, null, 2), () => {}); }

io.on("connection", (socket) => {
  let username = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // 1. GİRİŞ
  socket.on("loginAttempt", ({ username: tryUser, password }) => {
    if (!tryUser || !password) return;
    
    let success = false;
    if (userDatabase[tryUser]) {
      if (userDatabase[tryUser] === password) success = true;
    } else {
      userDatabase[tryUser] = password;
      saveUsers();
      success = true;
    }

    if (success) {
      username = tryUser;
      socket.emit("loginSuccess", username);
      
      // ÖNEMLİ: Kişiye özel mesaj atabilmek için kendi isminde bir odaya sokuyoruz
      socket.join(username); 

      activeUsers.set(username, true);
      io.emit("userStatus", { username, online: true });

      if (roomMessages[currentRoom]) socket.emit("loadHistory", roomMessages[currentRoom]);
    } else {
      socket.emit("loginError", "Hatalı şifre!");
    }
  });

  // 2. ODA DEĞİŞTİRME (GENEL)
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    if (roomMessages[roomName]) socket.emit("loadHistory", roomMessages[roomName]);
  });

  // 3. GENEL MESAJ
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const msg = { username, text: data.text, time: data.time };

    if (!roomMessages[currentRoom]) roomMessages[currentRoom] = [];
    roomMessages[currentRoom].push(msg);
    if (roomMessages[currentRoom].length > 50) roomMessages[currentRoom].shift();
    
    saveMessages();
    io.to(currentRoom).emit("newMessage", msg);
  });

  // 4. ÖZEL MESAJ (DM) SİSTEMİ
  
  // A) Geçmişi İste
  socket.on("getPrivateHistory", (targetUser) => {
    if (!username) return;
    // Benzersiz anahtar: İsimleri alfabetik sıraya dizip birleştiriyoruz
    const key = [username, targetUser].sort().join("-");
    const history = privateMessages[key] || [];
    socket.emit("loadPrivateHistory", history);
  });

  // B) Özel Mesaj Gönder
  socket.on("sendPrivateMessage", ({ to, text, time }) => {
    if (!username) return;
    const key = [username, to].sort().join("-");
    const msgObj = { sender: username, text, time };

    if (!privateMessages[key]) privateMessages[key] = [];
    privateMessages[key].push(msgObj);
    if (privateMessages[key].length > 50) privateMessages[key].shift(); // Son 50 mesaj
    savePrivates();

    // 1. Alıcıya Gönder
    io.to(to).emit("receivePrivateMessage", { from: username, text, time });
    
    // 2. Gönderene (Kendime) de gönder ki ekranımda çıksın
    socket.emit("receivePrivateMessage", { from: username, text, time, isMine: true });
  });

  // 5. ÇIKIŞ
  socket.on("disconnect", () => {
    if (username) {
      activeUsers.delete(username);
      io.emit("userStatus", { username, online: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu çalışıyor: http://localhost:${PORT}`));
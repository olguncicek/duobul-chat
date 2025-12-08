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
const PRIVATE_FILE = "privates.json"; // YENİ DOSYA

let userDatabase = {};
let roomMessages = {};
let privateMessages = {}; // Format: { "ahmet-mehmet": [msg1, msg2] }

// --- YÜKLEME FONKSİYONLARI ---
function loadData() {
  if (fs.existsSync(USERS_FILE)) userDatabase = JSON.parse(fs.readFileSync(USERS_FILE));
  else fs.writeFileSync(USERS_FILE, JSON.stringify({}));

  if (fs.existsSync(MESSAGES_FILE)) roomMessages = JSON.parse(fs.readFileSync(MESSAGES_FILE));
  else fs.writeFileSync(MESSAGES_FILE, JSON.stringify({}));

  if (fs.existsSync(PRIVATE_FILE)) privateMessages = JSON.parse(fs.readFileSync(PRIVATE_FILE));
  else fs.writeFileSync(PRIVATE_FILE, JSON.stringify({}));
}
loadData();

function savePrivates() {
  fs.writeFile(PRIVATE_FILE, JSON.stringify(privateMessages, null, 2), err => {});
}
// (Diğer save fonksiyonları önceki gibi kalabilir)
function saveMessages() {
    fs.writeFile(MESSAGES_FILE, JSON.stringify(roomMessages, null, 2), err => {});
}
function saveUsers() {
    fs.writeFile(USERS_FILE, JSON.stringify(userDatabase, null, 2), err => {});
}

io.on("connection", (socket) => {
  let username = null;
  let currentRoom = "genel";
  socket.join("genel");

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
      
      // ÖNEMLİ: Kullanıcı kendi adına özel bir odaya katılır (DM için)
      socket.join(username); 

      // Geçmiş yükle
      if (roomMessages[currentRoom]) socket.emit("loadHistory", roomMessages[currentRoom]);
    } else {
      socket.emit("loginError", "Hatalı şifre!");
    }
  });

  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;
    if (roomMessages[roomName]) socket.emit("loadHistory", roomMessages[roomName]);
  });

  socket.on("sendMessage", (data) => {
    if (!username) return;
    const msg = { username, text: data.text, time: data.time };
    
    if (!roomMessages[currentRoom]) roomMessages[currentRoom] = [];
    roomMessages[currentRoom].push(msg);
    if (roomMessages[currentRoom].length > 50) roomMessages[currentRoom].shift();
    
    saveMessages();
    io.to(currentRoom).emit("newMessage", msg);
  });

  // --- ÖZEL MESAJ (DM) EVENTS ---

  // 1. DM Geçmişini İstemciye Gönder
  socket.on("getPrivateHistory", (targetUser) => {
    if (!username) return;
    // Benzersiz anahtar oluştur: İsimleri alfabetik sıraya koy (Ahmet-Mehmet ile Mehmet-Ahmet aynı yer olsun)
    const key = [username, targetUser].sort().join("-");
    const history = privateMessages[key] || [];
    socket.emit("loadPrivateHistory", history);
  });

  // 2. Özel Mesaj Gönder ve Kaydet
  socket.on("privateMessage", ({ to, text, time }) => {
    if (!username) return;

    const msgObj = { sender: username, text, time };
    const key = [username, to].sort().join("-");

    if (!privateMessages[key]) privateMessages[key] = [];
    privateMessages[key].push(msgObj);
    
    // Mesaj sayısını sınırla (Örn: 50)
    if (privateMessages[key].length > 50) privateMessages[key].shift();
    savePrivates();

    // Alıcıya gönder (username odasına)
    // Gönderen zaten kendi ekranında JS ile ekledi, sadece alıcıya yolluyoruz
    io.to(to).emit("receivePrivateMessage", {
      from: username,
      text: text,
      time: time
    });
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Sunucu devrede!"));

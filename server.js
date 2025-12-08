const express = require("express");
const http = require("http");
const fs = require("fs"); // Dosya okuma/yazma modülü
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// Statik dosyaları sun
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// --- DOSYA SİSTEMİ AYARLARI ---
const USERS_FILE = "users.json";
const MESSAGES_FILE = "messages.json";

let userDatabase = {};
let roomMessages = {}; 
const activeUsers = new Map(); // Online durumu için

// 1. Verileri Yükle
function loadData() {
  // Kullanıcılar
  if (fs.existsSync(USERS_FILE)) {
    try {
      userDatabase = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    } catch (e) { userDatabase = {}; }
  } else {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
  }

  // Mesajlar
  if (fs.existsSync(MESSAGES_FILE)) {
    try {
      roomMessages = JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8"));
    } catch (e) { roomMessages = {}; }
  } else {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify({}, null, 2));
  }
}

// 2. Kaydetme Fonksiyonları
function saveUsers() {
  fs.writeFile(USERS_FILE, JSON.stringify(userDatabase, null, 2), () => {});
}
function saveMessages() {
  fs.writeFile(MESSAGES_FILE, JSON.stringify(roomMessages, null, 2), () => {});
}

// Başlangıçta yükle
loadData();

io.on("connection", (socket) => {
  let username = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // GİRİŞ İŞLEMİ
  socket.on("loginAttempt", ({ username: tryUser, password }) => {
    if (!tryUser || !password) return;

    let success = false;
    // Kullanıcı var mı?
    if (userDatabase[tryUser]) {
      if (userDatabase[tryUser] === password) success = true;
    } else {
      // Yoksa otomatik kayıt et
      userDatabase[tryUser] = password;
      saveUsers();
      success = true;
    }

    if (success) {
      username = tryUser;
      socket.emit("loginSuccess", username);
      joinProcess(username);
    } else {
      socket.emit("loginError", "Hatalı şifre!");
    }
  });

  function joinProcess(uName) {
    activeUsers.set(uName, true);
    io.emit("userStatus", { username: uName, online: true });

    // Odaya girince geçmişi yükle
    if (roomMessages[currentRoom]) {
      socket.emit("loadHistory", roomMessages[currentRoom]);
    }
  }

  // ODA DEĞİŞTİRME
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    if (roomMessages[roomName]) {
      socket.emit("loadHistory", roomMessages[roomName]);
    }
  });

  // MESAJ GÖNDERME
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const { text, time } = data;
    const msg = { username, text, time };

    if (!roomMessages[currentRoom]) roomMessages[currentRoom] = [];
    roomMessages[currentRoom].push(msg);

    // Son 50 mesajı tut
    if (roomMessages[currentRoom].length > 50) roomMessages[currentRoom].shift();

    saveMessages(); // Dosyaya yaz
    io.to(currentRoom).emit("newMessage", msg);
  });

  // ÇIKIŞ
  socket.on("disconnect", () => {
    if (username) {
      activeUsers.delete(username);
      io.emit("userStatus", { username, online: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});

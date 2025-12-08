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

// --- VERİ HAVUZU ---
const activeUsers = new Map(); // Anlık Online Kullanıcılar

// --- DOSYA SİSTEMİ AYARLARI ---
const USERS_FILE = "users.json";
const MESSAGES_FILE = "messages.json";

let userDatabase = {};
let roomMessages = {}; // Mesajlar artık burada ve dosyadan yüklenecek

// 1. Kullanıcıları Yükle
function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      userDatabase = JSON.parse(data);
      console.log("✅ Kullanıcı veritabanı yüklendi.");
    } catch (err) {
      console.error("Kullanıcı dosyası hatası:", err);
      userDatabase = {};
    }
  } else {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
  }
}

// 2. Mesajları Yükle (YENİ)
function loadMessages() {
  if (fs.existsSync(MESSAGES_FILE)) {
    try {
      const data = fs.readFileSync(MESSAGES_FILE, "utf-8");
      roomMessages = JSON.parse(data);
      console.log("✅ Mesaj geçmişi yüklendi.");
    } catch (err) {
      console.error("Mesaj dosyası hatası:", err);
      roomMessages = {};
    }
  } else {
    // Dosya yoksa boş başlat
    roomMessages = {};
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify({}, null, 2));
  }
}

// 3. Kullanıcı Kaydet
function saveUserToDisk(username, password) {
  userDatabase[username] = password;
  fs.writeFile(USERS_FILE, JSON.stringify(userDatabase, null, 2), (err) => {
    if (err) console.error("Kayıt hatası:", err);
  });
}

// 4. Mesajları Kaydet (YENİ)
function saveMessagesToDisk() {
  fs.writeFile(MESSAGES_FILE, JSON.stringify(roomMessages, null, 2), (err) => {
    if (err) console.error("Mesaj kaydetme hatası:", err);
  });
}

// Başlangıçta verileri yükle
loadUsers();
loadMessages();

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");
  
  let username = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // GİRİŞ İŞLEMİ
  socket.on("loginAttempt", ({ username: tryUser, password }) => {
    if (!tryUser || !password) return;

    if (userDatabase.hasOwnProperty(tryUser)) {
      if (userDatabase[tryUser] === password) {
        username = tryUser;
        socket.emit("loginSuccess", username);
        joinProcess(username);
      } else {
        socket.emit("loginError", "Şifre hatalı!");
      }
    } else {
      // Yeni Kayıt
      saveUserToDisk(tryUser, password);
      username = tryUser;
      socket.emit("loginSuccess", username);
      joinProcess(username);
      console.log(`YENİ KAYIT: ${username}`);
    }
  });

  function joinProcess(uName) {
    const count = activeUsers.get(uName) || 0;
    activeUsers.set(uName, count + 1);

    io.emit("userStatus", { username: uName, online: true });

    const onlineUsersList = Array.from(activeUsers.keys());
    socket.emit("activeUsersList", onlineUsersList);

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

    // Odanın geçmiş mesajlarını gönder
    if (roomMessages[roomName]) {
      socket.emit("loadHistory", roomMessages[roomName]);
    }
  });

  // MESAJ GÖNDERME (GÜNCELLENDİ)
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const { text, time } = data;

    const msg = { username, text, time };

    // Eğer oda henüz oluşmamışsa oluştur
    if (!roomMessages[currentRoom]) {
      roomMessages[currentRoom] = [];
    }

    // Mesajı ekle
    roomMessages[currentRoom].push(msg);

    // Son 50 mesaj sınırını koru (Dosya boyutu şişmesin diye)
    if (roomMessages[currentRoom].length > 50) {
      roomMessages[currentRoom].shift();
    }

    // Dosyaya kaydet
    saveMessagesToDisk();

    // Diğerlerine gönder
    io.to(currentRoom).emit("newMessage", msg);
  });

  // ÇIKIŞ
  socket.on("disconnect", () => {
    if (!username) return;

    const count = activeUsers.get(username) || 0;
    if (count <= 1) {
      activeUsers.delete(username);
      io.emit("userStatus", { username, online: false });
    } else {
      activeUsers.set(username, count - 1);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});

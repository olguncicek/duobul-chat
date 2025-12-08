const express = require("express");
const http = require("http");
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
const activeUsers = new Map(); // Anlık Bağlı Kullanıcılar (Username -> Socket Sayısı)
const roomMessages = {}; // Oda Adı -> Mesajlar Dizisi []

// --- KULLANICI VERİTABANI (RAM'de tutulur) ---
// Format: { "kullaniciAdi": "sifre123" }
const userDatabase = {
    "admin": "1234" // Örnek bir kayıt
};

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");
  
  let username = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // GİRİŞ / KAYIT MANTIĞI
  socket.on("loginAttempt", ({ username: tryUser, password }) => {
    if (!tryUser || !password) return;

    // 1. Kullanıcı veritabanında var mı?
    if (userDatabase.hasOwnProperty(tryUser)) {
      // VARSA: Şifreyi kontrol et
      if (userDatabase[tryUser] === password) {
        // Şifre doğru -> Giriş Başarılı
        // (Ekstra kontrol: Zaten online mı? İstersen engelleyebilirsin ama şimdilik izin veriyoruz)
        username = tryUser;
        socket.emit("loginSuccess", username);
        joinProcess(username); // Oyuna dahil etme işlemleri
      } else {
        // Şifre yanlış -> Hata ver
        socket.emit("loginError", "Bu kullanıcı adı zaten alınmış ve şifre yanlış!");
      }
    } else {
      // YOKSA: Yeni kayıt oluştur
      userDatabase[tryUser] = password;
      username = tryUser;
      
      socket.emit("loginSuccess", username);
      joinProcess(username); // Oyuna dahil etme işlemleri
      
      // Sunucu konsoluna bilgi düş
      console.log(`YENİ KAYIT: ${username} aramıza katıldı.`);
    }
  });

  // Giriş başarılı olduktan sonra yapılacak standart işler
  function joinProcess(uName) {
    // Kullanıcıyı aktif listesine ekle
    const count = activeUsers.get(uName) || 0;
    activeUsers.set(uName, count + 1);

    // Herkese "Bu kişi ONLINE oldu" de
    io.emit("userStatus", { username: uName, online: true });

    // Yeni giren kişiye aktif kullanıcı listesini gönder
    const onlineUsersList = Array.from(activeUsers.keys());
    socket.emit("activeUsersList", onlineUsersList);

    // Geçmiş mesajları yükle
    if (roomMessages[currentRoom]) {
      socket.emit("loadHistory", roomMessages[currentRoom]);
    }
  }

  // 2. ODA DEĞİŞTİRME
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    if (roomMessages[roomName]) {
      socket.emit("loadHistory", roomMessages[roomName]);
    }
  });

  // 3. MESAJ GÖNDERME
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const { text, time } = data;

    const msg = { username, text, time };

    if (!roomMessages[currentRoom]) {
      roomMessages[currentRoom] = [];
    }
    roomMessages[currentRoom].push(msg);

    if (roomMessages[currentRoom].length > 50) {
      roomMessages[currentRoom].shift();
    }

    io.to(currentRoom).emit("newMessage", msg);
  });

  // 4. ÇIKIŞ YAPMA
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

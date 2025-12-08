const express = require("express");
const http = require("http");
const fs = require("fs"); // Dosya işlemleri için gerekli modül
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
const activeUsers = new Map(); // Anlık Bağlı Kullanıcılar (Online Durumu)
const roomMessages = {}; // Oda Mesajları (RAM'de duruyor, istersen bunu da kaydederiz)

// --- DOSYA SİSTEMİ AYARLARI ---
const USERS_FILE = "users.json";
let userDatabase = {};

// 1. Sunucu açılırken kayıtlı kullanıcıları yükle
function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      userDatabase = JSON.parse(data);
      console.log("✅ Kullanıcı veritabanı yüklendi.");
    } catch (err) {
      console.error("Veritabanı okunurken hata oluştu, boş başlatılıyor.", err);
      userDatabase = {};
    }
  } else {
    // Dosya yoksa oluştur
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
    console.log("📁 Yeni kullanıcı dosyası oluşturuldu.");
  }
}

// 2. Yeni kullanıcıyı dosyaya kaydet
function saveUserToDisk(username, password) {
  userDatabase[username] = password;
  // Dosyayı güncelle
  fs.writeFile(USERS_FILE, JSON.stringify(userDatabase, null, 2), (err) => {
    if (err) console.error("Kayıt sırasında hata:", err);
    else console.log(`💾 ${username} dosyaya kaydedildi.`);
  });
}

// Başlangıçta yüklemeyi yap
loadUsers();

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");
  
  let username = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // --- GİRİŞ / OTOMATİK KAYIT MANTIĞI ---
  socket.on("loginAttempt", ({ username: tryUser, password }) => {
    if (!tryUser || !password) return;

    // A) Kullanıcı zaten kayıtlı mı?
    if (userDatabase.hasOwnProperty(tryUser)) {
      // Şifre kontrolü
      if (userDatabase[tryUser] === password) {
        // BAŞARILI GİRİŞ
        username = tryUser;
        socket.emit("loginSuccess", username);
        joinProcess(username);
      } else {
        // HATALI ŞİFRE
        socket.emit("loginError", "Bu kullanıcı adı kayıtlı ama şifre yanlış!");
      }
    } else {
      // B) Kayıtlı değil -> OTOMATİK KAYIT OL
      saveUserToDisk(tryUser, password); // Dosyaya yaz
      
      username = tryUser;
      socket.emit("loginSuccess", username);
      joinProcess(username);
      
      console.log(`YENİ KAYIT: ${username} oluşturuldu.`);
    }
  });

  // Giriş başarılı olunca yapılacak işlemler
  function joinProcess(uName) {
    const count = activeUsers.get(uName) || 0;
    activeUsers.set(uName, count + 1);

    io.emit("userStatus", { username: uName, online: true });

    const onlineUsersList = Array.from(activeUsers.keys());
    socket.emit("activeUsersList", onlineUsersList);

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

    if (!roomMessages[currentRoom]) {
      roomMessages[currentRoom] = [];
    }
    roomMessages[currentRoom].push(msg);

    if (roomMessages[currentRoom].length > 50) {
      roomMessages[currentRoom].shift();
    }

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

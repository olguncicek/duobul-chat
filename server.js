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
const users = new Map(); // Kullanıcı Adı -> Bağlantı Sayısı
const roomMessages = {}; // Oda Adı -> Mesajlar Dizisi []

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");
  
  let username = null;
  let currentRoom = "genel"; // Varsayılan oda
  socket.join("genel");

  // 1. KULLANICI GİRİŞ YAPTIĞINDA
  socket.on("setUsername", (name) => {
    if (!name) return;
    username = name.trim();
    if (!username) return;

    // Kullanıcıyı kaydet
    const count = users.get(username) || 0;
    users.set(username, count + 1);

    // A) Herkese "Bu kişi ONLINE oldu" de
    io.emit("userStatus", { username, online: true });

    // B) [YENİ] Yeni giren kişiye "Şu an içeride bunlar var" listesini gönder
    const onlineUsersList = Array.from(users.keys());
    socket.emit("activeUsersList", onlineUsersList);

    // C) Girdiği odanın (genel) geçmiş mesajlarını yükle
    if (roomMessages["genel"]) {
      socket.emit("loadHistory", roomMessages["genel"]);
    }
  });

  // 2. ODA DEĞİŞTİRME
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    // Odanın geçmiş mesajlarını sadece bu kullanıcıya gönder
    if (roomMessages[roomName]) {
      socket.emit("loadHistory", roomMessages[roomName]);
    }
  });

  // 3. MESAJ GÖNDERME
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const { text, time } = data;

    const msg = { username, text, time };

    // Mesajı sunucu hafızasına kaydet (Geçmiş için)
    if (!roomMessages[currentRoom]) {
      roomMessages[currentRoom] = [];
    }
    roomMessages[currentRoom].push(msg);

    // Son 50 mesajı tut, fazlasını sil
    if (roomMessages[currentRoom].length > 50) {
      roomMessages[currentRoom].shift();
    }

    // Mesajı o odadakilere gönder
    io.to(currentRoom).emit("newMessage", msg);
  });

  // 4. ÇIKIŞ YAPMA
  socket.on("disconnect", () => {
    if (!username) return;

    const count = users.get(username) || 0;
    if (count <= 1) {
      users.delete(username);
      // Herkese "Bu kişi OFFLINE oldu" de
      io.emit("userStatus", { username, online: false });
    } else {
      users.set(username, count - 1);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});

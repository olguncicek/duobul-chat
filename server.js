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

// Statik dosyalar (HTML, CSS, JS) public klasöründen sunulur
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// --- VERİ YAPILARI ---
const users = new Map(); // Kullanıcı Adı -> Bağlantı Sayısı
const roomMessages = {}; // Oda Adı -> Mesaj Listesi []

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");
  
  let username = null;
  let currentRoom = "genel"; // Herkes varsayılan olarak "genel" odasında başlar
  socket.join("genel");

  // 1. KULLANICI GİRİŞİ
  socket.on("setUsername", (name) => {
    if (!name) return;
    username = name.trim();
    if (!username) return;

    // Kullanıcı sayısını güncelle
    const count = users.get(username) || 0;
    users.set(username, count + 1);

    // Herkese bu kullanıcının ONLİNE olduğunu bildir
    io.emit("userStatus", { username, online: true });

    // Kullanıcıya girdiği odanın (genel) geçmiş mesajlarını yükle
    if (roomMessages["genel"]) {
      socket.emit("loadHistory", roomMessages["genel"]);
    }
  });

  // 2. ODA DEĞİŞTİRME (LOBİ SİSTEMİ)
  socket.on("joinRoom", (roomName) => {
    // Eski odadan çık
    socket.leave(currentRoom);
    
    // Yeni odaya gir
    socket.join(roomName);
    currentRoom = roomName;

    console.log(`${username} kullanıcısı ${roomName} odasına geçti.`);

    // Yeni odanın geçmiş mesajlarını sadece bu kullanıcıya gönder
    if (roomMessages[roomName]) {
      socket.emit("loadHistory", roomMessages[roomName]);
    }
  });

  // 3. MESAJ GÖNDERME
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const { text, time } = data;
    if (!text || !time) return;

    const msg = {
      username,
      text,
      time
    };

    // A) Mesajı sunucu hafızasına kaydet (Geçmiş için)
    if (!roomMessages[currentRoom]) {
      roomMessages[currentRoom] = [];
    }
    roomMessages[currentRoom].push(msg);

    // Hafıza şişmesin diye son 50 mesajı tutalım
    if (roomMessages[currentRoom].length > 50) {
      roomMessages[currentRoom].shift(); // En eski mesajı sil
    }

    // B) Mesajı SADECE o odadaki kişilere gönder
    io.to(currentRoom).emit("newMessage", msg);
  });

  // 4. BAĞLANTI KOPMASI
  socket.on("disconnect", () => {
    console.log("Bir kullanıcı ayrıldı");
    if (!username) return;

    const count = users.get(username) || 0;
    if (count <= 1) {
      users.delete(username);
      // Herkese bu kullanıcının OFFLINE olduğunu bildir
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

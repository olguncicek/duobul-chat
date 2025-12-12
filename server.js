const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Statik dosyaları sun
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

/* ===================================================
   HAFIZA (RAM) ÜZERİNDE VERİ SAKLAMA
   =================================================== */
const onlineUsers = new Map(); // Kimler online?
const roomMessages = {};       // Oda geçmişleri (Son 50 mesaj)
const registeredUsers = [];    // Kayıt olan sahte kullanıcı listesi

io.on("connection", (socket) => {
  let currentUser = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // --- KAYIT OLMA (RAM'e Kaydeder) ---
  socket.on("registerUser", (userData) => {
    // Aynı maille kayıt var mı kontrolü
    const exists = registeredUsers.find(u => u.email === userData.email);
    if (exists) {
      socket.emit("registerResponse", { success: false, message: "Bu e-posta zaten kayıtlı!" });
    } else {
      registeredUsers.push(userData);
      socket.emit("registerResponse", { success: true, message: "Kayıt Başarılı!" });
    }
  });

  // --- GİRİŞ YAPMA ---
  socket.on("setUsername", (username) => {
    if (!username) return;
    currentUser = username;
    onlineUsers.set(username, true);

    io.emit("userStatus", { username, online: true });
    socket.emit("activeUsersList", Array.from(onlineUsers.keys()));

    // Geçmiş mesajları gönder
    if (roomMessages[currentRoom]) {
      socket.emit("loadHistory", roomMessages[currentRoom]);
    }
  });

  // --- ODA DEĞİŞTİRME ---
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    // Yeni odanın geçmişini gönder
    if (roomMessages[roomName]) {
      socket.emit("loadHistory", roomMessages[roomName]);
    } else {
      socket.emit("loadHistory", []);
    }
  });

  // --- MESAJ GÖNDERME ---
  socket.on("sendMessage", (data) => {
    if (!currentUser) return;

    const msg = {
      username: currentUser,
      text: data.text,
      time: data.time
    };

    // Hafızaya kaydet
    if (!roomMessages[currentRoom]) roomMessages[currentRoom] = [];
    roomMessages[currentRoom].push(msg);

    // Sadece son 50 mesajı tut
    if (roomMessages[currentRoom].length > 50) roomMessages[currentRoom].shift();

    // Odadakilere gönder
    io.to(currentRoom).emit("newMessage", msg);
  });

  // --- ÇIKIŞ ---
  socket.on("disconnect", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit("userStatus", { username: currentUser, online: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda (VERİTABANSIZ) çalışıyor...`);
});

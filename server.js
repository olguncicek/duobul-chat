const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

// Socket.io sunucu
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Statik dosyalar
app.use(express.static(__dirname + "/public"));

// Ana sayfa
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// Kullanıcılar (online takibi)
const socketIdToUser = new Map(); // socket.id -> username

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı:", socket.id);

  // Kullanıcı odaya girince ismini gönderiyor
  socket.on("join", (username) => {
    if (!username) return;
    socketIdToUser.set(socket.id, username);

    // Herkese bu kullanıcının online olduğunu bildir
    io.emit("userStatus", { username, online: true });
  });

  // Mesaj gönderildiğinde
  socket.on("sendMessage", (data) => {
    const username = socketIdToUser.get(socket.id) || data.username || "Anonim";

    // Mesaj verisini bozmadan aynen yayınlıyoruz
    const message = {
      text: data.text,
      username,
      time: data.time, // saat tarayıcıdan geldi
    };

    io.emit("newMessage", message);
  });

  // Kullanıcı ayrıldığında
  socket.on("disconnect", () => {
    const username = socketIdToUser.get(socket.id);
    if (username) {
      socketIdToUser.delete(socket.id);
      // Herkese bu kullanıcının offline olduğunu bildir
      io.emit("userStatus", { username, online: false });
    }
    console.log("Bir kullanıcı ayrıldı:", socket.id);
  });
});

// Railway için PORT ayarı
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Sunucu çalışıyor. Port:", PORT);
});

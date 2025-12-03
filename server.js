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

// public klasörü
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// username -> aktif socket sayısı
const users = new Map();

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");
  let username = null;

  // Kullanıcı adını al
  socket.on("setUsername", (name) => {
    if (!name) return;
    username = name.trim();
    if (!username) return;

    const count = users.get(username) || 0;
    users.set(username, count + 1);

    // Bu kullanıcı çevrimiçi
    io.emit("userStatus", { username, online: true });
  });

  // Mesaj gönder
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const { text, time } = data;
    if (!text || !time) return;

    const msg = {
      username,
      text,
      time
    };

    io.emit("newMessage", msg);
  });

  // Bağlantı koptuğunda
  socket.on("disconnect", () => {
    console.log("Bir kullanıcı ayrıldı");
    if (!username) return;

    const count = users.get(username) || 0;
    if (count <= 1) {
      users.delete(username);
      // Bu kullanıcı tamamen çıktı → offline
      io.emit("userStatus", { username, online: false });
    } else {
      users.set(username, count - 1);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Sunucu çalışıyor. Port:", PORT);
});

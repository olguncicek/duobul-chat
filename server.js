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

// io.on("connection", ...) bloğunun içini şu şekilde güncelle:

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");
  let username = null;
  
  // Her kullanıcı varsayılan olarak "genel" odasında başlar
  let currentRoom = "genel"; 
  socket.join("genel");

  // Kullanıcı adını al
  socket.on("setUsername", (name) => {
    if (!name) return;
    username = name.trim();
    if (!username) return;

    const count = users.get(username) || 0;
    users.set(username, count + 1);

    // Kullanıcı online bilgisini herkese gönder (Status global kalabilir)
    io.emit("userStatus", { username, online: true });
  });

  // --- YENİ: ODA DEĞİŞTİRME ---
  socket.on("joinRoom", (roomName) => {
    // Eski odadan ayrıl
    socket.leave(currentRoom);
    // Yeni odaya gir
    socket.join(roomName);
    currentRoom = roomName;

    // (İsteğe bağlı) Kullanıcıya odaya girdiğine dair sistem mesajı gönderebilirsin
    // socket.emit("newMessage", { username: "Sistem", text: `${roomName} odasına katıldın.`, time: "..." });
  });

  // Mesaj gönder (GÜNCELLENDİ)
  socket.on("sendMessage", (data) => {
    if (!username) return;
    const { text, time } = data;
    if (!text || !time) return;

    const msg = {
      username,
      text,
      time
    };

    // io.emit yerine io.to(currentRoom).emit kullanıyoruz
    // Böylece mesaj sadece o odadaki kişilere gider.
    io.to(currentRoom).emit("newMessage", msg);
  });

  // Bağlantı koptuğunda
  socket.on("disconnect", () => {
    console.log("Bir kullanıcı ayrıldı");
    if (!username) return;

    const count = users.get(username) || 0;
    if (count <= 1) {
      users.delete(username);
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

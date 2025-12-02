const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// TR saatini düzgün almak için (UTC değil Europe/Istanbul)
function getTurkeyTime() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  });
}

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı:", socket.id);

  let currentUser = null;

  // Kullanıcı adını al
  socket.on("set_username", (username) => {
    currentUser = username;
    console.log(`Kullanıcı bağlandı: ${username} (${socket.id})`);

    // Sisteme bağlandı mesajı
    io.emit("user_status", {
      user: username,
      status: "online",
      time: getTurkeyTime(),
    });
  });

  // Mesaj gönderme (saat client'tan geliyor!)
  socket.on("sendMessage", (msg) => {
    // msg = { user, text, time }
    io.emit("chat_message", msg);
  });

  socket.on("disconnect", () => {
    if (currentUser) {
      console.log(`Kullanıcı ayrıldı: ${currentUser} (${socket.id})`);
      io.emit("user_status", {
        user: currentUser,
        status: "offline",
        time: getTurkeyTime(),
      });
    } else {
      console.log("İsimsiz bir kullanıcı ayrıldı:", socket.id);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("Sunucu çalışıyor. Port:", PORT);
});

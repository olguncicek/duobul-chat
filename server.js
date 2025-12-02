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

// public klasörünü statik olarak sun
app.use(express.static(__dirname + "/public"));

// ana sayfa
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// socket.io
io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı");

  // client'tan mesaj gelince herkese gönder
  socket.on("sendMessage", (data) => {
    // data: { user, text, time }
    io.emit("newMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("Bir kullanıcı ayrıldı");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Sunucu çalışıyor. Port:", PORT);
});

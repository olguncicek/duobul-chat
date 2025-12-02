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

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/duo.html");
});

io.on("connection", (socket) => {
    console.log("Bir kullanıcı bağlandı");

    socket.on("sendMessage", (msg) => {
        io.emit("newMessage", msg);
    });

    socket.on("disconnect", () => {
        console.log("Bir kullanıcı ayrıldı");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Sunucu çalışıyor. Port:", PORT);
});

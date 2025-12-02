const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/duo.html");
});

let onlineUsers = {};

io.on("connection", (socket) => {
    console.log("Bir kullanıcı bağlandı");

    socket.on("setUsername", (username) => {
        socket.username = username;
        onlineUsers[socket.id] = username;
        io.emit("onlineUsers", onlineUsers);
    });

    socket.on("sendMessage", (msg) => {
        io.emit("newMessage", {
            user: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString().slice(0, 5),
            online: true
        });
    });

    socket.on("disconnect", () => {
        console.log("Bir kullanıcı ayrıldı");
        delete onlineUsers[socket.id];

        io.emit("onlineUsers", onlineUsers);

        io.emit("userDisconnected", {
            user: socket.username,
            online: false
        });
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log("Sunucu çalışıyor.");
});

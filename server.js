// ================================
//  DUOBUL – SOHBET SERVER
// ================================

const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Public klasörünü sun
app.use(express.static(path.join(__dirname, "public")));

// Ana sayfa
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "duo.html"));
});

// Kullanıcı listesi
let users = {};

// ------------------------------
//  SOCKET.IO
// ------------------------------
io.on("connection", (socket) => {
    console.log("Bir kullanıcı bağlandı:", socket.id);

    // Kullanıcı giriş yaptı
    socket.on("setUsername", (username) => {
        users[socket.id] = username;

        // Kullanıcı online oldu
        io.emit("userStatus", {
            user: username,
            status: "online",
            time: new Date().toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit"
            })
        });
    });

    // Mesaj geldi
    socket.on("chatMessage", (data) => {
        io.emit("chatMessage", data);
    });

    // Bağlantı koptu
    socket.on("disconnect", () => {
        const username = users[socket.id];

        if (username) {
            io.emit("userStatus", {
                user: username,
                status: "offline",
                time: new Date().toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            });
            delete users[socket.id];
        }

        console.log("Kullanıcı ayrıldı:", socket.id);
    });
});

// ------------------------------
//  PORT AYARI
// ------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Sunucu çalışıyor. Port:", PORT);
});

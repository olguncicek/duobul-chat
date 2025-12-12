const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Statik dosyaları "public" klasöründen sunar
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/duo.html");
});

// Veri Havuzu (RAM)
const roomMessages = {};

io.on("connection", (socket) => {
    let username = "";
    let currentRoom = "genel";
    socket.join("genel");

    socket.on("setUsername", (name) => {
        username = name;
        // Odaya girince geçmişi yükle
        if (roomMessages[currentRoom]) {
            socket.emit("loadHistory", roomMessages[currentRoom]);
        }
    });

    socket.on("registerUser", (data) => {
        // Veritabanı olmadığı için RAM modunda onay gönderir
        socket.emit("registerResponse", { success: true });
    });

    socket.on("joinRoom", (room) => {
        socket.leave(currentRoom);
        socket.join(room);
        currentRoom = room;
    });

    socket.on("sendMessage", (data) => {
        const msg = { username, text: data.text, time: data.time };
        if (!roomMessages[currentRoom]) roomMessages[currentRoom] = [];
        roomMessages[currentRoom].push(msg);
        
        // Son 50 mesajı tut
        if (roomMessages[currentRoom].length > 50) roomMessages[currentRoom].shift();
        
        io.to(currentRoom).emit("newMessage", msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));

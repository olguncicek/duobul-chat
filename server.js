const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 8080;

// Public klasörü aç
app.use(express.static("public"));

// Ana sayfa
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/duo.html");
});

// Kullanıcılar
let users = {};

// Yeni bağlantı
io.on("connection", socket => {
    console.log("Bir kullanıcı bağlandı:", socket.id);

    // Kullanıcı giriş yapınca
    socket.on("setUsername", username => {
        users[socket.id] = { username, room: "genel" };
        socket.join("genel");

        // Odaya bilgi gönder
        io.to("genel").emit("userStatus", {
            user: username,
            status: "online"
        });
    });

    // Oda değiştirme
    socket.on("changeRoom", room => {
        const user = users[socket.id];
        if (!user) return;

        socket.leave(user.room);
        socket.join(room);

        users[socket.id].room = room;
    });

    // Mesaj gönderme
    socket.on("chatMessage", data => {
        const user = users[socket.id];
        if (!user) return;

        io.to(user.room).emit("chatMessage", {
            user: user.username,
            msg: data.msg,
            time: data.time
        });
    });

    // Kullanıcı çıkınca
    socket.on("disconnect", () => {
        const user = users[socket.id];
        if (!user) return;

        io.to(user.room).emit("userStatus", {
            user: user.username,
            status: "offline"
        });

        delete users[socket.id];
    });
});

http.listen(PORT, () => {
    console.log(`Sunucu çalışıyor → Port: ${PORT}`);
});

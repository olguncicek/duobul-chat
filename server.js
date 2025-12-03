const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", socket => {
    console.log("Bir kullanıcı bağlandı.");

    // Kullanıcı odaya katılıyor
    socket.on("joinRoom", ({ username, room }) => {
        socket.username = username;
        socket.room = room;

        socket.join(room);

        console.log(`${username} -> ${room} odasına girdi`);

        // Odaya kullanıcı giriş mesajı
        socket.to(room).emit("systemMessage", {
            msg: `${username} sohbete katıldı.`,
            time: getTime()
        });
    });

    // Mesaj gönderme
    socket.on("chatMessage", ({ room, user, msg }) => {
        io.to(room).emit("chatMessage", {
            user,
            msg,
            time: getTime()
        });
    });

    // Ayrılınca mesaj
    socket.on("disconnect", () => {
        if (!socket.username || !socket.room) return;

        io.to(socket.room).emit("systemMessage", {
            msg: `${socket.username} sohbetten ayrıldı.`,
            time: getTime()
        });
    });
});

function getTime() {
    const now = new Date();
    return now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => console.log("Sunucu çalışıyor: " + PORT));

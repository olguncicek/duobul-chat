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

// Statik dosyalar
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// --- VERİ HAVUZU ---
const activeConnections = new Map(); // Kullanıcı Adı -> Bağlantı Sayısı
const roomMessages = {}; // Oda Adı -> Mesajlar []

// Basit Kullanıcı Veritabanı (RAM üzerinde tutulur, sunucu kapanınca sıfırlanır)
// Gerçek projede MongoDB veya SQL kullanılmalıdır.
const registeredUsers = {}; // { "ahmet": "1234", "mehmet": "abc" }

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı: " + socket.id);
  
  let currentUser = null;
  let currentRoom = "genel";
  socket.join("genel");

  // 1. KİMLİK DOĞRULAMA (Giriş veya Kayıt)
  socket.on("authRequest", ({ action, username, password }) => {
    const safeUser = username.trim();
    
    // Basit Validasyonlar
    if (!safeUser || safeUser.length < 3) {
      socket.emit("authResponse", { success: false, message: "Kullanıcı adı en az 3 karakter olmalı." });
      return;
    }

    if (action === "register") {
      // --- KAYIT OLMA ---
      if (registeredUsers[safeUser]) {
        socket.emit("authResponse", { success: false, message: "Bu kullanıcı adı zaten alınmış." });
      } else {
        registeredUsers[safeUser] = password; // Kaydet
        loginSuccess(socket, safeUser);
      }
    } else {
      // --- GİRİŞ YAPMA ---
      // Kullanıcı kayıtlı mı?
      if (!registeredUsers[safeUser]) {
        // Kayıtlı değilse bile "Misafir" gibi girmesine izin verelim mi? 
        // Yoksa hata mı verelim? Kullanıcı "Kayıt Butonu" istediği için
        // artık sadece kayıtlılar girebilsin diyebiliriz.
        // Veya kayıtlı değilse "Böyle bir kullanıcı yok" diyelim.
        socket.emit("authResponse", { success: false, message: "Kullanıcı bulunamadı. Önce kayıt ol." });
      } else {
        // Şifre kontrolü
        if (registeredUsers[safeUser] === password) {
          loginSuccess(socket, safeUser);
        } else {
          socket.emit("authResponse", { success: false, message: "Hatalı şifre!" });
        }
      }
    }
  });

  // Giriş Başarılı Olduğunda Çalışacak Ortak Fonksiyon
  function loginSuccess(socket, username) {
    currentUser = username;
    
    // İstemciye başarili bilgisini don
    socket.emit("authResponse", { success: true, username: currentUser });

    // Aktif sayısını güncelle
    const count = activeConnections.get(currentUser) || 0;
    activeConnections.set(currentUser, count + 1);

    // Herkese Online bilgisini yay
    io.emit("userStatus", { username: currentUser, online: true });

    // Yeni girene aktifleri yolla
    const onlineUsersList = Array.from(activeConnections.keys());
    socket.emit("activeUsersList", onlineUsersList);

    // Geçmiş mesajları yükle
    if (roomMessages["genel"]) {
      socket.emit("loadHistory", roomMessages["genel"]);
    }
  }

  // 2. ODA DEĞİŞTİRME
  socket.on("joinRoom", (roomName) => {
    if (!currentUser) return; // Giriş yapmamışsa işlem yapma
    
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    if (roomMessages[roomName]) {
      socket.emit("loadHistory", roomMessages[roomName]);
    }
  });

  // 3. MESAJ GÖNDERME
  socket.on("sendMessage", (data) => {
    if (!currentUser) return;
    const { text, time } = data;
    const msg = { username: currentUser, text, time };

    if (!roomMessages[currentRoom]) {
      roomMessages[currentRoom] = [];
    }
    roomMessages[currentRoom].push(msg);

    if (roomMessages[currentRoom].length > 50) {
      roomMessages[currentRoom].shift();
    }

    io.to(currentRoom).emit("newMessage", msg);
  });

  // 4. ÇIKIŞ YAPMA
  socket.on("disconnect", () => {
    if (!currentUser) return;

    const count = activeConnections.get(currentUser) || 0;
    if (count <= 1) {
      activeConnections.delete(currentUser);
      io.emit("userStatus", { username: currentUser, online: false });
    } else {
      activeConnections.set(currentUser, count - 1);
    }
    console.log("Kullanıcı ayrıldı: " + currentUser);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});

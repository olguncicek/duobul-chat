const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");

// 1. FIREBASE KURULUMU
// İndirdiğin JSON dosyasının adı 'firebase-key.json' olmalı ve bu dosya server.js ile yan yana olmalı.
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // Veritabanı aracı

// 2. EXPRESS VE SOCKET.IO KURULUMU
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Statik dosyalar
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

// --- RAM BELLEK (Sadece anlık online durumu için) ---
const onlineUsers = new Map(); // Kullanıcı Adı -> Socket ID

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı: " + socket.id);

  let currentUser = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  /* -------------------------------------------------
     A. KULLANICI KAYDI (REGISTRATION)
     ------------------------------------------------- */
  socket.on("registerUser", async (userData) => {
    try {
      // 1. Bu e-posta veya kullanıcı adı daha önce alınmış mı bakalım?
      // (Basitlik adına şimdilik doğrudan kaydediyoruz)
      
      await db.collection("users").add({
        name: userData.name,
        surname: userData.surname,
        year: userData.year,
        email: userData.email,
        password: userData.password, // Gerçek projede şifreler şifrelenmeli (hash)
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Başarılı mesajı dön
      socket.emit("registerResponse", { success: true, message: "Kayıt veritabanına eklendi!" });
      
    } catch (error) {
      console.error("Kayıt hatası:", error);
      socket.emit("registerResponse", { success: false, message: "Veritabanı hatası!" });
    }
  });

  /* -------------------------------------------------
     B. GİRİŞ YAPMA (Sohbete Katılma)
     ------------------------------------------------- */
  socket.on("setUsername", (username) => {
    if (!username) return;
    currentUser = username;

    // Online listesine ekle
    onlineUsers.set(username, true);

    // Herkese duyur: "Bu kişi online oldu"
    io.emit("userStatus", { username, online: true });

    // Yeni girene aktif listeyi gönder
    socket.emit("activeUsersList", Array.from(onlineUsers.keys()));

    // Odanın geçmiş mesajlarını Firebase'den yükle
    loadMessagesForRoom(currentRoom, socket);
  });

  /* -------------------------------------------------
     C. ODA DEĞİŞTİRME
     ------------------------------------------------- */
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    // Yeni odanın mesajlarını veritabanından çek
    loadMessagesForRoom(currentRoom, socket);
  });

  /* -------------------------------------------------
     D. MESAJ GÖNDERME
     ------------------------------------------------- */
  socket.on("sendMessage", async (data) => {
    if (!currentUser) return;

    const messageData = {
      room: currentRoom,
      username: currentUser,
      text: data.text,
      time: data.time,
      createdAt: admin.firestore.FieldValue.serverTimestamp() // Sıralama için sunucu saati
    };

    // 1. Önce Veritabanına Kaydet (Kalıcı Olsun)
    try {
      await db.collection("messages").add(messageData);
    } catch (err) {
      console.error("Mesaj kaydedilemedi:", err);
    }

    // 2. Sonra Odadaki Herkese Gönder (Anlık Görünsün)
    io.to(currentRoom).emit("newMessage", {
      username: currentUser,
      text: data.text,
      time: data.time
    });
  });

  /* -------------------------------------------------
     E. ÇIKIŞ YAPMA
     ------------------------------------------------- */
  socket.on("disconnect", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit("userStatus", { username: currentUser, online: false });
    }
  });
});

// YARDIMCI FONKSİYON: Mesajları Çekme
async function loadMessagesForRoom(roomName, socket) {
  try {
    // Firebase sorgusu: Odaya göre filtrele, tarihe göre tersten sırala, son 50'yi al
    const snapshot = await db.collection("messages")
      .where("room", "==", roomName)
      .orderBy("createdAt", "desc") 
      .limit(50)
      .get();

    const history = [];
    snapshot.forEach(doc => {
      history.push(doc.data());
    });

    // Veriler tersten (en yeni en başta) geldiği için çevirip gönderiyoruz
    socket.emit("loadHistory", history.reverse());
    
  } catch (error) {
    console.error("Geçmiş yüklenirken hata:", error);
  }
}

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda ve Firebase aktif!`);
});

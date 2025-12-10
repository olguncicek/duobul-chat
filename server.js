const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");

/* ===================================================
   1. FIREBASE KURULUMU (RAILWAY & LOCAL UYUMLU)
   =================================================== */
let serviceAccount;

try {
  // Eğer Railway üzerindeysek (Environment Variable varsa)
  if (process.env.FIREBASE_KEY) {
    console.log("--> Railway ortamı algılandı. Anahtar Variable'dan okunuyor...");
    // Gelen veri String olduğu için JSON objesine çeviriyoruz
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  } 
  // Eğer Local bilgisayardaysak (Dosya varsa)
  else {
    console.log("--> Local ortam algılandı. 'firebase-key.json' okunuyor...");
    serviceAccount = require("./firebase-key.json");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log("--> Firebase bağlantısı BAŞARILI!");

} catch (error) {
  console.error("!!! FIREBASE HATASI !!!");
  console.error("Sebep: Anahtar bulunamadı veya format hatalı.");
  console.error("Detay:", error.message);
}

const db = admin.firestore();

/* ===================================================
   2. SUNUCU AYARLARI
   =================================================== */
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Statik dosyaları (HTML, CSS, JS) 'public' klasöründen sun
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

/* ===================================================
   3. SOCKET.IO İŞLEMLERİ (RAM + VERİTABANI)
   =================================================== */
// Anlık kimlerin online olduğunu RAM'de tutuyoruz (Hızlı olsun diye)
const onlineUsers = new Map(); 

io.on("connection", (socket) => {
  console.log("Yeni bağlantı: " + socket.id);

  let currentUser = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // --- A. KULLANICI KAYDI (REGISTER) ---
  socket.on("registerUser", async (userData) => {
    try {
      // Veritabanına ekle
      await db.collection("users").add({
        name: userData.name,
        surname: userData.surname,
        year: userData.year,
        email: userData.email,
        password: userData.password, // İleride şifrelemeyi unutma
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      socket.emit("registerResponse", { success: true, message: "Kayıt Başarılı!" });
    } catch (error) {
      console.error("Kayıt hatası:", error);
      socket.emit("registerResponse", { success: false, message: "Veritabanı hatası oluştu." });
    }
  });

  // --- B. GİRİŞ YAPMA (LOGIN) ---
  socket.on("setUsername", (username) => {
    if (!username) return;
    currentUser = username;

    // Online listesine ekle
    onlineUsers.set(username, true);

    // Herkese duyur
    io.emit("userStatus", { username, online: true });

    // Yeni girene aktif kullanıcıları gönder
    socket.emit("activeUsersList", Array.from(onlineUsers.keys()));

    // Odanın geçmiş mesajlarını yükle
    loadMessagesForRoom(currentRoom, socket);
  });

  // --- C. ODA DEĞİŞTİRME ---
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;

    // Yeni odanın mesajlarını yükle
    loadMessagesForRoom(currentRoom, socket);
  });

  // --- D. MESAJ GÖNDERME ---
  socket.on("sendMessage", async (data) => {
    if (!currentUser) return;

    // 1. Veritabanına Kaydet
    try {
      await db.collection("messages").add({
        room: currentRoom,
        username: currentUser,
        text: data.text,
        time: data.time,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Mesaj kaydetme hatası:", err);
    }

    // 2. Canlı Olarak Gönder
    io.to(currentRoom).emit("newMessage", {
      username: currentUser,
      text: data.text,
      time: data.time
    });
  });

  // --- E. ÇIKIŞ YAPMA ---
  socket.on("disconnect", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit("userStatus", { username: currentUser, online: false });
    }
  });
});

// YARDIMCI FONKSİYON: Geçmiş Mesajları Çek
async function loadMessagesForRoom(roomName, socket) {
  try {
    const snapshot = await db.collection("messages")
      .where("room", "==", roomName)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const history = [];
    snapshot.forEach(doc => {
      history.push(doc.data());
    });

    // Tersten geldiği için düzeltip gönder
    socket.emit("loadHistory", history.reverse());
  } catch (error) {
    console.error("Geçmiş yüklenirken hata:", error);
  }
}

/* ===================================================
   4. SUNUCUYU BAŞLAT
   =================================================== */
// Railway'in atadığı portu kullan, yoksa 3000
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});

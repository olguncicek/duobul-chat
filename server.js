const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");

/* ===================================================
   1. FIREBASE KURULUMU (FIXED VERSION)
   =================================================== */
let serviceAccount;

try {
  // A) RAILWAY ORTAMI (Değişken Varsa)
  if (process.env.FIREBASE_KEY) {
    console.log("--> Railway ortamı algılandı. Değişken okunuyor...");
    
    // 1. JSON verisini çevir
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

    // 2. [KRİTİK DÜZELTME] Private Key içindeki \n karakterlerini düzelt
    // Railway bazen satır atlamaları metin olarak algılar, bunu düzeltiyoruz:
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

  } 
  // B) LOCAL ORTAM (Dosya Varsa)
  else {
    console.log("--> Local ortam algılandı. Dosya okunuyor...");
    serviceAccount = require("./firebase-key.json");
  }

  // Firebase'i başlat
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log("--> Firebase bağlantısı BAŞARILI! (Yetkilendirme Tamam)");

} catch (error) {
  console.error("!!! FIREBASE BAĞLANTI HATASI !!!");
  console.error("Hata Detayı:", error.message);
  // Hata olsa bile sunucu çökmesin diye boş geçiyoruz ama veritabanı çalışmaz
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

// Statik dosyaları sun
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

/* ===================================================
   3. SOCKET.IO İŞLEMLERİ
   =================================================== */
const onlineUsers = new Map(); 

io.on("connection", (socket) => {
  // console.log("Bağlantı: " + socket.id); // Log kirliliği yapmasın

  let currentUser = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // --- KAYIT OLMA ---
  socket.on("registerUser", async (userData) => {
    console.log("Kayıt isteği geldi:", userData.email);
    try {
      await db.collection("users").add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      socket.emit("registerResponse", { success: true, message: "Kayıt Başarılı!" });
    } catch (error) {
      console.error("Firebase Yazma Hatası:", error);
      socket.emit("registerResponse", { success: false, message: "Sunucu Hatası: " + error.message });
    }
  });

  // --- GİRİŞ YAPMA ---
  socket.on("setUsername", (username) => {
    if (!username) return;
    currentUser = username;
    onlineUsers.set(username, true);
    io.emit("userStatus", { username, online: true });
    socket.emit("activeUsersList", Array.from(onlineUsers.keys()));
    loadMessagesForRoom(currentRoom, socket);
  });

  // --- ODA DEĞİŞTİRME ---
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;
    loadMessagesForRoom(currentRoom, socket);
  });

  // --- MESAJ GÖNDERME ---
  socket.on("sendMessage", async (data) => {
    if (!currentUser) return;
    
    // Veritabanına
    try {
      await db.collection("messages").add({
        room: currentRoom,
        username: currentUser,
        text: data.text,
        time: data.time,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { console.error("Mesaj hatası:", e); }

    // Ekrana
    io.to(currentRoom).emit("newMessage", {
      username: currentUser,
      text: data.text,
      time: data.time
    });
  });

  socket.on("disconnect", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit("userStatus", { username: currentUser, online: false });
    }
  });
});

async function loadMessagesForRoom(roomName, socket) {
  try {
    const snapshot = await db.collection("messages")
      .where("room", "==", roomName)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const history = [];
    snapshot.forEach(doc => history.push(doc.data()));
    socket.emit("loadHistory", history.reverse());
  } catch (error) {
    console.error("Geçmiş çekilemedi:", error.message);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});

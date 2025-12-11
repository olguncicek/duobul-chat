const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");

/* ===================================================
   1. FIREBASE BAĞLANTISI (BASİT & NET MOD)
   =================================================== */
let db;
let isFirebaseReady = false;

console.log("--------------------------------------------");
console.log("--- FIREBASE BAĞLANTI KONTROLÜ BAŞLIYOR ---");
console.log("--------------------------------------------");

try {
  // 1. Değişkenleri Kontrol Et
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) throw new Error("EKSİK DEĞİŞKEN: FIREBASE_PROJECT_ID bulunamadı!");
  if (!clientEmail) throw new Error("EKSİK DEĞİŞKEN: FIREBASE_CLIENT_EMAIL bulunamadı!");
  if (!privateKey) throw new Error("EKSİK DEĞİŞKEN: FIREBASE_PRIVATE_KEY bulunamadı!");

  console.log("--> Tüm değişkenler mevcut. Anahtar formatlanıyor...");

  // 2. Private Key Formatını Düzelt (Satır başlarını ayarla)
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  // 3. Bağlantıyı Başlat
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: formattedKey
    })
  });

  db = admin.firestore();
  isFirebaseReady = true;
  console.log("--> ✅ BAŞARILI: Firebase Veritabanına Bağlanıldı!");

} catch (error) {
  console.error("\n!!! KRİTİK HATA: FIREBASE BAĞLANAMADI !!!");
  console.error("SEBEP:", error.message);
  console.error("--------------------------------------------\n");
}

/* ===================================================
   2. SUNUCU AYARLARI
   =================================================== */
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

/* ===================================================
   3. SOCKET.IO İŞLEMLERİ
   =================================================== */
const onlineUsers = new Map(); 

io.on("connection", (socket) => {
  let currentUser = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // --- KAYIT OLMA ---
  socket.on("registerUser", async (userData) => {
    // Veritabanı bağlantısı yoksa kullanıcıyı uyar
    if (!isFirebaseReady) {
      console.error("Kayıt denemesi başarısız: Veritabanı yok.");
      socket.emit("registerResponse", { 
        success: false, 
        message: "Sunucu Hatası: Veritabanı bağlantısı kurulamadı. Lütfen yöneticiyle iletişime geçin." 
      });
      return;
    }

    try {
      await db.collection("users").add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      socket.emit("registerResponse", { success: true, message: "Kayıt Başarılı!" });
    } catch (error) {
      console.error("Kayıt Hatası:", error);
      socket.emit("registerResponse", { success: false, message: "Hata: " + error.message });
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

  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;
    loadMessagesForRoom(currentRoom, socket);
  });

  socket.on("sendMessage", async (data) => {
    if (!currentUser) return;
    
    // Sadece bağlantı varsa kaydet
    if (isFirebaseReady) {
      try {
        await db.collection("messages").add({
          room: currentRoom,
          username: currentUser,
          text: data.text,
          time: data.time,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) { console.error("Mesaj Hatası:", e); }
    }

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
  if (!isFirebaseReady) return;
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
    console.error("Geçmiş yüklenemedi:", error.message);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
});

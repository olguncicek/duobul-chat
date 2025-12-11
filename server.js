const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");

/* ===================================================
   1. FIREBASE BAĞLANTISI (KESİN ÇÖZÜM MODU)
   =================================================== */
let serviceAccount;

try {
  console.log("--- BAĞLANTI KONTROLÜ ---");

  // A) RAILWAY ORTAMI: Değişkenler Var mı?
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log("--> Railway ortamı algılandı. Değişkenler okunuyor...");

    // Private Key içindeki \n karakterlerini onaran SİHİRLİ kod:
    const privateKeyFixed = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKeyFixed
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log("--> Firebase Bağlantısı: BAŞARILI! ✅");
  } 
  
  // B) LOCAL ORTAM: Dosya Var mı?
  else {
    console.log("--> Local ortam algılandı. Dosyadan okunuyor...");
    serviceAccount = require("./firebase-key.json");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("--> Local Bağlantı: BAŞARILI! ✅");
  }

} catch (error) {
  console.error("!!! FIREBASE HATASI !!!");
  console.error("Detay:", error.message);
  console.error("İpucu: Railway Variables kısmında private_key eksik veya tırnak hatası var.");
}

const db = admin.firestore();

/* ===================================================
   2. SUNUCU AYARLARI
   =================================================== */
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Statik dosyalar
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/duo.html");
});

/* ===================================================
   3. SOCKET.IO ve VERİTABANI İŞLEMLERİ
   =================================================== */
const onlineUsers = new Map(); 

io.on("connection", (socket) => {
  let currentUser = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // --- KAYIT OLMA ---
  socket.on("registerUser", async (userData) => {
    console.log(`Kayıt İsteği: ${userData.email}`);
    try {
      await db.collection("users").add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      socket.emit("registerResponse", { success: true, message: "Kayıt Başarılı!" });
    } catch (error) {
      console.error("Kayıt Hatası:", error);
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

    // Veritabanına Yaz
    try {
      await db.collection("messages").add({
        room: currentRoom,
        username: currentUser,
        text: data.text,
        time: data.time,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { console.error("Mesaj Hatası:", e); }

    // Ekrana Yansıt
    io.to(currentRoom).emit("newMessage", {
      username: currentUser,
      text: data.text,
      time: data.time
    });
  });

  // --- ÇIKIŞ ---
  socket.on("disconnect", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit("userStatus", { username: currentUser, online: false });
    }
  });
});

// Geçmiş Mesajları Getir
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
    console.error("Geçmiş yüklenemedi:", error.message);
  }
}

// Port Ayarı
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
});

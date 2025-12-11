const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");

/* ===================================================
   1. FIREBASE BAĞLANTISI (DEBUG MODU)
   =================================================== */
let serviceAccount;
let isFirebaseReady = false; // Bağlantı durumunu takip edelim

console.log("\n>>> SUNUCU BAŞLATILIYOR...");
console.log(">>> Firebase bağlantı kontrolü yapılıyor...");

try {
  // A) RAILWAY ORTAMI KONTROLÜ
  // Önce değişkenin var olup olmadığına bakalım
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log("--> Railway Ortam Değişkeni BULUNDU.");
    
    // Değişkenin içeriğini kontrol edelim (Güvenlik için sadece uzunluğunu yazıyoruz)
    const pk = process.env.FIREBASE_PRIVATE_KEY;
    console.log(`--> Private Key Uzunluğu: ${pk.length} karakter.`);
    
    if (!pk.includes("BEGIN PRIVATE KEY")) {
      throw new Error("HATA: Private Key 'BEGIN PRIVATE KEY' ile başlamıyor! Kopyalarken hata yapılmış.");
    }

    // \n Karakterlerini düzeltelim
    const privateKeyFixed = pk.replace(/\\n/g, '\n');

    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKeyFixed
    };

    // Diğer değişkenler eksik mi?
    if (!serviceAccount.projectId) throw new Error("HATA: FIREBASE_PROJECT_ID değişkeni eksik!");
    if (!serviceAccount.clientEmail) throw new Error("HATA: FIREBASE_CLIENT_EMAIL değişkeni eksik!");

    console.log("--> Değişkenler doğrulandı, Firebase başlatılıyor...");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    isFirebaseReady = true;
    console.log("--> ✅ RAILWAY ÜZERİNDE FIREBASE BAŞARIYLA BAŞLATILDI!");
  } 
  
  // B) LOCAL ORTAM KONTROLÜ
  else {
    console.log("--> Railway değişkeni yok. Yerel dosya aranıyor...");
    try {
      serviceAccount = require("./firebase-key.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isFirebaseReady = true;
      console.log("--> ✅ YEREL DOSYA İLE FIREBASE BAŞLATILDI!");
    } catch (err) {
      console.log("--> ❌ Yerel dosya da bulunamadı.");
    }
  }

} catch (error) {
  console.error("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! FIREBASE KURULUM HATASI !!!");
  console.error("HATA MESAJI:", error.message);
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
}

// EĞER FIREBASE BAŞLAMADIYSA, db OLUŞTURMA!
let db;
if (isFirebaseReady) {
  db = admin.firestore();
} else {
  console.error("!!! DİKKAT: Firebase başlatılamadığı için Veritabanı devre dışı !!!");
  // Hata almamak için db'yi boş geçiyoruz ama kayıt çalışmaz
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
    if (!isFirebaseReady) {
      socket.emit("registerResponse", { success: false, message: "Sunucu Hatası: Veritabanı bağlantısı yok!" });
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
    // Veritabanı varsa kaydet, yoksa sadece gönder
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
  if (!isFirebaseReady) return; // DB yoksa geçmiş yok
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

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");

/* ===================================================
   1. FIREBASE KURULUMU (DEBUG MODU)
   =================================================== */
let serviceAccount;

try {
  console.log("--- FIREBASE BAĞLANTI KONTROLÜ BAŞLIYOR ---");

  if (process.env.FIREBASE_KEY) {
    console.log("1. Railway ortamı algılandı.");
    
    // Değişkeni oku
    const rawKey = process.env.FIREBASE_KEY;
    console.log(`2. Okunan veri uzunluğu: ${rawKey.length} karakter.`);

    // JSON'a çevir
    serviceAccount = JSON.parse(rawKey);
    console.log("3. JSON Parse işlemi: BAŞARILI.");

    // Kontroller
    if (!serviceAccount.project_id) console.error("!!! HATA: project_id bulunamadı!");
    else console.log(`4. Proje ID: ${serviceAccount.project_id}`);

    if (!serviceAccount.private_key) console.error("!!! HATA: private_key bulunamadı!");
    else {
      console.log("5. Private Key mevcut. Format düzeltiliyor...");
      
      // --- KRİTİK DÜZELTME ---
      // Private key içindeki "\\n" karakterlerini gerçek "\n" (Enter) ile değiştiriyoruz.
      const oldKey = serviceAccount.private_key;
      const newKey = oldKey.replace(/\\n/g, '\n');
      
      serviceAccount.private_key = newKey;

      // Düzeltme kontrolü (Sadece ilk 10 karakteri yazdırıyoruz, güvenlik için)
      console.log(`6. Key Başlangıcı: ${newKey.substring(0, 25)}...`);
      console.log(`7. Key İçinde '\\n' var mı?: ${newKey.includes("\\n") ? "EVET (HATA SEBEBİ BU)" : "HAYIR (DÜZELTİLDİ)"}`);
    }

  } else {
    console.log("1. Local ortam algılandı. Dosyadan okunuyor.");
    serviceAccount = require("./firebase-key.json");
  }

  // Firebase'i başlat
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log("--- FIREBASE BAĞLANTISI TAMAMLANDI ---");

} catch (error) {
  console.error("!!! KRİTİK HATA !!!");
  console.error("Hata Mesajı:", error.message);
  // Eğer JSON.parse hatası varsa bunu görürüz
}

const db = admin.firestore();

/* ===================================================
   2. SUNUCU AYARLARI
   =================================================== */
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => res.sendFile(__dirname + "/public/duo.html"));

/* ===================================================
   3. SOCKET.IO İŞLEMLERİ
   =================================================== */
const onlineUsers = new Map(); 

io.on("connection", (socket) => {
  let currentUser = null;
  let currentRoom = "genel"; 
  socket.join("genel");

  // KAYIT OLMA
  socket.on("registerUser", async (userData) => {
    console.log(`Kayıt isteği: ${userData.email}`);
    try {
      await db.collection("users").add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log("Kayıt veritabanına yazıldı.");
      socket.emit("registerResponse", { success: true, message: "Kayıt Başarılı!" });
    } catch (error) {
      console.error("VERİTABANI YAZMA HATASI DETAYI:");
      console.error(error); // Burası loglara asıl sebebi basacak
      socket.emit("registerResponse", { success: false, message: "Sunucu Hatası: " + error.message });
    }
  });

  // GİRİŞ YAPMA
  socket.on("setUsername", (username) => {
    if (!username) return;
    currentUser = username;
    onlineUsers.set(username, true);
    io.emit("userStatus", { username, online: true });
    socket.emit("activeUsersList", Array.from(onlineUsers.keys()));
    loadMessagesForRoom(currentRoom, socket);
  });

  // ODA DEĞİŞTİRME
  socket.on("joinRoom", (roomName) => {
    socket.leave(currentRoom);
    socket.join(roomName);
    currentRoom = roomName;
    loadMessagesForRoom(currentRoom, socket);
  });

  // MESAJ GÖNDERME
  socket.on("sendMessage", async (data) => {
    if (!currentUser) return;
    try {
      await db.collection("messages").add({
        room: currentRoom,
        username: currentUser,
        text: data.text,
        time: data.time,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { console.error("Mesaj hatası:", e); }

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

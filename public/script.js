const socket = io();

// HTML Elementleri
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const chatContainer = document.getElementById("chatContainer");
const usernameInput = document.getElementById("usernameInput");
const regEmail = document.getElementById("regEmail");

let myUsername = "";
let currentRoom = "genel";

// --- GİRİŞ YAPMA ---
document.getElementById("loginBtn").onclick = () => {
    const name = usernameInput.value.trim();
    if (!name) return alert("Lütfen bir kullanıcı adı girin!");
    myUsername = name;
    socket.emit("setUsername", myUsername);
    loginModal.classList.add("hidden");
    chatContainer.classList.remove("blur");
};

// --- KAYIT SAYFASI GEÇİŞLERİ ---
document.getElementById("registerBtn").onclick = () => {
    loginModal.classList.add("hidden");
    registerModal.classList.remove("hidden");
};

document.getElementById("backToLoginBtn").onclick = () => {
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
};

// --- KAYIT OLMA (E-POSTA DOĞRULAMALI) ---
document.getElementById("doRegisterBtn").onclick = () => {
    const email = regEmail.value.trim();
    const name = document.getElementById("regName").value.trim();
    const pass = document.getElementById("regPass").value.trim();

    if (!name || !email || !pass) return alert("Lütfen boş alan bırakmayın!");

    // E-posta Regex Kontrolü (@ ve .uzantı şartı)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return alert("Geçersiz e-posta! Lütfen @gmail.com veya @outlook.com gibi geçerli bir adres girin.");
    }

    // Sunucuya gönder
    socket.emit("registerUser", { name, email, pass });
};

socket.on("registerResponse", (res) => {
    if (res.success) {
        alert("Kayıt Başarılı! Şimdi giriş yapabilirsin.");
        registerModal.classList.add("hidden");
        loginModal.classList.remove("hidden");
    }
});

// --- MESAJLAŞMA ---
document.getElementById("sendBtn").onclick = () => {
    const text = document.getElementById("msgInput").value.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    socket.emit("sendMessage", { text, time });
    document.getElementById("msgInput").value = "";
};

socket.on("newMessage", (msg) => {
    const li = document.createElement("li");
    li.className = "message";
    li.innerHTML = `<span class="sender">${msg.username} <small>${msg.time}</small></span><p>${msg.text}</p>`;
    document.querySelector(".messages").appendChild(li);
    document.querySelector(".messages").scrollTop = document.querySelector(".messages").scrollHeight;
});

socket.on("loadHistory", (msgs) => {
    document.querySelector(".messages").innerHTML = "";
    msgs.forEach(msg => {
        const li = document.createElement("li");
        li.className = "message";
        li.innerHTML = `<span class="sender">${msg.username} <small>${msg.time}</small></span><p>${msg.text}</p>`;
        document.querySelector(".messages").appendChild(li);
    });
});

const socket = io();

let username = "";
let currentRoom = "genel";

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("usernameInput");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

// --- GİRİŞ ---
loginBtn.onclick = () => {
    username = usernameInput.value.trim();

    if (!username) return alert("Kullanıcı adı boş olamaz!");

    socket.emit("setUsername", username);

    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
};

// --- ODA DEĞİŞTİRME ---
document.querySelectorAll(".room").forEach(btn => {
    btn.addEventListener("click", () => {
        currentRoom = btn.dataset.room;
        messages.innerHTML = "";
        socket.emit("changeRoom", currentRoom);
    });
});

// --- MESAJ GÖNDER ---
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const msg = messageInput.value.trim();
    if (!msg) return;

    socket.emit("chatMessage", {
        msg,
        time: getTime()
    });

    messageInput.value = "";
}

// SAAT
function getTime() {
    const d = new Date();
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

// --- MESAJ AL ---
socket.on("chatMessage", data => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${data.user}</b>: ${data.msg} <span class="time">${data.time}</span>`;
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
});

// --- DURUM ---
socket.on("userStatus", data => {
    const li = document.createElement("li");
    li.innerHTML = `🔔 <i>${data.user}</i> ${data.status === "online" ? "sohbete katıldı" : "çevrimdışı oldu"}`;
    messages.appendChild(li);
});

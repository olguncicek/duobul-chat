const socket = io();

// HTML elemanları
const usernameInput = document.getElementById("usernameInput");
const saveUsernameBtn = document.getElementById("saveUsername");
const usernameInfo = document.getElementById("usernameInfo");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");

let currentUsername = localStorage.getItem("username") || "";

// Sayfa açılınca kayıtlı isim varsa göster
if (currentUsername) {
    usernameInput.value = currentUsername;
    usernameInfo.textContent = `Kullanıcı adın: ${currentUsername}`;
}

// ----- Kullanıcı adı kaydetme -----
function saveUsername() {
    const name = usernameInput.value.trim();
    if (!name) return;

    currentUsername = name;
    localStorage.setItem("username", currentUsername);
    usernameInfo.textContent = `Kullanıcı adın: ${currentUsername}`;
}

saveUsernameBtn.addEventListener("click", saveUsername);
usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveUsername();
});

// ----- Mesaj gönderme -----
function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    const data = {
        user: currentUsername || "Misafir",
        text: text,
        time: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    socket.emit("sendMessage", data);
    msgInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// ----- Sunucudan gelen mesajı ekrana bas -----
socket.on("newMessage", (data) => {
    addMessage(data);
});

function addMessage(data) {
    const li = document.createElement("li");
    li.classList.add("message");

    // bu mesajı atan sensen sağ tarafa hizala
    if (data.user === (currentUsername || "Misafir")) {
        li.classList.add("mine");
    }

    li.innerHTML = `
        <span class="sender">${escapeHtml(data.user)}</span>
        <p class="text">${escapeHtml(data.text)}</p>
        <span class="date">${data.time}</span>
    `;

    messagesUl.appendChild(li);
    messagesUl.scrollTop = messagesUl.scrollHeight;
}

// basit XSS koruması
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

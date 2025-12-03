const socket = io();

let username = "";
let currentRoom = "valorant";

// Giriş ekranı -----------------
document.getElementById("loginBtn").onclick = () => {
    const name = document.getElementById("loginName").value.trim();
    if (!name) return;

    username = name;

    document.getElementById("login-screen").style.display = "none";
    document.querySelector(".chat-container").style.display = "flex";

    socket.emit("joinRoom", { user: username, room: currentRoom });
};

// ELEMENTLER -----------------
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesList = document.getElementById("messages");

// MESAJ GÖNDER -----------------
sendBtn.onclick = sendMessage;

input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    socket.emit("chatMessage", {
        user: username,
        msg: text,
        time: getTime(),
        room: currentRoom
    });

    input.value = "";
}

function getTime() {
    const now = new Date();
    return now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// MESAJ AL -----------------
socket.on("chatMessage", data => {
    if (data.room !== currentRoom) return;

    const li = document.createElement("li");
    li.classList.add("message");

    li.classList.add(data.user === username ? "you" : "other");
    li.innerHTML = `
        <b>${data.user}</b>: ${data.msg}
        <span class="time">${data.time}</span>
    `;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
});

// ODA DEĞİŞTİR -----------------
document.querySelectorAll(".room").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".room.active").classList.remove("active");
        btn.classList.add("active");

        currentRoom = btn.dataset.room;
        messagesList.innerHTML = "";

        socket.emit("joinRoom", { user: username, room: currentRoom });
    });
});

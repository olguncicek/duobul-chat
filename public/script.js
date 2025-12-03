const socket = io();

let username = "";
let currentRoom = "genel";

const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");

const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");

const messagesList = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");


// GİRİŞ YAP
loginBtn.onclick = () => {
    username = usernameInput.value.trim();
    if (!username) return;

    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    joinRoom(currentRoom);
};

function joinRoom(room) {
    currentRoom = room;
    messagesList.innerHTML = "";

    socket.emit("joinRoom", { username, room });
}

// ODA DEĞİŞTİRME
document.querySelectorAll(".room-menu button").forEach(btn => {
    btn.onclick = () => {
        joinRoom(btn.dataset.room);
    };
});

// MESAJ GÖNDERME
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const msg = messageInput.value.trim();
    if (!msg) return;

    socket.emit("chatMessage", {
        room: currentRoom,
        user: username,
        msg
    });

    messageInput.value = "";
}

// MESAJ ALMA
socket.on("chatMessage", data => {
    addMessage(`<b>${data.user}</b>: ${data.msg}`, data.time);
});

socket.on("systemMessage", data => {
    addMessage(`<i>${data.msg}</i>`, data.time);
});

function addMessage(html, time) {
    const li = document.createElement("li");
    li.innerHTML = `${html} <span class="time">${time}</span>`;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
}

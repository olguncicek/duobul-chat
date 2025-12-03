const socket = io();

let username = "";
let currentRoom = "Genel";

/* GİRİŞ YAP */
document.getElementById("loginBtn").onclick = () => {
    const name = document.getElementById("usernameInput").value.trim();
    if (!name) return;

    username = name;

    // login ekranını gizle, sohbete geç
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("chat-container").classList.remove("hidden");

    joinRoom(currentRoom);
};

// ODA SEÇİMİ
document.querySelectorAll(".room").forEach(room => {
    room.onclick = () => {
        document.querySelectorAll(".room").forEach(r => r.classList.remove("active"));
        room.classList.add("active");

        currentRoom = room.dataset.room;
        joinRoom(currentRoom);
    };
});

// ODAYA GİR
function joinRoom(room) {
    socket.emit("joinRoom", { username, room });
    document.getElementById("roomTitle").textContent = room + " Sohbeti";
    document.getElementById("messages").innerHTML = "";
}

/* MESAJ GÖNDER */
document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("messageInput").addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const msg = document.getElementById("messageInput").value.trim();
    if (!msg) return;

    socket.emit("chatMessage", {
        user: username,
        msg,
        room: currentRoom,
        time: getTime()
    });

    document.getElementById("messageInput").value = "";
}

function getTime() {
    return new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* MESAJ AL */
socket.on("chatMessage", data => {
    if (data.room !== currentRoom) return;

    const li = document.createElement("li");
    li.classList.add("message");
    if (data.user === username) li.classList.add("you");

    li.innerHTML = `
        <b>${data.user}</b>: ${data.msg}
        <span class="time">${data.time}</span>
    `;

    document.getElementById("messages").appendChild(li);
});

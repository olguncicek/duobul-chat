const socket = io();

let username = "";

// İlk girişte kullanıcı adı sor
while (!username) {
    username = prompt("Kullanıcı adınız:");
}

const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesList = document.getElementById("messages");

sendBtn.onclick = sendMessage;
input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

// MESAJ GÖNDER
function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    socket.emit("chatMessage", {
        user: username,
        msg: text,
        time: getTime()
    });

    input.value = "";
}

// SAAT DOĞRU FORMAT
function getTime() {
    const now = new Date();
    return now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// MESAJ ALMA
socket.on("chatMessage", data => {
    const li = document.createElement("li");
    li.classList.add("message");

    if (data.user === username) li.classList.add("you");
    else li.classList.add("other");

    li.innerHTML = `
        <b>${data.user}</b>: ${data.msg}
        <span class="time">${data.time}</span>
    `;

    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
});

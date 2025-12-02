const socket = io();

let username = "";

function saveUsername() {
    const input = document.getElementById("usernameInput");
    if (input.value.trim() === "") return;

    username = input.value.trim();
    document.getElementById("usernamePopup").style.display = "none";
}

const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    if (!username) return alert("Lütfen önce isminizi girin.");

    const msg = input.value.trim();
    if (!msg) return;

    const data = {
        name: username,
        text: msg,
        time: new Date().toLocaleTimeString().slice(0,5)
    };

    socket.emit("sendMessage", data);
    input.value = "";
}

socket.on("newMessage", (data) => {
    addMessage(data);
});

function addMessage(data) {
    const li = document.createElement("li");

    if (data.name === username) li.classList.add("message", "mine");
    else li.classList.add("message");

    li.innerHTML = `
        <div class="name">${data.name}</div>
        <p class="text">${data.text}</p>
        <div class="date">${data.time}</div>
    `;

    messagesUl.appendChild(li);
    messagesUl.scrollTop = messagesUl.scrollHeight;
}

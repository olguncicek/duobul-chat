const socket = io();

const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;

    socket.emit("sendMessage", msg);
    input.value = "";
}

socket.on("newMessage", (msg) => {
    addMessage(msg);
});

function addMessage(msg) {
    const li = document.createElement("li");
    li.classList.add("message");
    li.innerHTML = `
        <p class="text">${msg}</p>
        <span class="date">${new Date().toLocaleTimeString().slice(0,5)}</span>
    `;
    messagesUl.appendChild(li);
    messagesUl.scrollTop = messagesUl.scrollHeight;
}

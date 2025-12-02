const socket = io();

let username = "";

const popup = document.getElementById("popup");
const saveUsername = document.getElementById("saveUsername");
const usernameInput = document.getElementById("usernameInput");

const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");

saveUsername.onclick = () => {
    username = usernameInput.value.trim();
    if (!username) return;

    popup.style.display = "none";
    chatBox.style.display = "flex";

    socket.emit("setUsername", username);
};

sendBtn.onclick = sendMessage;
msgInput.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;
    socket.emit("sendMessage", text);
    msgInput.value = "";
}

socket.on("newMessage", (msg) => {
    addMessage(msg);
});

function addMessage(msg) {
    const li = document.createElement("li");
    li.classList.add("message");

    let statusClass = msg.online ? "status-online" : "status-offline";

    li.innerHTML = `
        <div class="user">
            <span class="${statusClass}"></span>
            ${msg.user}
        </div>
        <p class="text">${msg.text}</p>
        <div class="date">${msg.time}</div>
    `;

    if (msg.user === username) li.classList.add("mine");

    messagesUl.appendChild(li);
    messagesUl.scrollTop = messagesUl.scrollHeight;
}

socket.on("onlineUsers", (users) => {
    // İstersen sağa kullanıcı listesi ekleyebiliriz
});

socket.on("userDisconnected", (info) => {
    addMessage({
        user: info.user,
        text: "çevrim dışı oldu",
        time: new Date().toLocaleTimeString().slice(0, 5),
        online: false
    });
});

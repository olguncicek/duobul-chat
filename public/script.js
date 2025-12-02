const socket = io();

let username = "";

const usernameBox = document.getElementById("usernameBox");
const chatBox = document.getElementById("chatBox");

const usernameInput = document.getElementById("usernameInput");
const saveUsername = document.getElementById("saveUsername");

const messagesUl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");


saveUsername.addEventListener("click", () => {
    if (usernameInput.value.trim() === "") return;
    username = usernameInput.value;

    usernameBox.style.display = "none";
    chatBox.style.display = "block";
});


sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    if (msgInput.value.trim() === "") return;

   socket.emit("sendMessage", {
    user: username,
    msg: msg,
    time: Date.now()
});


    msgInput.value = "";
}


socket.on("newMessage", (data) => {
    const li = document.createElement("li");

    li.classList.add("msg");
    if (data.user === username) li.classList.add("mine");

    li.innerHTML = `
        <div class="user">${data.user}</div>
        <div class="text">${data.text}</div>
    `;

    messagesUl.appendChild(li);
    messagesUl.scrollTop = messagesUl.scrollHeight;
});

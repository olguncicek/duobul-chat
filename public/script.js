const socket = io();

let username = localStorage.getItem("username");

const usernameModal = document.getElementById("usernameModal");
const usernameInput = document.getElementById("usernameInput");
const saveUsername = document.getElementById("saveUsername");

if (!username) {
    usernameModal.style.display = "flex";
} else {
    usernameModal.style.display = "none";
}

saveUsername.addEventListener("click", () => {
    const name = usernameInput.value.trim();
    if (name.length < 2) return alert("Kullanıcı adı çok kısa!");

    username = name;
    localStorage.setItem("username", username);

    usernameModal.style.display = "none";
});

const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const msg = input.value.trim();
    if (!msg || !username) return;

    socket.emit("sendMessage", {
        user: username,
        text: msg
    });

    input.value = "";
}

socket.on("newMessage", (data) => {
    addMessage(data);
});

function addMessage(data) {
    const li = document.createElement("li");
    li.classList.add("message");

    li.innerHTML = `
        <p class="text"><strong>${data.user}:</strong> ${data.text}</p>
        <span class="date">${new Date().toLocaleTimeString().slice(0,5)}</span>
    `;

    messagesUl.appendChild(li);
    messagesUl.scrollTop = messagesUl.scrollHeight;
}

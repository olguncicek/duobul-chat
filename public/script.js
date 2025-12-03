const socket = io();

let username = "";

// POPUP ELEMENTLERİ
const popup = document.getElementById("usernamePopup");
const usernameInput = document.getElementById("usernameInput");
const saveUsername = document.getElementById("saveUsername");

// POPUP AÇIK KALSIN, KULLANICI ADI GİRİLMEDEN SOHBETE GİRİŞ YOK
saveUsername.onclick = () => {
    const val = usernameInput.value.trim();
    if (!val) return;
    username = val;

    popup.style.display = "none";
};

// MESAJ ELEMENTLERİ
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesList = document.getElementById("messages");

// GÖNDERME
sendBtn.onclick = sendMessage;
input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    if (!username) return; // kullanıcı adını girmeden gönderemez

    const text = input.value.trim();
    if (!text) return;

    socket.emit("chatMessage", {
        user: username,
        msg: text,
        time: getTime()
    });

    input.value = "";
}

// DOĞRU SAAT FORMAT (TÜRKİYE)
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

    // senin mesajın mı?
    if (data.user === username) li.classList.add("you");
    else li.classList.add("other");

    li.innerHTML = `
        <b>${data.user}</b>: ${data.msg}
        <span class="time">${data.time}</span>
    `;

    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
});

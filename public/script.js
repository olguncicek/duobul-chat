let username = "";

// Kullanıcı adını popup ile sor
function askUsername() {
  while (!username) {
    const value = prompt("Kullanıcı adınızı girin:");
    if (!value) {
      alert("Kullanıcı adı boş olamaz.");
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      alert("Kullanıcı adı boş olamaz.");
      continue;
    }
    username = trimmed;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // sayfa yüklenince kullanıcı adını sor
  askUsername();

  const socket = io();

  const input = document.getElementById("msgInput");
  const sendBtn = document.getElementById("sendBtn");
  const messagesUl = document.querySelector(".messages");

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const data = {
      user: username,
      text: text,
      time: new Date().toLocaleTimeString().slice(0, 5)
    };

    // sunucuya mesajı gönder
    socket.emit("sendMessage", data);

    input.value = "";
  }

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // sunucudan yeni mesaj geldiğinde ekrana bas
  socket.on("newMessage", (data) => {
    addMessage(data);
  });

  function addMessage(data) {
    const li = document.createElement("li");
    li.classList.add("message");

    // kendi mesajımızsa sağ tarafa hizala
    if (data.user === username) {
      li.classList.add("mine");
    }

    li.innerHTML = `
      <span class="sender">${data.user}</span>
      <p class="text">${data.text}</p>
      <span class="date">${data.time}</span>
    `;

    messagesUl.appendChild(li);
    // her yeni mesajda listeyi en alta kaydır
    messagesUl.scrollTop = messagesUl.scrollHeight;
  }
});

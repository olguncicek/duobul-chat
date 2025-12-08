const socket = io();

// HTML Elementleri
const loginModal = document.getElementById("loginModal");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput"); // YENİ
const loginBtn = document.getElementById("loginBtn");
const chatContainer = document.getElementById("chatContainer");

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesUl = document.querySelector(".messages");
const lobbyBtns = document.querySelectorAll(".lobby-btn");

let myUsername = "";
let currentRoom = "genel"; 
const userStatusMap = {}; // Kim online, kim offline haritası

/* ---------- 1. GİRİŞ İŞLEMLERİ (GÜNCELLENDİ) ---------- */
function doLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {

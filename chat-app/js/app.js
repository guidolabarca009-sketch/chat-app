// ----- UTENTI -----
let users = JSON.parse(localStorage.getItem("users")) || [];
let messages = JSON.parse(localStorage.getItem("messages")) || [];
let currentUser = localStorage.getItem("currentUser");

// ----- UI -----
const loginContainer = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chat-box");
const welcome = document.getElementById("welcome");

// ----- TAB SWITCH -----
document.getElementById("loginTab").onclick = () => switchTab("login");
document.getElementById("registerTab").onclick = () => switchTab("register");

function switchTab(tab) {
    document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
    document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
    document.getElementById("loginTab").classList.toggle("active", tab === "login");
    document.getElementById("registerTab").classList.toggle("active", tab === "register");
}

// ----- REGISTER -----
function register() {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    if (!username || !password) {
        alert("Compila tutti i campi");
        return;
    }

    if (users.find(u => u.username === username)) {
        alert("Username già esistente");
        return;
    }

    users.push({ username, password });
    localStorage.setItem("users", JSON.stringify(users));
    alert("Registrazione completata!");
    switchTab("login");
}

// ----- LOGIN -----
function login() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        alert("Credenziali errate");
        return;
    }

    currentUser = username;
    localStorage.setItem("currentUser", currentUser);
    showChat();
}

// ----- LOGOUT -----
function logout() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    chatContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");
}

// ----- CHAT -----
function showChat() {
    loginContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    welcome.innerText = "Ciao, " + currentUser;
    renderMessages();
}

function sendMessage() {
    const input = document.getElementById("message-input");
    const text = input.value.trim();

    if (text === "") return;

    const msg = {
        user: currentUser,
        text: text,
        time: new Date().toLocaleTimeString()
    };

    messages.push(msg);
    localStorage.setItem("messages", JSON.stringify(messages));
    input.value = "";
    renderMessages();
}

function renderMessages() {
    chatBox.innerHTML = "";

    messages.forEach(m => {
        const div = document.createElement("div");
        div.className = "message";
        div.innerHTML = `<span>${m.user}</span> [${m.time}]: ${m.text}`;
        chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----- AUTO LOGIN -----
if (currentUser) {
    showChat();
}

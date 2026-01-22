// ===== CONFIGURAZIONE =====
const CONFIG = {
    STORAGE_KEYS: {
        USERS: "chat_users",
        MESSAGES: "chat_messages",
        CURRENT_USER: "chat_currentUser",
        THEME: "chat_theme"
    },
    MAX_MESSAGE_LENGTH: 500,
    MIN_PASSWORD_LENGTH: 6
};

// ===== STORAGE MANAGER =====
const Storage = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    },
    
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    
    remove(key) {
        localStorage.removeItem(key);
    }
};

// ===== STATE =====
const state = {
    users: Storage.get(CONFIG.STORAGE_KEYS.USERS) || [],
    messages: Storage.get(CONFIG.STORAGE_KEYS.MESSAGES) || [],
    currentUser: Storage.get(CONFIG.STORAGE_KEYS.CURRENT_USER) || null,
    isTyping: false
};

// ===== DOM ELEMENTS =====
const DOM = {
    loginContainer: document.getElementById("login-container"),
    chatContainer: document.getElementById("chat-container"),
    chatBox: document.getElementById("chat-box"),
    welcome: document.getElementById("welcome"),
    messageInput: document.getElementById("message-input"),
    loginForm: document.getElementById("login-form"),
    registerForm: document.getElementById("register-form"),
    loginTab: document.getElementById("loginTab"),
    registerTab: document.getElementById("registerTab"),
    toastContainer: null
};

// ===== TOAST NOTIFICATIONS (invece di alert) =====
const Toast = {
    init() {
        DOM.toastContainer = document.createElement("div");
        DOM.toastContainer.id = "toast-container";
        DOM.toastContainer.className = "toast-container";
        document.body.appendChild(DOM.toastContainer);
    },
    
    show(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: "✅",
            error: "❌", 
            info: "ℹ️",
            warning: "⚠️"
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
        `;
        
        DOM.toastContainer.appendChild(toast);
        
        // Animazione entrata
        setTimeout(() => toast.classList.add("show"), 10);
        
        // Rimozione automatica
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ===== VALIDAZIONE =====
const Validator = {
    username(value) {
        if (!value || value.trim().length < 3) {
            return { valid: false, message: "Username minimo 3 caratteri" };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            return { valid: false, message: "Solo lettere, numeri e underscore" };
        }
        return { valid: true };
    },
    
    password(value) {
        if (!value || value.length < CONFIG.MIN_PASSWORD_LENGTH) {
            return { 
                valid: false, 
                message: `Password minimo ${CONFIG.MIN_PASSWORD_LENGTH} caratteri` 
            };
        }
        return { valid: true };
    },
    
    message(value) {
        if (!value || value.trim() === "") {
            return { valid: false };
        }
        if (value.length > CONFIG.MAX_MESSAGE_LENGTH) {
            return { 
                valid: false, 
                message: `Massimo ${CONFIG.MAX_MESSAGE_LENGTH} caratteri` 
            };
        }
        return { valid: true };
    }
};

// ===== UTILITÀ =====
const Utils = {
    // Hash semplice per password (in produzione usa bcrypt lato server!)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },
    
    // Formatta timestamp relativo
    formatTime(timestamp) {
        const now = new Date();
        const msgDate = new Date(timestamp);
        const diffMs = now - msgDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return "Adesso";
        if (diffMins < 60) return `${diffMins} min fa`;
        if (diffHours < 24) return `${diffHours} ore fa`;
        
        return msgDate.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    },
    
    // Escape HTML per sicurezza XSS
    escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    },
    
    // Debounce per performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ===== AUTH MODULE =====
const Auth = {
    register() {
        const username = document.getElementById("register-username").value.trim();
        const password = document.getElementById("register-password").value;
        const confirmPassword = document.getElementById("register-confirm")?.value;
        
        // Validazione username
        const usernameCheck = Validator.username(username);
        if (!usernameCheck.valid) {
            Toast.show(usernameCheck.message, "error");
            return;
        }
        
        // Validazione password
        const passwordCheck = Validator.password(password);
        if (!passwordCheck.valid) {
            Toast.show(passwordCheck.message, "error");
            return;
        }
        
        // Conferma password
        if (confirmPassword && password !== confirmPassword) {
            Toast.show("Le password non coincidono", "error");
            return;
        }
        
        // Username già esistente
        if (state.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            Toast.show("Username già esistente", "error");
            return;
        }
        
        // Salva utente
        const newUser = {
            id: Date.now(),
            username,
            password: Utils.hashPassword(password),
            createdAt: new Date().toISOString()
        };
        
        state.users.push(newUser);
        Storage.set(CONFIG.STORAGE_KEYS.USERS, state.users);
        
        Toast.show("Registrazione completata! 🎉", "success");
        UI.switchTab("login");
        
        // Pulisci form
        document.getElementById("register-username").value = "";
        document.getElementById("register-password").value = "";
    },
    
    login() {
        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;
        
        if (!username || !password) {
            Toast.show("Compila tutti i campi", "warning");
            return;
        }
        
        const hashedPassword = Utils.hashPassword(password);
        const user = state.users.find(
            u => u.username.toLowerCase() === username.toLowerCase() && 
                 u.password === hashedPassword
        );
        
        if (!user) {
            Toast.show("Credenziali errate", "error");
            return;
        }
        
        state.currentUser = user.username;
        Storage.set(CONFIG.STORAGE_KEYS.CURRENT_USER, state.currentUser);
        
        Toast.show(`Bentornato, ${user.username}! 👋`, "success");
        Chat.show();
    },
    
    logout() {
        if (!confirm("Sei sicuro di voler uscire?")) return;
        
        Storage.remove(CONFIG.STORAGE_KEYS.CURRENT_USER);
        state.currentUser = null;
        
        DOM.chatContainer.classList.add("hidden");
        DOM.loginContainer.classList.remove("hidden");
        
        Toast.show("Logout effettuato", "info");
    }
};

// ===== CHAT MODULE =====
const Chat = {
    show() {
        DOM.loginContainer.classList.add("hidden");
        DOM.chatContainer.classList.remove("hidden");
        DOM.welcome.textContent = `Ciao, ${state.currentUser} 👋`;
        
        this.render();
        DOM.messageInput?.focus();
    },
    
    send() {
        const text = DOM.messageInput.value.trim();
        
        const validation = Validator.message(text);
        if (!validation.valid) {
            if (validation.message) Toast.show(validation.message, "warning");
            return;
        }
        
        const msg = {
            id: Date.now(),
            user: state.currentUser,
            text: text,
            timestamp: new Date().toISOString(),
            edited: false
        };
        
        state.messages.push(msg);
        Storage.set(CONFIG.STORAGE_KEYS.MESSAGES, state.messages);
        
        DOM.messageInput.value = "";
        this.render();
    },
    
    delete(messageId) {
        const msg = state.messages.find(m => m.id === messageId);
        
        if (!msg || msg.user !== state.currentUser) {
            Toast.show("Non puoi eliminare questo messaggio", "error");
            return;
        }
        
        if (!confirm("Eliminare questo messaggio?")) return;
        
        state.messages = state.messages.filter(m => m.id !== messageId);
        Storage.set(CONFIG.STORAGE_KEYS.MESSAGES, state.messages);
        
        Toast.show("Messaggio eliminato", "info");
        this.render();
    },
    
    render() {
        if (!DOM.chatBox) return;
        
        if (state.messages.length === 0) {
            DOM.chatBox.innerHTML = `
                <div class="empty-chat">
                    <span>💬</span>
                    <p>Nessun messaggio ancora. Inizia la conversazione!</p>
                </div>
            `;
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        state.messages.forEach(msg => {
            const isOwn = msg.user === state.currentUser;
            const div = document.createElement("div");
            
            div.className = `message ${isOwn ? "own" : ""}`;
            div.dataset.id = msg.id;
            
            div.innerHTML = `
                <div class="message-header">
                    <span class="message-user">${Utils.escapeHTML(msg.user)}</span>
                    <span class="message-time">${Utils.formatTime(msg.timestamp)}</span>
                </div>
                <div class="message-content">${Utils.escapeHTML(msg.text)}</div>
                ${isOwn ? `
                    <div class="message-actions">
                        <button onclick="Chat.delete(${msg.id})" title="Elimina">🗑️</button>
                    </div>
                ` : ""}
            `;
            
            fragment.appendChild(div);
        });
        
        DOM.chatBox.innerHTML = "";
        DOM.chatBox.appendChild(fragment);
        
        // Scroll smooth verso il basso
        DOM.chatBox.scrollTo({
            top: DOM.chatBox.scrollHeight,
            behavior: "smooth"
        });
    }
};

// ===== UI MODULE =====
const UI = {
    init() {
        Toast.init();
        this.bindEvents();
        this.checkAutoLogin();
    },
    
    switchTab(tab) {
        DOM.loginForm?.classList.toggle("hidden", tab !== "login");
        DOM.registerForm?.classList.toggle("hidden", tab !== "register");
        DOM.loginTab?.classList.toggle("active", tab === "login");
        DOM.registerTab?.classList.toggle("active", tab === "register");
    },
    
    bindEvents() {
        // Tab switching
        DOM.loginTab?.addEventListener("click", () => this.switchTab("login"));
        DOM.registerTab?.addEventListener("click", () => this.switchTab("register"));
        
        // Invio messaggio con Enter
        DOM.messageInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                Chat.send();
            }
        });
        
        // Contatore caratteri
        DOM.messageInput?.addEventListener("input", Utils.debounce(() => {
            const remaining = CONFIG.MAX_MESSAGE_LENGTH - DOM.messageInput.value.length;
            const counter = document.getElementById("char-counter");
            if (counter) {
                counter.textContent = remaining;
                counter.classList.toggle("warning", remaining < 50);
            }
        }, 100));
    },
    
    checkAutoLogin() {
        if (state.currentUser) {
            Chat.show();
        }
    }
};

// ===== INIZIALIZZAZIONE =====
document.addEventListener("DOMContentLoaded", () => {
    UI.init();
});

// Esporta per uso globale (onclick in HTML)
window.Auth = Auth;
window.Chat = Chat;
window.logout = Auth.logout;

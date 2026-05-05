const token = localStorage.getItem('token') || localStorage.getItem('authToken');
const user = JSON.parse(localStorage.getItem('user') || 'null');

function requireAuth() {
    if (!token || !user) {
        window.location.href = 'userlogin.html';
    }
}

function apiFetch(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
    };

    return fetch(url, {
        ...options,
        headers,
    }).then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = data.error || data.message || `Request failed (${response.status})`;
            throw new Error(message);
        }
        return data;
    });
}

function showNotification(message, success = true) {
    const box = document.getElementById('notification');
    if (!box) return;
    box.innerText = message;
    box.className = `notification ${success ? 'success' : 'error'}`;
    box.style.display = 'block';
    setTimeout(() => {
        box.style.display = 'none';
    }, 3500);
}

function logout() {
    localStorage.clear();
    window.location.href = 'userlogin.html';
}

function initDashboardPage() {
    requireAuth();
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    if (username) {
        username.innerText = `Welcome, ${user?.name || 'Citizen'}`;
    }
    if (email) {
        email.innerText = `Email: ${user?.email || '-'}`;
    }
    if (phone) {
        phone.innerText = `Phone: ${user?.mobile || user?.phone || '-'}`;
    }
}

function formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : '-';
}

window.addEventListener('DOMContentLoaded', () => {
    initDashboardPage();
});

const SMARTCITY_THEME_KEY = 'smartcity-theme';
const THEME_TOGGLE_ID = 'theme-toggle-btn';

function getSavedTheme() {
    return localStorage.getItem(SMARTCITY_THEME_KEY);
}

function setTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    const toggleButton = document.getElementById(THEME_TOGGLE_ID);
    if (toggleButton) {
        toggleButton.textContent = isDark ? '☀️' : '🌙';
        toggleButton.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
    localStorage.setItem(SMARTCITY_THEME_KEY, theme);
}

function initTheme() {
    const saved = getSavedTheme();
    if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
}

function toggleTheme() {
    const current = document.body.classList.contains('dark') ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
}

function createThemeToggle() {
    if (document.getElementById(THEME_TOGGLE_ID)) return;
    const button = document.createElement('button');
    button.id = THEME_TOGGLE_ID;
    button.className = 'theme-toggle';
    button.type = 'button';
    button.addEventListener('click', toggleTheme);
    document.body.appendChild(button);
    setTheme(document.body.classList.contains('dark') ? 'dark' : 'light');
}

window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    createThemeToggle();
});

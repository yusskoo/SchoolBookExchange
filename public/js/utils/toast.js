export function showToast(message) {
    const t = document.getElementById('globalStatus');
    if (!t) return;
    t.innerText = message;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

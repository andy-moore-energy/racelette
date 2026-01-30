// Raclette Clicker Game

const GameState = {
    currentPage: 'loading',
    trayCount: 0
};

// Page navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    GameState.currentPage = pageName;
}

// Tray management
function addTray() {
    GameState.trayCount++;
    updateTrayDisplay();
}

function updateTrayDisplay() {
    const trayStack = document.getElementById('tray-stack');
    const trayCount = document.getElementById('tray-count');

    // Build tray stack string
    let trays = '';
    for (let i = 0; i < GameState.trayCount; i++) {
        trays += '  [~~~~CHEESE~~~~]=\n';
    }
    trayStack.textContent = trays;
    trayCount.textContent = GameState.trayCount;
}

// Celebration confetti
function createConfetti() {
    const container = document.getElementById('confetti-container');
    const chars = ['*', '+', 'o', '.', '~', '#'];
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff6600'];

    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('span');
        confetti.className = 'confetti';
        confetti.textContent = chars[Math.floor(Math.random() * chars.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(confetti);
    }
}

function clearConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
}

// Game actions
function startGame() {
    showPage('game');
}

function finishGame() {
    document.getElementById('final-tray-count').textContent = GameState.trayCount;
    showPage('celebration');
    createConfetti();
}

function resetGame() {
    GameState.trayCount = 0;
    updateTrayDisplay();
    clearConfetti();
    showPage('loading');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('chomp-btn').addEventListener('click', addTray);
    document.getElementById('done-btn').addEventListener('click', finishGame);
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
});

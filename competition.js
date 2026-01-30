// Raclette Competition - Multiplayer Game Logic

// ASCII Icons for athletes
const WINTER_ICONS = {
    'downhill-skier': `    \\
   <(o)>
    /|\\
   / | \\`,
    'figure-skater': `  \\o
   |\\
  _/\\_`,
    'ski-jumper': `  ,@/
  /|
 _/|_`,
    'hockey-player': `  \\o/
   |
  _/\\_`,
    'bobsled': ` _____
/o o o\\=>
(______)`,
    'snowboarder': `  \\o/
   |
 [===]`,
    'luge': ` ____
/o  o\\=>
(____)`,
    'curler': `   o
  /|\\
  / \\
 (   )`
};

const ICON_LABELS = {
    'downhill-skier': 'DOWNHILL',
    'figure-skater': 'SKATER',
    'ski-jumper': 'SKI JUMP',
    'hockey-player': 'HOCKEY',
    'bobsled': 'BOBSLED',
    'snowboarder': 'SNOWBOARD',
    'luge': 'LUGE',
    'curler': 'CURLING'
};

// Competition State
const CompetitionState = {
    currentPage: 'registration',
    playerId: null,
    playerName: '',
    playerIcon: null,
    trayCount: 0,
    competitionId: null,
    leaderUnsubscribe: null,
    isReturningPlayer: false
};

// Page navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    CompetitionState.currentPage = pageName;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check Firebase connection
    console.log('Firebase initialized:', typeof firebase !== 'undefined');
    console.log('Firestore available:', typeof db !== 'undefined');

    // Set competition date display
    document.getElementById('competition-date').textContent = getTodayDisplayDate();

    // Set up icon picker
    setupIconPicker();

    // Set up event listeners
    document.getElementById('chow-down-btn').addEventListener('click', handleRegistration);
    document.getElementById('chomp-btn').addEventListener('click', handleChomp);
    document.getElementById('done-btn').addEventListener('click', handleFinish);
    document.getElementById('restart-btn').addEventListener('click', handleRestart);
    document.getElementById('back-to-registration-btn').addEventListener('click', handleBackToRegistration);

    // Check for returning player
    await checkReturningPlayer();
});

// Icon picker setup
function setupIconPicker() {
    const picker = document.getElementById('icon-picker');
    picker.addEventListener('click', (e) => {
        const option = e.target.closest('.icon-option');
        if (option) {
            // Deselect all
            picker.querySelectorAll('.icon-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            // Select clicked
            option.classList.add('selected');
        }
    });

    // Keyboard support
    picker.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const option = e.target.closest('.icon-option');
            if (option) {
                picker.querySelectorAll('.icon-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
            }
        }
    });
}

// Check for returning player
async function checkReturningPlayer() {
    try {
        CompetitionState.competitionId = getTodayCompetitionId();
        const sessionId = getSessionId();

        const competitionRef = db.collection('competitions').doc(CompetitionState.competitionId);
        const playersQuery = await competitionRef.collection('players')
            .where('sessionId', '==', sessionId)
            .limit(1)
            .get();

        if (!playersQuery.empty) {
            // Returning player found
            const playerDoc = playersQuery.docs[0];
            const playerData = playerDoc.data();

            CompetitionState.playerId = playerDoc.id;
            CompetitionState.playerName = playerData.name;
            CompetitionState.playerIcon = playerData.icon;
            CompetitionState.trayCount = playerData.score || 0;
            CompetitionState.isReturningPlayer = true;

            // Update UI and go to game
            updateTrayDisplay();
            updateYourInfo();
            subscribeToLeader();
            showPage('game');
        }
    } catch (error) {
        console.error('Error checking returning player:', error);
        // Continue to registration if error
    }
}

// Handle registration
async function handleRegistration() {
    const nameInput = document.getElementById('player-name');
    const selectedIcon = document.querySelector('.icon-option.selected');

    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter your name!');
        nameInput.focus();
        return;
    }

    if (!selectedIcon) {
        alert('Please select an athlete!');
        return;
    }

    const icon = selectedIcon.dataset.icon;

    // Disable button during registration
    const btn = document.getElementById('chow-down-btn');
    btn.disabled = true;
    btn.textContent = '[ LOADING... ]';

    try {
        CompetitionState.playerName = name;
        CompetitionState.playerIcon = icon;
        CompetitionState.competitionId = getTodayCompetitionId();

        await createPlayer();
        updateYourInfo();
        subscribeToLeader();
        showPage('game');
    } catch (error) {
        console.error('Registration error:', error);
        alert('Failed to register: ' + error.message + '\n\nMake sure Firestore is enabled in Firebase Console.');
    } finally {
        btn.disabled = false;
        btn.textContent = '[ CHOW DOWN ]';
    }
}

// Create player in Firestore
async function createPlayer() {
    console.log('Creating player, competitionId:', CompetitionState.competitionId);

    const competitionRef = db.collection('competitions').doc(CompetitionState.competitionId);

    // Ensure competition document exists
    console.log('Creating competition document...');
    await competitionRef.set({
        date: new Date().toISOString().split('T')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'active'
    }, { merge: true });
    console.log('Competition document created');

    // Create player
    console.log('Creating player document...');
    const playerRef = await competitionRef.collection('players').add({
        name: CompetitionState.playerName,
        icon: CompetitionState.playerIcon,
        score: 0,
        sessionId: getSessionId(),
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        isActive: true
    });
    console.log('Player created with ID:', playerRef.id);

    CompetitionState.playerId = playerRef.id;
}

// Update your info display
function updateYourInfo() {
    document.getElementById('your-name').textContent = CompetitionState.playerName;
    document.getElementById('your-icon-label').textContent = ICON_LABELS[CompetitionState.playerIcon] || '';
}

// Subscribe to leader updates (real-time)
function subscribeToLeader() {
    if (CompetitionState.leaderUnsubscribe) {
        CompetitionState.leaderUnsubscribe();
    }

    const competitionRef = db.collection('competitions').doc(CompetitionState.competitionId);

    CompetitionState.leaderUnsubscribe = competitionRef
        .collection('players')
        .orderBy('score', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            if (!snapshot.empty) {
                const leader = snapshot.docs[0].data();
                updateLeaderDisplay(leader);
            }
        }, error => {
            console.error('Leader subscription error:', error);
        });
}

// Update leader display
function updateLeaderDisplay(leader) {
    document.getElementById('leader-name').textContent = leader.name || '---';
    document.getElementById('leader-icon').textContent = WINTER_ICONS[leader.icon] || '---';
    document.getElementById('leader-score').textContent = leader.score || 0;
}

// Tray display
function updateTrayDisplay() {
    const trayStack = document.getElementById('tray-stack');
    const trayCount = document.getElementById('tray-count');

    let trays = '';
    for (let i = 0; i < CompetitionState.trayCount; i++) {
        trays += '  [~~~~CHEESE~~~~]=\n';
    }
    trayStack.textContent = trays;
    trayCount.textContent = CompetitionState.trayCount;
}

// Handle chomp (add tray)
let scoreUpdateTimeout = null;
function handleChomp() {
    CompetitionState.trayCount++;
    updateTrayDisplay();

    // Debounce Firebase writes
    clearTimeout(scoreUpdateTimeout);
    scoreUpdateTimeout = setTimeout(async () => {
        try {
            await db.collection('competitions')
                .doc(CompetitionState.competitionId)
                .collection('players')
                .doc(CompetitionState.playerId)
                .update({
                    score: CompetitionState.trayCount,
                    lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('Score update error:', error);
        }
    }, 500);
}

// Handle finish
async function handleFinish() {
    const btn = document.getElementById('done-btn');
    btn.disabled = true;

    try {
        // Final score update
        await db.collection('competitions')
            .doc(CompetitionState.competitionId)
            .collection('players')
            .doc(CompetitionState.playerId)
            .update({
                score: CompetitionState.trayCount,
                isActive: false,
                lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Get top 3 for podium
        const top3 = await db.collection('competitions')
            .doc(CompetitionState.competitionId)
            .collection('players')
            .orderBy('score', 'desc')
            .limit(3)
            .get();

        populatePodium(top3.docs.map(d => d.data()));

        document.getElementById('final-score').textContent = CompetitionState.trayCount;

        showPage('ceremony');
        createConfetti();
    } catch (error) {
        console.error('Finish error:', error);
        alert('Error finishing. Please try again.');
    } finally {
        btn.disabled = false;
    }
}

// Populate podium with top 3
function populatePodium(players) {
    const positions = ['first', 'second', 'third'];

    positions.forEach((pos, index) => {
        const player = players[index];
        const iconEl = document.getElementById(`${pos}-icon`);
        const nameEl = document.getElementById(`${pos}-name`);
        const scoreEl = document.getElementById(`${pos}-score`);

        if (player) {
            iconEl.textContent = WINTER_ICONS[player.icon] || '';
            nameEl.textContent = player.name || '---';
            scoreEl.textContent = player.score || 0;
        } else {
            iconEl.textContent = '';
            nameEl.textContent = '---';
            scoreEl.textContent = '0';
        }
    });
}

// Handle restart (wipe score, continue playing)
async function handleRestart() {
    const btn = document.getElementById('restart-btn');
    btn.disabled = true;

    try {
        // Reset score in Firestore
        await db.collection('competitions')
            .doc(CompetitionState.competitionId)
            .collection('players')
            .doc(CompetitionState.playerId)
            .update({
                score: 0,
                isActive: true,
                lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        CompetitionState.trayCount = 0;
        updateTrayDisplay();
        clearConfetti();
        showPage('game');
    } catch (error) {
        console.error('Restart error:', error);
        alert('Error restarting. Please try again.');
    } finally {
        btn.disabled = false;
    }
}

// Handle back to registration (new athlete)
function handleBackToRegistration() {
    // Clear session to start fresh
    localStorage.removeItem('raclette_session_id');

    // Reset state
    CompetitionState.playerId = null;
    CompetitionState.playerName = '';
    CompetitionState.playerIcon = null;
    CompetitionState.trayCount = 0;
    CompetitionState.isReturningPlayer = false;

    if (CompetitionState.leaderUnsubscribe) {
        CompetitionState.leaderUnsubscribe();
        CompetitionState.leaderUnsubscribe = null;
    }

    clearConfetti();
    updateTrayDisplay();

    // Clear form
    document.getElementById('player-name').value = '';
    document.querySelectorAll('.icon-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    showPage('registration');
}

// Confetti animation
function createConfetti() {
    const container = document.getElementById('confetti-container');
    const chars = ['*', '+', 'o', '.', '~', '#', '@'];
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff6600', '#ffd700'];

    for (let i = 0; i < 40; i++) {
        const confetti = document.createElement('span');
        confetti.className = 'confetti';
        confetti.textContent = chars[Math.floor(Math.random() * chars.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.position = 'absolute';
        confetti.style.fontSize = '1.5rem';
        confetti.style.animation = 'confetti-fall 3s linear forwards';
        container.appendChild(confetti);
    }
}

function clearConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
}

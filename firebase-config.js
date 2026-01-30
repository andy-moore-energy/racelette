// Firebase Configuration for Raclette Competition
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Add a web app to get your config
// 4. Enable Firestore Database (in test mode initially)
// 5. Replace the placeholder values below with your config

const firebaseConfig = {
    apiKey: "AIzaSyCWeaszDYMs3D0JwO4Q_KqGeLg2zRSgELA",
    authDomain: "racletteolympics.firebaseapp.com",
    projectId: "racletteolympics",
    storageBucket: "racletteolympics.firebasestorage.app",
    messagingSenderId: "793512865833",
    appId: "1:793512865833:web:fa6e1d2d6fd2f1cff4ec38"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Utility: Get today's competition ID (UTC date)
function getTodayCompetitionId() {
    const now = new Date();
    const utcDate = now.toISOString().split('T')[0];
    return `comp-${utcDate}`;
}

// Utility: Get or create session ID
function getSessionId() {
    const SESSION_KEY = 'raclette_session_id';
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
}

// Utility: Format today's date for display
function getTodayDisplayDate() {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
}

import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

let stats = [];
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

function updateStats(stats, action) {
    if(action === 'siteBlocked') {
        stats.sitesBlocked += 1;
    }

    if(action === 'downloadBlocked') {
        stats.downloadsBlocked += 1;
    }

    if(action === 'ignoredWarning') {
        stats.warningsIgnored += 1
        stats.xp -= 15;
    }

    if(action === 'siteSafe') {
        stats.xp += 10;
    }

    if(action === 'downloadSafe') {
        stats.xp += 10;
    }

    return stats;
}

async function updateDashboard(action) {
    if(!currentUser) {
        return;
    }

    const userID = doc(db, 'user', currentUser.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    const userData = userAccount.data();

    stats = {
        downloadsBlocked: userData.dashboard?.downloadsBlocked,
        safeDayStreak: userData.dashboard?.safeDayStreak,
        sitesBlocked: userData.dashboard?.sitesBlocked,
        warningsIgnored: userData.dashboard?.warningsIgnored,
        xp: userData.dashboard?.xp,
        completedQuizzes: userData.dashboard?.completedQuizzes
    }

    stats = updateStats(stats, action);

    await updateDoc(userID, {
        dashboard: stats
    });
}

window.stronghold.onSecurityEvent(async (action) => {
    await updateDashboard(action)
});
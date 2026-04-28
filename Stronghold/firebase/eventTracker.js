import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

let stats = [];
let currentUser = null;
let ignoredPageWarning = false;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

function updateStats(stats, action) {
    let reason = '';
    let xpChange = 0;

    if(action === 'siteBlocked') {
        stats.sitesBlocked += 1;
    }

    if(action === 'downloadBlocked') {
        stats.downloadsBlocked += 1;
    }

    if(action === 'ignoredWarning') {
        stats.warningsIgnored += 1;
        stats.warningsToday += 1;
        xpChange = -15;
        reason = 'Ignored a warning';
        ignoredPageWarning = true;
    }

    if(action === 'siteSafe') {
        if(ignoredPageWarning) {
            ignoredPageWarning = false;
            return stats;
        }
        
        xpChange = 10;
        reason = 'Visited a safe website';
    }

    if(action === 'downloadSafe') {
        xpChange = 10;
        reason = 'Downloaded a safe file';
    }

    stats.xp += xpChange;

    if(stats.xp < 0) {
        stats.xp = 0;
    }

    if(xpChange !== 0) {
        stats.recentChanges.push({
            reason: reason,
            amount: xpChange,
            date: Timestamp.now()
        });

        stats.recentChanges = stats.recentChanges.slice(-5);
    }

    return stats;
}

async function updateDashboard(action) {
    const user = auth.currentUser;

    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
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
        warningsToday: userData.dashboard?.warningsToday,
        xp: userData.dashboard?.xp,
        completedQuizzes: userData.dashboard?.completedQuizzes,
        streakDate: userData.dashboard?.streakDate,
        recentChanges: userData.dashboard?.recentChanges
    }

    stats = updateStats(stats, action);

    await updateDoc(userID, {
        dashboard: stats
    });
}

window.stronghold.onSecurityEvent(async (action) => {
    await updateDashboard(action)
});
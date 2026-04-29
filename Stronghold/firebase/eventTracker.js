import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

let stats = [];
let currentUser = null;
let ignoredPageWarning = false;
let ignoredDownloadWarning = false;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

function updateStats(stats, action, data) {
    let reason = '';
    let xpChange = 0;

    if(action === 'siteBlocked') {
        stats.sitesBlocked += 1;

        stats.blockedSites.push({
            url: data.url,
            score: data.score,
            date: Timestamp.now()
        });

        stats.blockedSites = stats.blockedSites.slice(-5);
    }

    if(action === 'downloadBlocked') {
        stats.downloadsBlocked += 1;

        stats.blockedDownloads.push({
            file: data.file,
            url: data.url,
            date: Timestamp.now()
        });

        stats.blockedDownloads = stats.blockedDownloads.slice(-5);
    }

    if(action === 'ignoredWarning') {
        stats.warningsIgnored += 1;
        stats.warningsToday += 1;
        xpChange = -15;
        reason = 'Ignored a warning';
        
        if(data.file) {
            ignoredDownloadWarning = true;
        }

        else {
            ignoredPageWarning = true;
        }

        stats.reasonsIgnored.push({
            reason: reason,
            amount: xpChange,
            url: data.url,
            date: Timestamp.now()
        });

        stats.reasonsIgnored = stats.reasonsIgnored.slice(-5);
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
        if(ignoredDownloadWarning) {
            ignoredDownloadWarning = false;
            return stats;
        }
        
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
            url: data.url || null,
            file: data.file || null,
            date: Timestamp.now()
        });

        stats.recentChanges = stats.recentChanges.slice(-5);
    }

    return stats;
}

async function updateDashboard(action, data = {}) {
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
        recentChanges: userData.dashboard?.recentChanges,
        blockedSites: userData.dashboard?.blockedSites || [],
        blockedDownloads: userData.dashboard?.blockedDownloads || [],
        reasonsIgnored: userData.dashboard?.reasonsIgnored || []
    }

    stats = updateStats(stats, action, data);

    await updateDoc(userID, {
        'dashboard.downloadsBlocked': stats.downloadsBlocked,
        'dashboard.safeDayStreak': stats.safeDayStreak,
        'dashboard.sitesBlocked': stats.sitesBlocked,
        'dashboard.warningsIgnored': stats.warningsIgnored,
        'dashboard.warningsToday': stats.warningsToday,
        'dashboard.xp': stats.xp,
        'dashboard.completedQuizzes': stats.completedQuizzes,
        'dashboard.streakDate': stats.streakDate,
        'dashboard.recentChanges': stats.recentChanges,
        'dashboard.blockedSites': stats.blockedSites,
        'dashboard.blockedDownloads': stats.blockedDownloads,
        'dashboard.reasonsIgnored': stats.reasonsIgnored
    });
}

window.stronghold.onSecurityEvent(async (event) => {
    const { action, data } = event;
    await updateDashboard(action, data);
});
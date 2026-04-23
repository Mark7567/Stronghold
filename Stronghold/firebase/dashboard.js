import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';
import { googleSignIn } from './startup.js';

let stats = {
    downloadsBlocked: 0,                
    safeDayStreak: 0,
    sitesBlocked: 0,
    warningsIgnored: 0,
    xp: 0,
    completedQuizzes: 0
};

function calculateLevel(experience) {
    return Math.floor(experience / 100);
}

async function fetchDashboardStats(user) {
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
        xp: userData.dashboard?.xp,
        completedQuizzes: userData.dashboard?.completedQuizzes
    }

    statsRenderer();
}

function statsRenderer() {
    const showDownloadsBlocked = document.getElementById('show_downloads_blocked');
    const showSafeDayStreak = document.getElementById('show_safe_day_streak');
    const showSitesBlocked = document.getElementById('show_sites_blocked');
    const showWarningsIgnored = document.getElementById('show_warnings_ignored');
    const showLevel = document.getElementById('show_level');

    if(showDownloadsBlocked) {
        showDownloadsBlocked.textContent = stats.downloadsBlocked;
    }

    if(showSafeDayStreak) {
        showSafeDayStreak.textContent = stats.safeDayStreak;
    }

    if(showSitesBlocked) {
        showSitesBlocked.textContent = stats.sitesBlocked;
    }

    if(showWarningsIgnored) {
        showWarningsIgnored.textContent = stats.warningsIgnored;
    }

    if(showLevel) {
        showLevel.textContent = calculateLevel(stats.xp);
    }
}

async function putDashboardStats() {
    const user = auth.currentUser;

    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    await updateDoc(userID, {
        dashboard: stats
    });
}

function updateStats(action) {
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
}

async function securityEventHandler(action) {
    const user = auth.currentUser;

    if(!user) {
        return;
    }

    updateStats(action);
    statsRenderer();
    await putDashboardStats();
}

document.addEventListener('DOMContentLoaded', async () => {
    window.stronghold.onSecurityEvent(async (action) => {
        await securityEventHandler(action);
    });
    
    showShroud();

    const signInFromDashboardButton = document.getElementById('sign_in_from_dashboard_button');
        if(signInFromDashboardButton) {
            signInFromDashboardButton.addEventListener('click', async () => {
                await dashboardSignIn();
            });
        }
    
        onAuthStateChanged(auth, async (user) => {
            if(user) {
                await fetchDashboardStats(user);
                hideShroud();
            }
    
            else {
                showShroud();
            }
        });
});

async function dashboardSignIn() {
    const user = await googleSignIn();

    if(user) {
        await fetchDashboardStats(user);
        hideShroud();
    }
}

function showShroud() {
    const shroud = document.getElementById('dashboard_shroud');
    if(shroud) {
        shroud.hidden = false;
    }
}

function hideShroud() {
    const shroud = document.getElementById('dashboard_shroud');
    if(shroud) {
        shroud.hidden = true;
    }
}
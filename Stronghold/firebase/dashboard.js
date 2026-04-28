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
    return Math.floor(experience / 100) + 1;
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
    await safeStreak(user, userData);

    const updatedUserAccount = await getDoc(userID);
    const updatedUserData = updatedUserAccount.data();

    stats = {
        downloadsBlocked: updatedUserData.dashboard?.downloadsBlocked,
        safeDayStreak: updatedUserData.dashboard?.safeDayStreak,
        sitesBlocked: updatedUserData.dashboard?.sitesBlocked,
        warningsIgnored: updatedUserData.dashboard?.warningsIgnored,
        warningsToday: updatedUserData.dashboard?.warningsToday,
        xp: updatedUserData.dashboard?.xp,
        completedQuizzes: updatedUserData.dashboard?.completedQuizzes,
        streakDate: updatedUserData.dashboard?.streakDate,
        recentChanges: updatedUserData.dashboard?.recentChanges ?? []
    }

    statsRenderer(updatedUserData);
}

function statsRenderer(userData) {
    const username = document.getElementById('username');
    const showDownloadsBlocked = document.getElementById('show_downloads_blocked');
    const showSafeDayStreak = document.getElementById('show_safe_day_streak');
    const showSitesBlocked = document.getElementById('show_sites_blocked');
    const showWarningsIgnored = document.getElementById('show_warnings_ignored');
    const showLevel = document.getElementById('show_level');
    const xpBar = document.getElementById('xp_bar');
    const xpText = document.getElementById('xp_text');
    const level = calculateLevel(stats.xp);
    const xpLevel = stats.xp % 100;

    if(username) {
        username.textContent = userData.username;
    }

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
        showLevel.textContent = level;
    }

    if(xpBar) {
        xpBar.style.width = `${xpLevel}%`;
    }

    if(xpText) {
        xpText.textContent = `${xpLevel} / 100 XP`;
    }

    renderRecentChanges();
}

document.addEventListener('DOMContentLoaded', async () => {
    showShroud();

    const signInFromDashboardButton = document.getElementById('sign_in_from_dashboard_button');
        if(signInFromDashboardButton) {
            signInFromDashboardButton.addEventListener('click', async () => {
                await dashboardSignIn();
            });
        }
    
        onAuthStateChanged(auth, async (user) => {
            if(user) {
                try {
                    await fetchDashboardStats(user);
                    hideShroud();
                }

                catch(e) {
                    console.error('Dashboard failed', e);
                    hideShroud();
                }
            }
    
            else {
                showShroud();
            }
        });
});

async function safeStreak(user, userData) {
    const currentDate = new Date().toDateString();
    const streakDate = userData.dashboard?.streakDate;
    const warningsToday = userData.dashboard?.warningsToday;
    let safeDayStreak = userData.dashboard?.safeDayStreak;

    if(streakDate === currentDate) {
        return;
    }

    if(warningsToday === 0) {
        safeDayStreak += 1;
    }

    else {
        safeDayStreak = 0;
    }

    const userID = doc(db, 'user', user.uid);

    await updateDoc(userID, {
        'dashboard.safeDayStreak': safeDayStreak,
        'dashboard.streakDate': currentDate,
        'dashboard.warningsToday': 0
    });

    stats.safeDayStreak = safeDayStreak;
    stats.streakDate = currentDate;
    stats.warningsToday = 0;
}

function renderRecentChanges() {
    const recentXpList = document.getElementById('recent_xp_changes');

    if(!recentXpList) {
        return;
    }

    recentXpList.innerHTML = '';

    const recentXpChanges = stats.recentChanges ?? [];

    if(recentXpChanges.length === 0) {
        const emptyList = document.createElement('li');
        emptyList.textContent = 'No recent XP changes';
        recentXpList.appendChild(emptyList);
        return;
    }

    recentXpChanges.slice(-5).reverse().forEach((xpChange) => {
        const change = document.createElement('li');
        const amount = xpChange.amount;
        let operator = '';

        if(amount > 0) {
            operator = '+';
        }

        const date = xpChange.date?.toDate?.();

        if(date) {
            change.textContent = `${xpChange.reason}:  ${operator}${amount} XP  --->  ${date.toLocaleDateString()}`;
        }

        else {
            change.textContent = `${xpChange.reason}: ${operator}${amount} XP`;
        }
        
        recentXpList.appendChild(change);
    })
}

async function dashboardSignIn() {
    const user = await googleSignIn();

    if(user) {
        try {
            await fetchDashboardStats(user);
            hideShroud();
        }

        catch(e) {
            console.error('Dashboard failed', e);
            hideShroud();
        }
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
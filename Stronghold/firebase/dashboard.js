import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';
import { googleSignIn } from './startup.js';

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
    const downloadsBlocked = userData.dashboard?.downloadsBlocked;
    const safeDayStreak = userData.dashboard?.safeDayStreak;
    const sitesBlocked = userData.dashboard?.sitesBlocked;
    const warningsIgnored = userData.dashboard?.warningsIgnored;
    const experience = userData.dashboard?.xp;
    const level = Math.floor(experience / 100);

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
        
    });
}

function dashboardListeners() {

}

document.addEventListener('DOMContentLoaded', async () => {
    dashboardListeners();
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
import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

export async function checkUser(user) {
    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        await setDoc(
            userID, 
            { 
                accountCreated: serverTimestamp(),
                dashboard: {
                    blockedDownloads: [],
                    blockedSites: [],
                    completedQuizzes: 0,
                    dailyQuizDate: '',
                    downloadsBlocked: 0,
                    reasonsIgnored: [],
                    recentChanges: [],
                    safeDayStreak: 0,
                    sitesBlocked: 0,
                    streakDate: '',
                    warningsIgnored: 0,
                    warningsToday: 0,
                    weeklyQuizDate: '',
                    xp: 0
                },
                lastLogin: serverTimestamp(),
                settings: {
                    downloadLevel: 'normal',
                    overrideDownloads: false,
                    protectionLevel: 'normal',
                    startPage: 'home_page',
                    theme: 'dark'
                },
                username: user.displayName
            }
        );
    }

    else { 
        await setDoc(
            userID, 
            { lastLogin: serverTimestamp() },
            { merge: true }
        );
    }
}

const authProvider = new GoogleAuthProvider();

export async function googleSignIn() {
    try {
        await setPersistence(auth, browserLocalPersistence);

        const result = await signInWithPopup(auth, authProvider);

        await checkUser(result.user);
        await window.stronghold.setUser({uid: result.user.uid})

        const userID = doc(db, 'user', result.user.uid);
        const userAccount = await getDoc(userID);
        const userData = userAccount.data();
        const savedTheme = userData.settings?.theme;
        const startPage = userData.settings?.startPage;

        await window.stronghold.startPage(startPage);
        await window.stronghold.setTheme(savedTheme);

        return result.user;

    } catch(err) {
        console.error('google fail', err);
        alert(err.code || err.message || 'google fail');
        return null;
    }
}

async function initialSignIn() {
    const user = await googleSignIn();

    if(user) {
        await window.stronghold.login();
    }
}

async function guestBrowsing() {
    sessionStorage.setItem('guest_browsing', 'true');
    await signOut(auth);
    await window.stronghold.clearUser();
    await window.stronghold.login();
}

const googleLoginButton = document.getElementById('google_login_button');
if(googleLoginButton) {
    googleLoginButton.addEventListener('click', () => initialSignIn());
}

const guestLoginButton = document.getElementById('guest_login_button');
if(guestLoginButton) {
    guestLoginButton.addEventListener('click', () => guestBrowsing());
}

const privacyPolicyPopup = document.getElementById('privacy_policy_popup');
if(privacyPolicyPopup) {
    privacyPolicyPopup.addEventListener('click', (event) => {
        if(event.target === privacyPolicyPopup) {
            privacyPolicyPopup.classList.add('hidden');
        }
    })
}

const privacyPolicyButton = document.getElementById('privacy_policy_button');
if(privacyPolicyButton) {
    privacyPolicyButton.addEventListener('click', () => {
        privacyPolicyPopup.classList.remove('hidden');
    });
}

const popupCloseButton = document.getElementById('popup_close_button');
if(popupCloseButton) {
    popupCloseButton.addEventListener('click', () => {
        privacyPolicyPopup.classList.add('hidden');
    });
}
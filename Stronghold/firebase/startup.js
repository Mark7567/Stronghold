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
                    downloadsBlocked: 0,
                    safeDayStreak: 0,
                    sitesBlocked: 0,
                    warningsIgnored: 0,
                    warningsToday: 0,
                    xp: 0,
                    completedQuizzes: 0,
                    streakDate: '',
                    recentChanges: []
                },
                lastLogin: serverTimestamp(),
                settings: {
                    downloadLevel: 'normal',
                    protectionLevel: 'normal',
                    overrideDownloads: false,
                    theme: 'light',
                    startPage: 'home_page'
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
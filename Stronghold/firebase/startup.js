import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

async function checkUser(user) {
    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        await setDoc(
            userID, 
            { 
                accountCreated: serverTimestamp(),
                cookiesDeleted: 0,
                downloadsBlocked: 0,
                lastLogin: serverTimestamp(),
                level: 0,
                safeDayStreak: 0,
                settings: {
                    clearCookies: true,
                    overrideDownloads: false,
                    searchHistory: false,
                    theme: 'dark'
                },
                sitesBlocked: 0,
                username: user.displayName,
                warningsIgnored: 0,
                xp: 0
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

async function googleSignIn() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, authProvider);
        await checkUser(signIn.user);
        await window.stronghold.login();
    } catch(err) {
        console.error('google fail', err);
        alert(err.code || err.message || 'google fail');
    }
}

async function guestBrowsing() {
    sessionStorage.setItem('guest_browsing', 'true');
    await window.stronghold.login();
}

const googleLoginButton = document.getElementById('google_login_button');
if(googleLoginButton) {
    googleLoginButton.addEventListener('click', () => googleSignIn());
}

const guestLoginButton = document.getElementById('guest_login_button');
if(guestLoginButton) {
    guestLoginButton.addEventListener('click', () => guestBrowsing());
}

async function redirect() {
    const redirectResult = await getRedirectResult(auth);
    if(redirectResult && redirectResult.user) {
        await checkUser(redirectResult.user);
        await window.stronghold.login();
    }
}

redirect();
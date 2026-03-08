import { db, auth } from './firebaseInitialiser';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { setPersistence, browserLocalPersistence, signInWithPopup, GoogleAuthProvider } from 'firebas/auth';

console.log('startup loaded');

async function checkUser(user) {
    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(user);

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
    await setPersistence(auth, browserLocalPersistence);
    const signIn = await signInWithPopup(auth, authProvider);
    await checkUser(signIn.user);

    window.location.href = '../html/taskbar.html';
}

function guestBrowsing() {
    sessionStorage.setItem('guest_browsing', 'true');
    window.location.href = '../html/tasbar.html';
}

const googleLoginButton = document.getElementById('google_login_button');
if(googleLoginButton) {
    googleLoginButton.addEventListener('click', () => googleSignIn());
}

const guestLoginButton = document.getElementById('guest_login_button');
if(guestLoginButton) {
    guestLoginButton.addEventListener('click', () => guestBrowsing());
}
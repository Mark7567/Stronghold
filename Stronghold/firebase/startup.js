import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

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
                    downloadLevel: 'normal',
                    protectionLevel: 'normal',
                    overrideDownloads: false,
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

        const result = await signInWithPopup(auth, authProvider);
        console.log('sign in success', result.user);

        await checkUser(result.user);
        console.log('firestore check complete');

        await window.stronghold.login();
        console.log('entered browser');

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
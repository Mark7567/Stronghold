/* Settings Stuff
        - Light / Dark mode
        - Parental Control PIN (to be used when changing security-based settings)
        - Ability to change the threshold for blocking maybe???
        - Which page is shown on startup - dashboard or home page
        - Download blocking changes
                strict - blocks everything risky 
                intermediate - .ps1, .cmd etc. straight block but .exe etc. get warned 
                no block - warns on sketchy but never straight blocks)
*/

import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

async function fetchProtectionLevel(user) {
    if(!user) {
        return;
    }
    
    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    const userData = userAccount.data();
    const protectionLevel = userData.settings?.protectionLevel;

    console.log('Fetched Level:', protectionLevel);

    const selectedOption = document.querySelector(`input[name='protectionLevel'][value='${protectionLevel}']`);

    if(selectedOption) {
        selectedOption.checked = true;
    }

    await window.stronghold.protectionLevel(protectionLevel);
}

async function putProtectionLevel(protectionLevel) {
    const user = auth.currentUser;
    
    console.log('Current user:', user, 'current level:', protectionLevel);

    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    await updateDoc(userID, {'settings.protectionLevel': protectionLevel});

    console.log('Updated:', protectionLevel);

    await window.stronghold.protectionLevel(protectionLevel);
}

function protectionLevelListeners() {
    const protectionOptions = document.querySelectorAll('input[name="protectionLevel"]');

    protectionOptions.forEach((radio) => { radio.addEventListener('change', async () => {
            if(radio.checked) {
                await putProtectionLevel(radio.value);

                console.log('Radio change:', radio.value);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = auth.currentUser;
    protectionLevelListeners();

    onAuthStateChanged(auth, async (user) => {
        if(user) {
            await fetchProtectionLevel(user);
        }
    });
});
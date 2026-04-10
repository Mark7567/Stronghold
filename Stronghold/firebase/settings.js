import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';

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

async function fetchSettings(user) {
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
    const downloadLevel = userData.settings?.downloadLevel;

    console.log('Fetched Protection Level:', protectionLevel);
    console.log('Fetched Download Level:', downloadLevel);

    const selectedProtectionOption = document.querySelector(`input[name='protectionLevel'][value='${protectionLevel}']`);
    const selectedDownloadOption = document.querySelector(`input[name='downloadLevel'][value='${downloadLevel}']`);

    if(selectedProtectionOption) {
        selectedProtectionOption.checked = true;
    }

    if(selectedDownloadOption) {
        selectedDownloadOption.checked = true;
    }

    await window.stronghold.protectionLevel(protectionLevel);
    await window.stronghold.downloadLevel(downloadLevel);
}

async function putSettings(protectionLevel, downloadLevel) {
    const user = auth.currentUser;
    
    console.log('Current user:', user, 'current level:', protectionLevel);
    console.log('Download level:', downloadLevel);

    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    await updateDoc(userID, {'settings.protectionLevel': protectionLevel});
    await updateDoc(userID, {'settings.downloadLevel': downloadLevel});

    console.log('Updated:', protectionLevel, downloadLevel);

    await window.stronghold.protectionLevel(protectionLevel);
    await window.stronghold.downloadLevel(downloadLevel);
}

function settingsListeners() {
    const protectionOptions = document.querySelectorAll('input[name="protectionLevel"]');
    const downloadOptions = document.querySelectorAll('input[name="downloadLevel"]');

    protectionOptions.forEach((radio) => { radio.addEventListener('change', async () => {
            if(radio.checked) {
                const downloadLevel = document.querySelector('input[name="downloadLevel"]:checked');

                await putSettings(radio.value, downloadLevel);

                console.log('Radio change:', radio.value);
            }
        });
    });

    downloadOptions.forEach((radio) => {radio.addEventListener('change', async () => {
            if(radio.checked) {
                const protectionLevel = document.querySelector('input[name="protectionLevel"]:checked');

                await putSettings(protectionLevel, radio.value);

                console.log('Radio changed:', radio.value);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = auth.currentUser;
    settingsListeners();

    onAuthStateChanged(auth, async (user) => {
        if(user) {
            await fetchSettings(user);
        }
    });
});
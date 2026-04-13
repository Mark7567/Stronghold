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
    const theme = userData.settings?.theme;

    console.log('Fetched Protection Level:', protectionLevel);
    console.log('Fetched Download Level:', downloadLevel);
    console.log('Fetched Theme:', theme);

    const selectedProtectionOption = document.querySelector(`input[name='protectionLevel'][value='${protectionLevel}']`);
    const selectedDownloadOption = document.querySelector(`input[name='downloadLevel'][value='${downloadLevel}']`);
    const selectedTheme = document.querySelector(`input[name='theme'][value='${theme}']`);

    if(selectedProtectionOption) {
        selectedProtectionOption.checked = true;
    }

    if(selectedDownloadOption) {
        selectedDownloadOption.checked = true;
    }

    if(selectedTheme) {
        selectedTheme.checked = true;
    }

    await window.stronghold.protectionLevel(protectionLevel);
    await window.stronghold.downloadLevel(downloadLevel);
    await window.stronghold.setTheme(theme);
}

async function putSettings(protectionLevel, downloadLevel, theme) {
    const user = auth.currentUser;
    
    console.log('Current user:', user);
    console.log('current level:', protectionLevel);
    console.log('Download level:', downloadLevel);
    console.log('Theme:', theme);

    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    await updateDoc(userID, {
        'settings.protectionLevel': protectionLevel,
        'settings.downloadLevel': downloadLevel,
        'settings.theme': theme
    });

    console.log('Updated:', protectionLevel, downloadLevel, theme);

    await window.stronghold.protectionLevel(protectionLevel);
    await window.stronghold.downloadLevel(downloadLevel);
    await window.stronghold.setTheme(theme);
}

function settingsListeners() {
    const protectionOptions = document.querySelectorAll('input[name="protectionLevel"]');
    const downloadOptions = document.querySelectorAll('input[name="downloadLevel"]');
    const theme = document.querySelectorAll('input[name="theme"]');

    protectionOptions.forEach((radio) => { radio.addEventListener('change', async () => {
            if(radio.checked) {
                const downloadLevel = document.querySelector('input[name="downloadLevel"]:checked');
                const downloadOption = downloadLevel ? downloadLevel.value : 'normal';

                const themeChosen = document.querySelector('input[name="theme"]:checked');
                const themeOption = themeChosen ? themeChosen.value : 'light';

                await putSettings(radio.value, downloadOption, themeOption);

                console.log('Radio change:', radio.value);
            }
        });
    });

    downloadOptions.forEach((radio) => {radio.addEventListener('change', async () => {
            if(radio.checked) {
                const protectionLevel = document.querySelector('input[name="protectionLevel"]:checked');
                const protectionOption = protectionLevel ? protectionLevel.value : 'normal';

                const themeChosen = document.querySelector('input[name="theme"]:checked');
                const themeOption = themeChosen ? themeChosen.value : 'light';

                await putSettings(protectionOption, radio.value, themeOption);

                console.log('Radio changed:', radio.value);
            }
        });
    });

    theme.forEach((radio) => {radio.addEventListener('change', async () => {
            if(radio.checked) {
                const protectionLevel = document.querySelector('input[name="protectionLevel"]:checked');
                const protectionOption = protectionLevel ? protectionLevel.value : 'normal';

                const downloadLevel = document.querySelector('input[name="downloadLevel"]:checked');
                const downloadOption = downloadLevel ? downloadLevel.value : 'normal';

                await putSettings(protectionOption, downloadOption, radio.value);

                console.log('Radio changed:', radio.value);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    settingsListeners();

    onAuthStateChanged(auth, async (user) => {
        if(user) {
            await fetchSettings(user);
        }
    });
});
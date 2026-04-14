import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';
import { googleSignIn } from './startup.js';

/* Settings Stuff
    To Do:
        - Parental Control PIN (to be used when changing security-based settings)
        - Add a login button
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
    const startPage = userData.settings?.startPage;

    console.log('Fetched Protection Level:', protectionLevel);
    console.log('Fetched Download Level:', downloadLevel);
    console.log('Fetched Theme:', theme);
    console.log('Start Page:', startPage);

    const selectedProtectionOption = document.querySelector(`input[name='protectionLevel'][value='${protectionLevel}']`);
    const selectedDownloadOption = document.querySelector(`input[name='downloadLevel'][value='${downloadLevel}']`);
    const selectedTheme = document.querySelector(`input[name='theme'][value='${theme}']`);
    const selectedStart = document.querySelector(`input[name='start'][value='${startPage}']`);    

    if(selectedProtectionOption) {
        selectedProtectionOption.checked = true;
    }

    if(selectedDownloadOption) {
        selectedDownloadOption.checked = true;
    }

    if(selectedTheme) {
        selectedTheme.checked = true;
    }

    if(selectedStart) {
        selectedStart.checked = true;
    }

    await window.stronghold.protectionLevel(protectionLevel);
    await window.stronghold.downloadLevel(downloadLevel);
    await window.stronghold.setTheme(theme);
    await window.stronghold.startPage(startPage);
}

async function putSettings(protectionLevel, downloadLevel, theme, startPage) {
    const user = auth.currentUser;
    
    console.log('Current user:', user);
    console.log('current level:', protectionLevel);
    console.log('Download level:', downloadLevel);
    console.log('Theme:', theme);
    console.log('Start Page:', startPage);

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
        'settings.theme': theme,
        'settings.startPage': startPage
    });

    console.log('Updated:', protectionLevel, downloadLevel, theme, startPage);

    await window.stronghold.protectionLevel(protectionLevel);
    await window.stronghold.downloadLevel(downloadLevel);
    await window.stronghold.setTheme(theme);
    await window.stronghold.startPage(startPage);
}

function settingsListeners() {
    const protectionOptions = document.querySelectorAll('input[name="protectionLevel"]');
    const downloadOptions = document.querySelectorAll('input[name="downloadLevel"]');
    const theme = document.querySelectorAll('input[name="theme"]');
    const startPage = document.querySelectorAll('input[name="start"]');

    protectionOptions.forEach((radio) => { radio.addEventListener('change', async () => {
            if(radio.checked) {
                const downloadLevel = document.querySelector('input[name="downloadLevel"]:checked');
                const downloadOption = downloadLevel ? downloadLevel.value : 'normal';

                const themeChosen = document.querySelector('input[name="theme"]:checked');
                const themeOption = themeChosen ? themeChosen.value : 'light';

                const startChosen = document.querySelector('input[name="start"]:checked');
                const startOption = startChosen ? startChosen.value : 'home_page'

                await putSettings(radio.value, downloadOption, themeOption, startOption);

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

                const startChosen = document.querySelector('input[name="start"]:checked');
                const startOption = startChosen ? startChosen.value : 'home_page'

                await putSettings(protectionOption, radio.value, themeOption, startOption);

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

                const startChosen = document.querySelector('input[name="start"]:checked');
                const startOption = startChosen ? startChosen.value : 'home_page'

                await putSettings(protectionOption, downloadOption, radio.value, startOption);

                console.log('Radio changed:', radio.value);
            }
        });
    });

    startPage.forEach((radio) => {radio.addEventListener('change', async () => {
            if(radio.checked) {
                const protectionLevel = document.querySelector('input[name="protectionLevel"]:checked');
                const protectionOption = protectionLevel ? protectionLevel.value : 'normal';

                const downloadLevel = document.querySelector('input[name="downloadLevel"]:checked');
                const downloadOption = downloadLevel ? downloadLevel.value : 'normal';

                const themeChosen = document.querySelector('input[name="theme"]:checked');
                const themeOption = themeChosen ? themeChosen.value : 'light';

                await putSettings(protectionOption, downloadOption, themeOption, radio.value);

                console.log('Radio changed:', radio.value);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    settingsListeners();
    showShroud();

    const signInFromSettingsButton = document.getElementById('sign_in_from_settings_button');
    if(signInFromSettingsButton) {
        signInFromSettingsButton.addEventListener('click', async () => {
            await settingsSignIn();
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if(user) {
            await fetchSettings(user);
            hideShroud();
        }

        else {
            showShroud();
        }
    });
});

async function settingsSignIn() {
    const user = await googleSignIn();

    if(user) {
        await fetchSettings(user);
        hideShroud();
    }
}

function showShroud() {
    const shroud = document.getElementById('shroud');
    if(shroud) {
        shroud.hidden = false;
    }
}

function hideShroud() {
    const shroud = document.getElementById('shroud');
    if(shroud) {
        shroud.hidden = true;
    }
}